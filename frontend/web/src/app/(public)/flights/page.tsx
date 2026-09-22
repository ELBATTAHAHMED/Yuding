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
      {/* ==================== HERO & SEARCH SECTION ==================== */}
      <section
        className="home vol-hero"
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)',
          padding: '5rem 1rem 4rem',
          color: '#fff',
        }}
      >
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <div className="search-header" style={{ marginBottom: '2.5rem' }}>
            <h2
              className="search-title"
              style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}
            >
              Découvrez le Monde en Vol
            </h2>
            <p className="search-subtitle" style={{ fontSize: '1.15rem', color: '#b2dfdb' }}>
              Comparez et réservez vos billets d&apos;avion aux meilleurs tarifs du marché
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="form"
            style={{
              background: 'var(--card, #fff)',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              color: 'var(--text, #001b1a)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              alignItems: 'flex-start',
            }}
          >
            {/* Origin Airport Selector */}
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

            {/* Destination Airport Selector */}
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

            {/* Date field */}
            <div>
              <label
                htmlFor="departure-date"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <i className="fas fa-calendar-alt" style={{ marginRight: '0.4rem', color: '#01796F' }} />
                Date de départ
              </label>
              <input
                type="date"
                id="departure-date"
                className="input-field"
                min={today}
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            {/* Passengers dropdown */}
            <div style={{ textAlign: 'left', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  fontSize: '0.9rem',
                }}
              >
                <i className="fas fa-users" style={{ marginRight: '0.4rem', color: '#01796F' }} />
                Passagers
              </label>
              <button
                type="button"
                onClick={() => setShowPassengerDropdown((v) => !v)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {totalPassengers} passager{totalPassengers > 1 ? 's' : ''} — {passengerSummary}
                </span>
                <i className={`fas fa-chevron-${showPassengerDropdown ? 'up' : 'down'}`} style={{ color: '#888' }} />
              </button>

              {showPassengerDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '0.4rem',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.18)',
                    border: '1px solid #e0e0e0',
                    padding: '1.25rem',
                    minWidth: '240px',
                  }}
                >
                  <PassengerSelector rows={passengerRows} onChange={handlePassengerChange} />

                  {/* Cabin class inside dropdown */}
                  <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>
                      Classe de voyage
                    </label>
                    <select
                      value={cabinClass}
                      onChange={(e) => setCabinClass(e.target.value as FlightSearchRequest['travelClass'])}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}
                    >
                      {CABIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPassengerDropdown(false)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      marginTop: '0.75rem',
                      background: '#01796F',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    Terminé
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ alignSelf: 'flex-end', width: '100%' }}>
              <button
                type="submit"
                className="btn-booking search-btn"
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  opacity: isSearching ? 0.7 : 1,
                  color: '#fff',
                  border: 'none',
                  transition: 'opacity 0.2s ease, transform 0.1s ease',
                }}
              >
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-search" style={{ marginRight: '0.4rem' }} />
                )}
                {isSearching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </form>

          {/* Validation Alert */}
          {validationError && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 83, 80, 0.15)',
                border: '1px solid #ef5350',
                borderRadius: '8px',
                color: '#ffebee',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-exclamation-circle" style={{ color: '#ef5350' }} />
              {validationError}
            </div>
          )}
        </div>
      </section>

      {/* ==================== FLIGHT RESULTS ==================== */}
      <section className="search-results" style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
