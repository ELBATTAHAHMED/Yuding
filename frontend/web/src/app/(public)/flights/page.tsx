'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { useAirportsQuery } from '@/hooks/queries/useTravelQueries';
import { AirportSelector } from '@/components/travel/AirportSelector';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import type { Airport, FlightOffer } from '@/types/travel.types';

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

export default function FlightsPage() {
  const { data: airports = [] } = useAirportsQuery();

  const [selectedOrigin, setSelectedOrigin] = useState<Airport | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Airport | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [adults, setAdults] = useState(1);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);


  const today = new Date().toISOString().split('T')[0];
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

    // Validation rules: Origin and destination must be valid selected airports
    if (!selectedOrigin) {
      setValidationError('Veuillez sélectionner un aéroport d\'origine valide dans la liste.');
      return;
    }
    if (!selectedDestination) {
      setValidationError('Veuillez sélectionner un aéroport de destination valide dans la liste.');
      return;
    }
    if (selectedOrigin.code === selectedDestination.code) {
      setValidationError('L\'aéroport d\'origine et de destination doivent être différents.');
      return;
    }
    if (!departureDate) {
      setValidationError('Veuillez sélectionner une date de départ.');
      return;
    }
    if (departureDate < today) {
      setValidationError('La date de départ doit être aujourd\'hui ou dans le futur.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Must send ONLY the selected IATA codes to backend
      const data = await travelService.searchFlights({
        origin: selectedOrigin.code,
        destination: selectedDestination.code,
        departureDate: departureDate,
        adults: adults,
        children: 0,
        infants: 0,
        travelClass: 'ECONOMY',
        nonStop: false,
        currency: 'EUR',
      });

      setFlights(data.results || []);
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

            {/* Passengers field */}
            <div>
              <label
                htmlFor="adults-count"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <i className="fas fa-user" style={{ marginRight: '0.4rem', color: '#01796F' }} />
                Passagers adultes
              </label>
              <input
                type="number"
                id="adults-count"
                className="input-field"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
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
            {!hasSearched ? (
              // Initial state
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  background: 'var(--card, #fff)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(1, 121, 111, 0.1)',
                    color: '#01796F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    margin: '0 auto 1.25rem',
                  }}
                >
                  <i className="fas fa-search" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Recherchez vos vols en temps réel
                </h3>
                <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  Recherchez par ville (ex: Casablanca, Paris, Marrakech) ou par aéroport pour afficher les vols réels disponibles.
                </p>
              </div>
            ) : isSearching ? (
              // Loading state
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem',
                  background: 'var(--card, #fff)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                }}
              >
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#01796F', marginBottom: '1.2rem', display: 'block' }} />
                <p style={{ color: '#555', fontWeight: 600, fontSize: '1.05rem' }}>
                  Recherche des vols en cours via Scrappa...
                </p>
                <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                  {selectedOrigin?.city} ({selectedOrigin?.code}) → {selectedDestination?.city} ({selectedDestination?.code})
                </p>
              </div>
            ) : flights.length === 0 ? (
              // Empty State (clean provider result or error)
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  background: 'var(--card, #fff)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(1, 121, 111, 0.1)',
                    color: '#01796F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    margin: '0 auto 1.25rem',
                  }}
                >
                  <i className="fas fa-plane-slash" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {searchStatus === 'ERROR'
                    ? 'Erreur de recherche'
                    : searchStatus === 'PROVIDER_UNAVAILABLE'
                    ? 'Service temporairement indisponible'
                    : 'Aucun vol trouvé'}
                </h3>
                <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {searchStatus === 'PROVIDER_UNAVAILABLE'
                    ? searchMessage || 'Le fournisseur de vols est temporairement indisponible.'
                    : searchStatus === 'ERROR'
                    ? searchMessage || 'Une erreur est survenue lors de la recherche.'
                    : `Aucun vol direct ou avec escale n'a été trouvé entre ${selectedOrigin?.city} (${selectedOrigin?.code}) et ${selectedDestination?.city} (${selectedDestination?.code}) pour la date du ${departureDate}. Veuillez essayer une autre date.`}
                </p>
              </div>
            ) : (
              // Real flight results list
              flights.map((flight) => (
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

                  {/* Price + Booking action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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

                    <Link
                      href={`/booking?serviceType=FLIGHT&serviceId=${flight.offerId}&serviceTitle=${encodeURIComponent(
                        `${flight.airlineName || flight.airlineCode} (${flight.origin} → ${flight.destination})`
                      )}&price=${flight.price}`}
                      className="btn-booking"
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        color: '#fff',
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Réserver
                    </Link>
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
