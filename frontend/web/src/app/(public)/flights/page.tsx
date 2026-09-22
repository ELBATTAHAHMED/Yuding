'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { useAirportsQuery } from '@/hooks/queries/useTravelQueries';
import { AirportSelector } from '@/components/travel/AirportSelector';
import { FlightSkeleton } from '@/components/travel/FlightSkeleton';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, PassengerSelector, SortBar } from '@/components/ui';
import { sortFlights, buildActiveFilterChips } from '@/lib/search-ux';
import { saveSearchOffers } from '@/lib/offer-store';
import type { FlightSortKey } from '@/lib/search-ux';
import type { Airport, FlightOffer, FlightSearchRequest } from '@/types/travel.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes?: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function formatStops(stops?: number | null): string {
  if (stops == null) return '';
  if (stops === 0) return 'Direct';
  return `${stops} escale${stops > 1 ? 's' : ''}`;
}

const CABIN_OPTIONS: { value: FlightSearchRequest['travelClass']; label: string }[] = [
  { value: 'ECONOMY', label: 'Économique' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Éco.' },
  { value: 'BUSINESS', label: 'Affaires' },
  { value: 'FIRST', label: 'Première' },
];

const SORT_OPTIONS: { value: FlightSortKey; label: string }[] = [
  { value: 'PRICE_ASC', label: 'Prix croissant' },
  { value: 'PRICE_DESC', label: 'Prix décroissant' },
  { value: 'DURATION_ASC', label: 'Durée la plus courte' },
  { value: 'DEPARTURE_ASC', label: 'Départ le plus tôt' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FlightsPage() {
  const { data: airports = [] } = useAirportsQuery();

  const [selectedOrigin, setSelectedOrigin] = useState<Airport | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Airport | null>(null);
  const [departureDate, setDepartureDate] = useState('');

  // Passenger counts
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);

  // Cabin class
  const [cabinClass, setCabinClass] = useState<FlightSearchRequest['travelClass']>('ECONOMY');

  // Result & UI state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortKey, setSortKey] = useState<FlightSortKey>('PRICE_ASC');

  const today = new Date().toISOString().split('T')[0];

  // ── Passenger dropdown rows ──────────────────────────────────────────────
  const passengerRows = [
    { key: 'adults', label: 'Adultes', subLabel: '12 ans et plus', value: adults, min: 1, max: 9 },
    { key: 'children', label: 'Enfants', subLabel: '2–11 ans', value: children, min: 0, max: 8 },
    { key: 'infants', label: 'Nourrissons', subLabel: 'moins de 2 ans', value: infants, min: 0, max: adults },
  ];

  const handlePassengerChange = useCallback((key: string, value: number) => {
    if (key === 'adults') setAdults(value);
    else if (key === 'children') setChildren(value);
    else if (key === 'infants') setInfants(Math.min(value, adults));
  }, [adults]);

  const totalPassengers = adults + children + infants;
  const passengerSummary = `${adults} ad.${children > 0 ? `, ${children} enf.` : ''}${infants > 0 ? `, ${infants} nourr.` : ''}`;

  // ── Active chips ─────────────────────────────────────────────────────────
  const activeChips = useMemo(() => buildActiveFilterChips([
    {
      key: 'cabin',
      label: CABIN_OPTIONS.find(o => o.value === cabinClass)?.label ?? cabinClass ?? '',
      active: cabinClass !== 'ECONOMY',
    },
    { key: 'non_stop', label: 'Direct uniquement', active: false },
  ]), [cabinClass]);

  // ── Sorted flights ───────────────────────────────────────────────────────
  const sortedFlights = useMemo(() => sortFlights(flights, sortKey), [flights, sortKey]);

  // ── Form validation ──────────────────────────────────────────────────────
  const isFormValid = Boolean(
    selectedOrigin &&
    selectedDestination &&
    selectedOrigin.code !== selectedDestination.code &&
    departureDate &&
    departureDate >= today
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedOrigin) {
      setValidationError("Veuillez sélectionner un aéroport d'origine valide dans la liste.");
      return;
    }
    if (!selectedDestination) {
      setValidationError('Veuillez sélectionner un aéroport de destination valide dans la liste.');
      return;
    }
    if (selectedOrigin.code === selectedDestination.code) {
      setValidationError("L'aéroport d'origine et de destination doivent être différents.");
      return;
    }
    if (!departureDate) {
      setValidationError('Veuillez sélectionner une date de départ.');
      return;
    }
    if (departureDate < today) {
      setValidationError("La date de départ doit être aujourd'hui ou dans le futur.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setShowPassengerDropdown(false);

    try {
      const data = await travelService.searchFlights({
        origin: selectedOrigin.code,
        destination: selectedDestination.code,
        departureDate: departureDate,
        adults,
        children,
        infants,
        travelClass: cabinClass,
        nonStop: false,
        currency: 'EUR',
      });

      setFlights(data.results || []);
      saveSearchOffers('FLIGHT', data.results || []);
      setSearchStatus(data.status);
      setSearchMessage(data.message);
    } catch (err: unknown) {
      setFlights([]);
      setSearchStatus('ERROR');
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      setSearchMessage(
        msg.includes('400') || msg.includes('INVALID')
          ? 'Paramètres de recherche invalides. Vérifiez les aéroports et les dates sélectionnés.'
          : 'Impossible de contacter le service de voyage. Vérifiez que les services backend sont démarrés.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleRetry = useCallback(() => {
    setSearchStatus(null);
    setSearchMessage(null);
    setFlights([]);
    setHasSearched(false);
  }, []);

  return (
    <div>
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="bg-slate-900 text-white py-8 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
              Vols
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              Recherchez et comparez les offres de vols aux meilleurs tarifs
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1.3fr_auto] gap-3 items-end">
              {/* Origin Airport Selector */}
              <div className="min-w-0">
                <AirportSelector
                  id="origin-airport"
                  label="Origine"
                  icon="fa-plane-departure"
                  placeholder="Ville ou aéroport"
                  airports={airports}
                  selectedAirport={selectedOrigin}
                  onSelect={(airport) => {
                    setSelectedOrigin(airport);
                    setValidationError(null);
                  }}
                />
              </div>

              {/* Destination Airport Selector */}
              <div className="min-w-0">
                <AirportSelector
                  id="destination-airport"
                  label="Destination"
                  icon="fa-plane-arrival"
                  placeholder="Ville ou aéroport"
                  airports={airports}
                  selectedAirport={selectedDestination}
                  onSelect={(airport) => {
                    setSelectedDestination(airport);
                    setValidationError(null);
                  }}
                />
              </div>

              {/* Date field */}
              <div className="min-w-0">
                <label
                  htmlFor="departure-date"
                  className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-calendar-alt mr-1.5 text-[#01796F]" />
                  Départ
                </label>
                <input
                  type="date"
                  id="departure-date"
                  min={today}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#01796F] focus:border-transparent transition-all"
                />
              </div>

              {/* Passengers dropdown */}
              <div className="text-left relative min-w-0">
                <label className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider">
                  <i className="fas fa-users mr-1.5 text-[#01796F]" />
                  Passagers &amp; Classe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassengerDropdown((v) => !v)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#01796F] transition-all"
                >
                  <span className="truncate">
                    {totalPassengers} pass. • {passengerSummary}
                  </span>
                  <i className={`fas fa-chevron-${showPassengerDropdown ? 'up' : 'down'} text-slate-400 text-xs ml-1`} />
                </button>

                {showPassengerDropdown && (
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 min-w-[280px]">
                    <PassengerSelector rows={passengerRows} onChange={handlePassengerChange} />

                    {/* Cabin class inside dropdown */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Classe de voyage :
                      </label>
                      <select
                        value={cabinClass}
                        onChange={(e) => setCabinClass(e.target.value as FlightSearchRequest['travelClass'])}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-800"
                      >
                        {CABIN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPassengerDropdown(false)}
                      className="w-full py-2 mt-3 bg-[#01796F] hover:bg-[#015f57] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full lg:w-auto h-11 px-7 bg-[#01796F] hover:bg-[#015f57] text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-search text-xs" />
                  )}
                  <span>{isSearching ? 'Recherche...' : 'Rechercher'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Validation Alert */}
          {validationError && (
            <div className="mt-3 p-3 bg-red-500/15 border border-red-500 rounded-lg text-red-100 text-xs font-medium flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-red-400" />
              <span>{validationError}</span>
            </div>
          )}
        </div>
      </section>

      {/* ==================== FLIGHT RESULTS ==================== */}
      <section className="py-8 px-4 bg-slate-50 dark:bg-slate-950 min-h-[60vh]">
        <div className="max-w-6xl mx-auto">
          <div className="results-header" style={{ marginBottom: '2rem' }}>
            <h2 className="results-title" style={{ fontSize: '2rem', fontWeight: 800 }}>
              Vols Disponibles
            </h2>
            <p className="results-subtitle" style={{ color: '#666' }}>
              {flights.length > 0
                ? `${flights.length} vol${flights.length > 1 ? 's' : ''} trouvé${flights.length > 1 ? 's' : ''} de ${selectedOrigin?.city || 'départ'} à ${selectedDestination?.city || 'destination'}`
                : 'Sélectionnez votre vol et profitez des meilleurs tarifs'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sort toolbar — only when results exist */}
            {sortedFlights.length > 0 && (
              <SortBar
                count={sortedFlights.length}
                resultLabel="vol"
                sortOptions={SORT_OPTIONS}
                currentSort={sortKey}
                onSortChange={setSortKey}
                activeChips={activeChips}
                onChipRemove={(key) => {
                  if (key === 'cabin') setCabinClass('ECONOMY');
                }}
              />
            )}

            {!hasSearched ? (
              // Initial idle state
              <EmptyState
                icon="fa-search"
                title="Recherchez vos vols en temps réel"
                description="Recherchez par ville (ex: Casablanca, Paris, Marrakech) ou par aéroport pour afficher les vols réels disponibles."
              />
            ) : isSearching ? (
              // Loading skeleton
              <FlightSkeleton count={5} />
            ) : searchStatus === 'ERROR' ? (
              // Error state
              <ErrorState
                title="Erreur de recherche"
                message={searchMessage || 'Une erreur est survenue lors de la recherche.'}
                onRetry={handleRetry}
              />
            ) : searchStatus === 'PROVIDER_UNAVAILABLE' && flights.length === 0 ? (
              // Provider unavailable
              <ErrorState
                title="Service temporairement indisponible"
                message={searchMessage || 'Le fournisseur de vols est temporairement indisponible.'}
                onRetry={handleRetry}
              />
            ) : sortedFlights.length === 0 ? (
              // No results
              <EmptyState
                icon="fa-plane-slash"
                title="Aucun vol trouvé"
                description={`Aucun vol n'a été trouvé entre ${selectedOrigin?.city} (${selectedOrigin?.code}) et ${selectedDestination?.city} (${selectedDestination?.code}) pour le ${departureDate}. Essayez une autre date.`}
              />
            ) : (
              // Real flight results list
              sortedFlights.map((flight) => (
                <div
                  key={flight.offerId}
                  style={{
                    background: 'var(--card, #fff)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Airline info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '200px' }}>
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(1, 121, 111, 0.1)',
                        color: '#01796F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-plane" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                        {flight.airlineName || flight.airlineCode || '—'}
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: '#888' }}>
                        {flight.airlineCode}
                        {flight.flightNumber ? ` · Vol ${flight.flightNumber}` : ''}
                      </span>
                      {flight.provider && (
                        <div style={{ fontSize: '0.75rem', color: '#01796F', marginTop: '0.1rem', fontWeight: 600 }}>
                          via {flight.provider}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route + Timing */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        {flight.departureTime ? flight.departureTime.replace('T', ' ').substring(11, 16) : '—'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>{flight.origin}</div>
                      {flight.departureTime && (
                        <div style={{ fontSize: '0.72rem', color: '#999' }}>
                          {flight.departureTime.substring(0, 10)}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', color: '#01796F', minWidth: '100px' }}>
                      <i className="fas fa-long-arrow-alt-right fa-2x" />
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.2rem', fontWeight: 600 }}>
                        {flight.totalDurationMinutes ? formatDuration(flight.totalDurationMinutes) : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: flight.stops === 0 ? '#2e7d32' : '#d32f2f', fontWeight: 600 }}>
                        {formatStops(flight.stops)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        {flight.arrivalTime ? flight.arrivalTime.replace('T', ' ').substring(11, 16) : '—'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>{flight.destination}</div>
                      {flight.arrivalTime && (
                        <div style={{ fontSize: '0.72rem', color: '#999' }}>
                          {flight.arrivalTime.substring(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price + Action hierarchy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>
                        <PriceDisplay conversion={flight.priceConversion} amount={flight.price} currency={flight.currency} />
                      </div>
                      {flight.priceType === 'round_trip_starting' && (
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>à partir de (A/R)</div>
                      )}
                      {flight.cabinClass && (
                        <div style={{ fontSize: '0.78rem', color: '#aaa', textTransform: 'capitalize' }}>
                          {flight.cabinClass}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link
                        href={`/flights/${encodeURIComponent(flight.offerId)}`}
                        style={{
                          padding: '0.65rem 1.1rem',
                          borderRadius: '6px',
                          border: '1.5px solid #01796F',
                          color: '#01796F',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          background: '#fff',
                        }}
                      >
                        Voir détails
                      </Link>

                      <Link
                        href={`/booking?serviceType=FLIGHT&serviceId=${flight.offerId}&serviceTitle=${encodeURIComponent(
                          `${flight.airlineName || flight.airlineCode} (${flight.origin} → ${flight.destination})`
                        )}&price=${flight.price}`}
                        className="btn-booking"
                        style={{
                          padding: '0.65rem 1.25rem',
                          borderRadius: '6px',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Réserver
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
