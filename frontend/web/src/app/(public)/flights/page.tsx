'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { FlightOffer } from '@/types/travel.types';

export default function FlightsPage() {
  const [originCountry, setOriginCountry] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destination, setDestination] = useState('');
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Initial flights load
    async function loadInitial() {
      try {
        const data = await travelService.searchFlights();
        setFlights(data.results || []);
        if (data.status === 'PROVIDER_UNAVAILABLE') {
          setProviderMessage(data.message);
        }
      } catch {
        setFlights([]);
      }
    }
    loadInitial();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const data = await travelService.searchFlights(originCountry, originCity, destination);
      setFlights(data.results || []);
      if (data.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(data.message);
      } else {
        setProviderMessage(null);
      }
    } catch {
      setFlights([]);
      setProviderMessage('Impossible de contacter le service de voyage.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      {/* ==================== HERO SECTION ==================== */}
      <section className="home vol-hero" style={{ position: 'relative', background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)', padding: '5rem 1rem 4rem', color: '#fff' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <div className="search-header" style={{ marginBottom: '2.5rem' }}>
            <h2 className="search-title" style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              alignItems: 'flex-end',
            }}
          >
            <div className="input-line">
              <label htmlFor="pays" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', textAlign: 'left' }}>
                <i className="fas fa-plane-departure" style={{ marginRight: '0.4rem', color: '#01796F' }}></i>
                Pays de départ
              </label>
              <input
                type="text"
                id="pays"
                className="input-field"
                placeholder="Ex: France, Maroc"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="input-line">
              <label htmlFor="ville" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', textAlign: 'left' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '0.4rem', color: '#01796F' }}></i>
                Ville de départ
              </label>
              <input
                type="text"
                id="ville"
                className="input-field"
                placeholder="Ex: Paris, Casablanca"
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="input-line">
              <label htmlFor="destination" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', textAlign: 'left' }}>
                <i className="fas fa-plane-arrival" style={{ marginRight: '0.4rem', color: '#01796F' }}></i>
                Destination
              </label>
              <input
                type="text"
                id="destination"
                className="input-field"
                placeholder="Ex: Marrakech, New York"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="btns-line">
              <button
                type="submit"
                className="btn-booking search-btn"
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search" style={{ marginRight: '0.4rem' }}></i>}
                Rechercher des Vols
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ==================== FLIGHT RESULTS ==================== */}
      <section className="search-results" style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="results-header" style={{ marginBottom: '2rem' }}>
            <h2 className="results-title" style={{ fontSize: '2rem', fontWeight: 800 }}>Vols Disponibles</h2>
            <p className="results-subtitle" style={{ color: '#666' }}>Sélectionnez votre vol et profitez des meilleurs tarifs</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {flights.length === 0 ? (
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
                  <i className="fas fa-plane"></i>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Aucun vol direct disponible pour cette recherche
                </h3>
                <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {providerMessage ||
                    'Votre recherche a été validée avec succès par le service de voyage V2. Les intégrations des fournisseurs de vols en direct (Amadeus / Duffel) sont planifiées pour la Phase 21+.'}
                </p>
              </div>
            ) : (
              flights.map((flight) => (
                <div
                  key={flight.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '220px' }}>
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
                      }}
                    >
                      <i className="fas fa-plane"></i>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{flight.airline}</h3>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>Vol {flight.flightNumber}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{flight.departureTime}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{flight.origin}</div>
                    </div>

                    <div style={{ textAlign: 'center', color: '#01796F' }}>
                      <i className="fas fa-long-arrow-alt-right fa-2x"></i>
                      <div style={{ fontSize: '0.75rem', color: '#999' }}>Direct</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{flight.arrivalTime}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{flight.destination}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>
                        {flight.price} €
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{flight.availableSeats} places restantes</div>
                    </div>

                    <Link
                      href={`/booking?serviceType=FLIGHT&serviceId=${flight.id}&serviceTitle=${encodeURIComponent(`${flight.airline} (${flight.origin} → ${flight.destination})`)}&price=${flight.price}`}
                      className="btn-booking"
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        color: '#fff',
                        fontWeight: 700,
                        textDecoration: 'none',
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
