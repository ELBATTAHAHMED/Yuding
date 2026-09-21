'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { TransferOffer } from '@/types/travel.types';
import {
  filterTransfers,
  getTransferCategoryCounts,
  isPrivateTransfer,
  isSharedNavette,
  isMinibusOrRental,
  type TransferCategoryFilter,
} from '@/lib/transfer-filters';

export default function TransfersPage() {
  const today = new Date().toISOString().split('T')[0];
  const defaultFutureDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState(defaultFutureDate);
  const [time, setTime] = useState('12:00');
  const [passengers, setPassengers] = useState(2);
  const [transportType, setTransportType] = useState<TransferCategoryFilter>('ALL');

  const [transfers, setTransfers] = useState<TransferOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const categoryCounts = useMemo(() => getTransferCategoryCounts(transfers), [transfers]);
  const filteredTransfers = useMemo(() => filterTransfers(transfers, transportType), [transfers, transportType]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const rawPickup = pickup.trim();
    if (!rawPickup) {
      setErrorMessage('Veuillez renseigner un lieu de départ (ex: CDG, BCN, MAD, RAK, CMN).');
      return;
    }
    const cleanPickup = rawPickup.includes('—')
      ? rawPickup.split('—')[0].trim()
      : (rawPickup.includes(' - ') ? rawPickup.split(' - ')[0].trim() : rawPickup);

    const rawDropoff = dropoff.trim();
    if (!rawDropoff) {
      setErrorMessage('Veuillez renseigner une destination (ex: Hôtel, adresse ou centre-ville).');
      return;
    }
    const cleanDropoff = rawDropoff.includes('—')
      ? rawDropoff.split('—')[0].trim()
      : (rawDropoff.includes(' - ') ? rawDropoff.split(' - ')[0].trim() : rawDropoff);

    setLoading(true);
    setErrorMessage(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const data = await travelService.searchTransfers({
        pickup: cleanPickup,
        dropoff: cleanDropoff,
        date: date || defaultFutureDate,
        time: time || '12:00',
        passengers: passengers > 0 ? passengers : 2,
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
      } else if (msg.includes('invalide') || msg.includes('400')) {
        setErrorMessage(msg);
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
                list="popular-airports"
                placeholder="Aéroport ou code IATA (ex: RAK, CMN, CDG, BCN...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
              <datalist id="popular-airports">
                <option value="RAK — Marrakech Menara" />
                <option value="CMN — Casablanca Mohammed V" />
                <option value="RBA — Rabat-Salé" />
                <option value="TNG — Tanger Ibn Battouta" />
                <option value="AGA — Agadir Al Massira" />
                <option value="FEZ — Fès-Saïss" />
                <option value="CDG — Paris Charles de Gaulle" />
                <option value="ORY — Paris Orly" />
                <option value="BCN — Barcelone El Prat" />
                <option value="MAD — Madrid-Barajas" />
                <option value="FCO — Rome Fiumicino" />
                <option value="LHR — Londres Heathrow" />
                <option value="JFK — New York JFK" />
              </datalist>
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
                list="popular-destinations"
                placeholder="Hôtel, coordonnées ou ville (ex: Centre-ville, Médina...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
              <datalist id="popular-destinations">
                <option value="Centre-ville" />
                <option value="Médina / Riad" />
                <option value="Zone Hôtelière" />
                <option value="Gare Ferroviaire" />
              </datalist>
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: '0.4rem' }}></i>
                Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: transportType !== 'ALL' ? '1rem' : '2.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'TAXI' ? 'ALL' : 'TAXI'))}
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
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fas fa-taxi"></i>
              Transfert Privé &amp; VTC {hasSearched && transfers.length > 0 && `(${categoryCounts.private})`}
            </button>

            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'TRAIN' ? 'ALL' : 'TRAIN'))}
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
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fas fa-train"></i>
              Trains &amp; Navettes {hasSearched && transfers.length > 0 && `(${categoryCounts.shared})`}
            </button>

            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'CAR_RENTAL' ? 'ALL' : 'CAR_RENTAL'))}
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
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fas fa-car"></i>
              Location &amp; Minibus {hasSearched && transfers.length > 0 && `(${categoryCounts.minibus})`}
            </button>
          </div>

          {/* Active filter badge / reset option */}
          {hasSearched && transfers.length > 0 && transportType !== 'ALL' && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button
                type="button"
                onClick={() => setTransportType('ALL')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#01796F',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <i className="fas fa-undo-alt"></i>
                Afficher tous les transferts ({transfers.length})
              </button>
            </div>
          )}

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

          {/* Render filtered transfers list */}
          {hasSearched && transfers.length > 0 && filteredTransfers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredTransfers.map((item) => {
                const offerKey = item.offerId || item.id || `trf-${item.price}`;
                const isPrivate = isPrivateTransfer(item);
                const isShuttle = isSharedNavette(item);
                const isMinibus = isMinibusOrRental(item);

                let badgeLabel = 'Transfert Privé';
                let badgeBg = '#01796F';
                let vehicleIcon = 'fas fa-car';

                if (isShuttle) {
                  badgeLabel = 'Navette Partagée';
                  badgeBg = '#4B5563';
                  vehicleIcon = 'fas fa-bus';
                } else if (isMinibus && item.capacity && item.capacity >= 5) {
                  badgeLabel = 'Minibus & Van';
                  badgeBg = '#0D9488';
                  vehicleIcon = 'fas fa-shuttle-van';
                }

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
                        <i className={vehicleIcon}></i>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              background: badgeBg,
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {badgeLabel}
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

          {/* Filter empty state: has search results, but none match current filter */}
          {hasSearched && transfers.length > 0 && filteredTransfers.length === 0 && !loading && (
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
                <i className="fas fa-filter"></i>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Aucun transfert dans cette catégorie
              </h3>
              <p style={{ color: '#666', maxWidth: '550px', margin: '0 auto 1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Aucun véhicule ne correspond au filtre sélectionné pour ce trajet. {transfers.length} option(s) disponible(s) dans les autres catégories.
              </p>
              <button
                type="button"
                onClick={() => setTransportType('ALL')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#01796F',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(1, 121, 111, 0.3)',
                }}
              >
                <i className="fas fa-th-large" style={{ marginRight: '0.5rem' }}></i>
                Afficher tous les transferts ({transfers.length})
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
