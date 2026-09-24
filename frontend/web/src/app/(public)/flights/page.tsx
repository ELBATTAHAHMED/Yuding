'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { useAirportsQuery } from '@/hooks/queries/useTravelQueries';
import { AirportSelector } from '@/components/travel/AirportSelector';
import { FlightSkeleton } from '@/components/travel/FlightSkeleton';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { TravelHero, TravelPage } from '@/components/travel';
import { EmptyState, ErrorState, PassengerSelector, SortBar } from '@/components/ui';
import { sortFlights, buildActiveFilterChips } from '@/lib/search-ux';
import { saveSearchOffers } from '@/lib/offer-store';
import { useSearchSession } from '@/lib/search-session';
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

  useSearchSession('FLIGHT', {
    selectedOrigin, selectedDestination, departureDate, adults, children, infants,
    cabinClass, flights, searchMessage, searchStatus, hasSearched, sortKey,
  }, (saved) => {
    setSelectedOrigin(saved.selectedOrigin);
    setSelectedDestination(saved.selectedDestination);
    setDepartureDate(saved.departureDate);
    setAdults(saved.adults);
    setChildren(saved.children);
    setInfants(saved.infants);
    setCabinClass(saved.cabinClass);
    setFlights(saved.flights);
    setSearchMessage(saved.searchMessage);
    setSearchStatus(saved.searchStatus);
    setHasSearched(saved.hasSearched);
    setSortKey(saved.sortKey);
  }, isSearching);

  const today = new Date().toISOString().split('T')[0];
  const originError = validationError?.includes("origine") ? validationError : null;
  const destinationError = validationError?.includes('destination') || validationError?.includes('différents')
    ? validationError
    : null;
  const dateError = validationError?.includes('date') ? validationError : null;

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
    <TravelPage page="flights">
      <TravelHero
        title="Vols"
        subtitle="Comparez les itinéraires et les prix fournisseurs, en toute transparence."
        destination={selectedDestination?.city}
        country={selectedDestination?.country}
        defaultImageQuery="commercial airplane airport travel"
        defaultImageIndex={0}
        icon="fas fa-plane-departure"
        compact={hasSearched}
      />
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              Vols
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Recherchez et comparez les offres de vols aux meilleurs tarifs
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-[#062523] p-3.5 md:p-4 rounded-xl shadow-lg border border-[#01796F]/30 text-white"
          >
            <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1.3fr_auto]">
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
                  error={originError}
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
                  error={destinationError}
                />
              </div>

              {/* Date field */}
              <div className="min-w-0">
                <label
                  htmlFor="departure-date"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-calendar-alt mr-1.5 text-[#02E0D5]" />
                  Départ
                </label>
                <input
                  type="date"
                  id="departure-date"
                  min={today}
                  value={departureDate}
                  onChange={(e) => {
                    setDepartureDate(e.target.value);
                    setValidationError(null);
                  }}
                  aria-invalid={Boolean(dateError)}
                  aria-describedby={dateError ? 'departure-date-error' : undefined}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
                {dateError && (
                  <p id="departure-date-error" className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-300" role="alert">
                    {dateError}
                  </p>
                )}
              </div>

              {/* Passengers dropdown */}
              <div className="text-left relative min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                  <i className="fas fa-users mr-1.5 text-[#02E0D5]" />
                  Passagers &amp; Classe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassengerDropdown((v) => !v)}
                  className="travel-passenger-trigger w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                >
                  <span className="truncate">
                    {totalPassengers} pass. • {passengerSummary}
                  </span>
                  <i className={`fas fa-chevron-${showPassengerDropdown ? 'up' : 'down'} text-[#02E0D5] text-xs ml-1`} />
                </button>

                {showPassengerDropdown && (
                  <div className="travel-passenger-popover absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#062523] rounded-xl shadow-2xl border border-[#01796F]/40 p-4 min-w-[280px] text-white">
                    <PassengerSelector rows={passengerRows} onChange={handlePassengerChange} />

                    {/* Cabin class inside dropdown */}
                    <div className="travel-passenger-popover__section mt-3 pt-3 border-t border-[#01796F]/20">
                      <label className="travel-passenger-popover__label block text-[11px] font-medium text-[#b2dfdb] mb-1">
                        Classe de voyage :
                      </label>
                      <select
                        value={cabinClass}
                        onChange={(e) => setCabinClass(e.target.value as FlightSearchRequest['travelClass'])}
                        className="travel-passenger-popover__select w-full px-2 py-1.5 rounded-lg border border-[#01796F]/40 text-xs bg-[#021817] text-white"
                      >
                        {CABIN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPassengerDropdown(false)}
                      className="travel-passenger-popover__apply w-full py-2 mt-3 bg-[#01796F] hover:bg-[#015f57] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="w-full md:mt-[23px] lg:w-auto">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full lg:w-auto h-10 px-6 bg-[#01796F] hover:bg-[#015f57] text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
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

        </div>
      </section>

      {/* ==================== FLIGHT RESULTS ==================== */}
      <section className="travel-results-section py-6 px-4 bg-slate-50 dark:bg-[#021817]">
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
                  className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(230px,.95fr)] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-[border-color,box-shadow] hover:border-[#01796F]/40 hover:shadow-md dark:border-[#01796F]/30 dark:bg-[#062523] dark:text-slate-100"
                >
                  {/* Airline info */}
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-xl shrink-0">
                      <i className="fas fa-plane" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white mb-0.5">
                        {flight.airlineName && flight.airlineName !== flight.airlineCode
                          ? flight.airlineName
                          : `Vol ${[flight.airlineCode, flight.flightNumber].filter(Boolean).join(' ') || 'à découvrir'}`}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {flight.airlineName && flight.airlineName !== flight.airlineCode
                          ? [flight.airlineCode, flight.flightNumber && `Vol ${flight.flightNumber}`].filter(Boolean).join(' · ')
                          : flight.airlineCode && `Compagnie ${flight.airlineCode}`}
                      </span>
                      {flight.provider && (
                        <div className="text-[11px] text-[#01796F] dark:text-[#02E0D5] mt-0.5 font-semibold">
                          via {flight.provider}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route + Timing */}
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-3 dark:bg-[#0a302d]/60">
                    <div className="min-w-0 text-left">
                      <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {flight.departureTime ? flight.departureTime.replace('T', ' ').substring(11, 16) : '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{flight.origin}</div>
                      {flight.departureTime && (
                        <div className="text-[11px] text-slate-400">
                          {flight.departureTime.substring(0, 10)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-[78px] text-center text-[#01796F] dark:text-[#02E0D5]">
                      <i className="fas fa-long-arrow-alt-right text-xl" />
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-semibold">
                        {flight.totalDurationMinutes ? formatDuration(flight.totalDurationMinutes) : ''}
                      </div>
                      <div className={`text-[11px] font-semibold ${flight.stops === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatStops(flight.stops)}
                      </div>
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {flight.arrivalTime ? flight.arrivalTime.replace('T', ' ').substring(11, 16) : '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{flight.destination}</div>
                      {flight.arrivalTime && (
                        <div className="text-[11px] text-slate-400">
                          {flight.arrivalTime.substring(0, 10)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price + Action hierarchy */}
                  <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:py-1 lg:pl-5 dark:border-[#01796F]/25">
                    <div className="lg:text-right">
                      <div className="text-2xl font-extrabold leading-tight text-[#01796F] dark:text-[#02E0D5]">
                        <PriceDisplay conversion={flight.priceConversion} amount={flight.price} currency={flight.currency} />
                      </div>
                      {flight.priceType === 'round_trip_starting' && (
                        <div className="text-[11px] text-slate-400">à partir de (A/R)</div>
                      )}
                      {flight.cabinClass && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {flight.cabinClass}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/flights/${encodeURIComponent(flight.offerId)}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#01796F]/50 bg-[#01796F]/10 px-2 text-center text-xs font-bold text-[#01796F] transition-colors hover:bg-[#01796F]/20 dark:border-[#02E0D5]/50 dark:bg-[#02E0D5]/10 dark:text-[#02E0D5]"
                      >
                        Voir détails
                      </Link>

                      {flight.price != null && flight.price > 0 ? (
                        <Link
                          href={`/booking?serviceType=FLIGHT&serviceId=${encodeURIComponent(flight.offerId)}&selectionRef=${encodeURIComponent(flight.selectionRef || flight.offerId)}&serviceTitle=${encodeURIComponent(
                            `${flight.airlineName || flight.airlineCode} (${flight.origin} → ${flight.destination})`
                          )}&price=${flight.price}&currency=${encodeURIComponent(flight.currency || 'EUR')}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#01796F] px-2 text-center text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#005f57]"
                        >
                          Réserver
                        </Link>
                      ) : (
                        <span
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gray-200 px-2 text-center text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          title="Tarif indisponible pour ce vol"
                        >
                          Indisponible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </TravelPage>
  );
}
