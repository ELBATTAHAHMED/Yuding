'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { TransferOffer } from '@/types/travel.types';

export default function TransfersPage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [passengers, setPassengers] = useState(2);
  const [transportType, setTransportType] = useState<'TAXI' | 'TRAIN' | 'CAR_RENTAL'>('TAXI');

  const [transfers, setTransfers] = useState<TransferOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!pickup.trim()) {
      setErrorMessage('Veuillez renseigner un lieu de départ (ex: CDG, BCN, MAD, RAK, JFK).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const data = await travelService.searchTransfers({
        pickup: pickup.trim(),
        dropoff: dropoff.trim() || 'Centre-ville',
        date: date || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        time: time || '12:00',
        passengers: passengers > 0 ? passengers : 2,
        transferType: transportType,
      });

      setTransfers(data.results || []);
      if (data.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(data.message);
      }
    } catch (err: unknown) {
      setTransfers([]);
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du partenaire de transport. Veuillez patienter.');
      } else if (msg.includes('TIMEOUT') || msg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai de connexion dépassé. Veuillez réessayer.');
      } else {
        setErrorMessage('Impossible de contacter le service de transfert. Vérifiez la passerelle API.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ==================== HERO & SEARCH SECTION ==================== */}
      <section
        style={{
          background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)',
          padding: '5rem 1rem 4rem',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Taxi, Navettes &amp; Transferts
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb', marginBottom: '2.5rem' }}>
            Réservez vos navettes aéroport, chauffeurs privés et transferts interurbains en toute sérénité
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              background: 'var(--card, #fff)',
              padding: '1.75rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              color: 'var(--text, #333)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
              textAlign: 'left',
            }}
          >
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-plane-departure" style={{ marginRight: '0.4rem' }}></i>
                Point de départ
              </label>
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Aéroport ou code IATA (ex: CDG, BCN, MAD, RAK, JFK...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '0.4rem' }}></i>
                Destination
              </label>
              <input
                type="text"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                placeholder="Hôtel, coordonnées ou adresse (ex: Centre-ville, Tour Eiffel...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: '0.4rem' }}></i>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 100px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-clock" style={{ marginRight: '0.4rem' }}></i>
                Heure
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 90px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-users" style={{ marginRight: '0.4rem' }}></i>
                Passagers
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 160px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#01796F',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(1, 121, 111, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Recherche...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    Rechercher
                  </>
                )}
              </button>
            </div>
          </form>

          {errorMessage && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', borderRadius: '8px', fontSize: '0.9rem' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
              {errorMessage}
            </div>
          )}
        </div>
      </section>

      {/* ==================== CONTENT SECTION ==================== */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTransportType('TAXI')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'TAXI' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'TAXI' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: transportType === 'TAXI' ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
              }}
            >
              <i className="fas fa-taxi"></i>
              Transfert Privé &amp; VTC
            </button>

            <button
              onClick={() => setTransportType('TRAIN')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'TRAIN' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'TRAIN' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: transportType === 'TRAIN' ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
              }}
            >
              <i className="fas fa-train"></i>
              Trains &amp; Navettes
            </button>

            <button
              onClick={() => setTransportType('CAR_RENTAL')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'CAR_RENTAL' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'CAR_RENTAL' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: transportType === 'CAR_RENTAL' ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
              }}
            >
              <i className="fas fa-car"></i>
              Location &amp; Minibus
            </button>
          </div>

          {!hasSearched && (
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
                <i className="fas fa-route"></i>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Trouvez votre transfert direct depuis l&apos;aéroport
              </h3>
              <p style={{ color: '#666', maxWidth: '550px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Entrez votre aéroport d&apos;arrivée (ex: <strong>CDG</strong> pour Paris, <strong>BCN</strong> pour Barcelone, <strong>RAK</strong> pour Marrakech) et votre destination pour afficher les véhicules et tarifs en direct.
              </p>
            </div>
          )}

          {hasSearched && transfers.length === 0 && !loading && (
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
                <i className="fas fa-car-side"></i>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Aucun moyen de transport disponible pour le moment
              </h3>
              <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {providerMessage || 'Aucune offre trouvée pour ce trajet. Vérifiez vos aéroports et dates de voyage.'}
              </p>
            </div>
          )}

          {hasSearched && transfers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {transfers.map((item) => {
                const offerKey = item.offerId || item.id || `trf-${item.price}`;
                const isPrivate = !item.transferType || item.transferType.toUpperCase() === 'PRIVATE';

                return (
                  <div
                    key={offerKey}
                    style={{
                      background: 'var(--card, #fff)',
                      padding: '1.5rem 2rem',
                      borderRadius: '12px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '12px',
                          background: 'rgba(1, 121, 111, 0.1)',
                          color: '#01796F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.8rem',
                        }}
                      >
                        <i className={item.type === 'TRAIN' ? 'fas fa-train' : 'fas fa-car'}></i>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              background: isPrivate ? '#01796F' : '#4B5563',
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isPrivate ? 'Transfert Privé' : 'Navette Partagée'}
                          </span>
                          <span
                            style={{
                              background: '#E5E7EB',
                              color: '#374151',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                            }}
                          >
                            Partenaire HBX
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.3rem 0' }}>
                          {item.vehicleModel || 'Berline Confort'}
                        </h3>
                        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                          <i className="fas fa-route" style={{ marginRight: '0.4rem', color: '#01796F' }}></i>
                          {item.pickup || item.departureCity || 'Aéroport'} → {item.dropoff || item.arrivalCity || 'Destination'}
                        </p>
                        {item.capacity && (
                          <span style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem', display: 'inline-block' }}>
                            <i className="fas fa-users" style={{ marginRight: '0.3rem' }}></i>
                            Jusqu&apos;à {item.capacity} passagers
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>
                          {item.price} {item.currency === 'USD' ? '$' : '€'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#888' }}>Tarif garanti par véhicule</div>
                      </div>

                      <Link
                        href={`/booking?serviceType=TRANSFER&serviceId=${encodeURIComponent(offerKey)}&serviceTitle=${encodeURIComponent(item.vehicleModel || 'Transfert')}&price=${item.price}`}
                        className="btn-booking"
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '6px',
                          backgroundColor: '#01796F',
                          color: '#fff',
                          fontWeight: 700,
                          textDecoration: 'none',
                          fontSize: '0.95rem',
                        }}
                      >
                        Réserver
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
