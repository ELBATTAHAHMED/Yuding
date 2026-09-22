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
import { sortTransfers } from '@/lib/search-ux';
import type { TransferSortKey } from '@/lib/search-ux';
import { TransferLocationSelector, LocationSuggestion } from '@/components/travel/TransferLocationSelector';
import { TransferSkeleton } from '@/components/travel/TransferSkeleton';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar } from '@/components/ui';
import { saveSearchOffers } from '@/lib/offer-store';

const POPULAR_AIRPORTS: LocationSuggestion[] = [
  { code: 'RAK', title: 'Marrakech Menara', subtitle: 'Aéroport international • Maroc', badge: 'RAK' },
  { code: 'CMN', title: 'Casablanca Mohammed V', subtitle: 'Aéroport international • Maroc', badge: 'CMN' },
  { code: 'RBA', title: 'Rabat-Salé', subtitle: 'Aéroport international • Maroc', badge: 'RBA' },
  { code: 'TNG', title: 'Tanger Ibn Battouta', subtitle: 'Aéroport international • Maroc', badge: 'TNG' },
  { code: 'AGA', title: 'Agadir Al Massira', subtitle: 'Aéroport international • Maroc', badge: 'AGA' },
  { code: 'FEZ', title: 'Fès-Saïss', subtitle: 'Aéroport international • Maroc', badge: 'FEZ' },
  { code: 'CDG', title: 'Paris Charles de Gaulle', subtitle: 'Aéroport international • France', badge: 'CDG' },
  { code: 'ORY', title: 'Paris Orly', subtitle: 'Aéroport international • France', badge: 'ORY' },
  { code: 'BCN', title: 'Barcelone El Prat', subtitle: 'Aéroport international • Espagne', badge: 'BCN' },
  { code: 'MAD', title: 'Madrid-Barajas', subtitle: 'Aéroport international • Espagne', badge: 'MAD' },
  { code: 'FCO', title: 'Rome Fiumicino', subtitle: 'Aéroport international • Italie', badge: 'FCO' },
  { code: 'LHR', title: 'Londres Heathrow', subtitle: 'Aéroport international • Royaume-Uni', badge: 'LHR' },
  { code: 'JFK', title: 'New York JFK', subtitle: 'Aéroport international • États-Unis', badge: 'JFK' },
  { code: 'DXB', title: 'Dubaï International', subtitle: 'Aéroport international • Émirats', badge: 'DXB' },
  { code: 'IST', title: 'Istanbul Airport', subtitle: 'Aéroport international • Turquie', badge: 'IST' },
];

const POPULAR_DESTINATIONS: LocationSuggestion[] = [
  { code: 'CTR', title: 'Centre-ville', subtitle: 'Zone centrale & commerces', badge: 'VILLE' },
  { code: 'MED', title: 'Médina / Riad', subtitle: 'Vieille ville & hébergements traditionnels', badge: 'MÉDINA' },
  { code: 'HOT', title: 'Zone Hôtelière', subtitle: 'Complexes hôteliers & resorts', badge: 'HÔTEL' },
  { code: 'GAR', title: 'Gare Ferroviaire', subtitle: 'Gare centrale de train ONCF / TGV', badge: 'GARE' },
  { code: 'PLG', title: 'Front de Mer / Plage', subtitle: 'Zone balnéaire & corniche', badge: 'PLAGE' },
  { code: 'AER', title: 'Aéroport (Trajet retour)', subtitle: 'Transfert vers le terminal de départ', badge: 'RETOUR' },
];

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
  const [sortKey, setSortKey] = useState<TransferSortKey>('PRICE_ASC');

  const categoryCounts = useMemo(() => getTransferCategoryCounts(transfers), [transfers]);
  const filteredTransfers = useMemo(() => filterTransfers(transfers, transportType), [transfers, transportType]);
  const sortedTransfers = useMemo(() => sortTransfers(filteredTransfers, sortKey), [filteredTransfers, sortKey]);

  const handleSwap = () => {
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);
  };

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
      saveSearchOffers('TRANSFER', data.results || []);
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
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="bg-slate-900 text-white py-8 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
              Transferts &amp; VTC
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              Réservez vos navettes aéroport, chauffeurs privés et transferts interurbains
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_auto_1.4fr_1fr_0.9fr_0.8fr_auto] gap-2.5 items-end">
              {/* Origin Airport / Location */}
              <div className="min-w-0">
                <TransferLocationSelector
                  id="pickupLocation"
                  label="Point de départ"
                  icon="fas fa-plane-departure"
                  placeholder="Aéroport ou code IATA (ex: RAK, CMN)..."
                  value={pickup}
                  onChange={(val) => {
                    setPickup(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  suggestions={POPULAR_AIRPORTS}
                />
              </div>

              {/* Swap Button */}
              <div className="hidden lg:flex items-center justify-center pb-0.5">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!pickup && !dropoff}
                  title="Inverser les points de transfert"
                  aria-label="Inverser le départ et l'arrivée"
                  className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-[#01796F] hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fas fa-exchange-alt text-xs" />
                </button>
              </div>

              {/* Destination Location / Hotel */}
              <div className="min-w-0">
                <TransferLocationSelector
                  id="dropoffLocation"
                  label="Destination"
                  icon="fas fa-map-marker-alt"
                  placeholder="Hôtel, ville ou adresse (ex: Centre-ville)..."
                  value={dropoff}
                  onChange={(val) => {
                    setDropoff(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  suggestions={POPULAR_DESTINATIONS}
                />
              </div>

              {/* Departure Date */}
              <div className="min-w-0">
                <label
                  htmlFor="transferDate"
                  className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-calendar-alt mr-1.5 text-[#01796F]" />
                  Date
                </label>
                <input
                  id="transferDate"
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#01796F] focus:border-transparent transition-all"
                />
              </div>

              {/* Departure Time */}
              <div className="min-w-0">
                <label
                  htmlFor="transferTime"
                  className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-clock mr-1.5 text-[#01796F]" />
                  Heure
                </label>
                <input
                  id="transferTime"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#01796F] focus:border-transparent transition-all"
                />
              </div>

              {/* Passenger Count */}
              <div className="min-w-0">
                <label
                  htmlFor="transferPax"
                  className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-users mr-1.5 text-[#01796F]" />
                  Passagers
                </label>
                <input
                  id="transferPax"
                  type="number"
                  min="1"
                  max="16"
                  value={passengers}
                  onChange={(e) => setPassengers(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#01796F] focus:border-transparent transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full lg:w-auto h-11 px-7 bg-[#01796F] hover:bg-[#015f57] text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-search text-xs" />
                  )}
                  <span>{loading ? 'Recherche...' : 'Rechercher'}</span>
                </button>
              </div>
            </div>
          </form>

          {errorMessage && (
            <div className="mt-3 p-3 bg-red-500/15 border border-red-500 rounded-lg text-red-100 text-xs font-medium flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </section>

      {/* ==================== CONTENT SECTION ==================== */}
      <section className="py-8 px-4 bg-slate-50 dark:bg-slate-950 min-h-[60vh]">
        <div className="max-w-6xl mx-auto">
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
            <EmptyState
              icon="fa-route"
              title="Trouvez votre transfert depuis l'aéroport"
              description="Entrez votre aéroport d'arrivée (ex: CDG pour Paris, BCN pour Barcelone, RAK pour Marrakech) et votre destination pour afficher les véhicules et tarifs en direct."
            />
          )}

          {hasSearched && loading && <TransferSkeleton count={5} />}

          {hasSearched && !loading && errorMessage && (
            <ErrorState
              title="Erreur de recherche"
              message={errorMessage}
              onRetry={() => { setHasSearched(false); setErrorMessage(null); setTransfers([]); }}
            />
          )}

          {hasSearched && !loading && !errorMessage && transfers.length === 0 && (
            <EmptyState
              icon="fa-car-side"
              title="Aucun moyen de transport disponible"
              description={providerMessage || 'Aucune offre trouvée pour ce trajet. Vérifiez vos aéroports et dates de voyage.'}
            />
          )}

          {/* Render sorted + filtered transfers list */}
          {hasSearched && transfers.length > 0 && sortedTransfers.length > 0 && (
            <div>
              <SortBar
                count={sortedTransfers.length}
                resultLabel="transfert"
                sortOptions={[
                  { value: 'PRICE_ASC' as TransferSortKey, label: 'Prix croissant' },
                  { value: 'PRICE_DESC' as TransferSortKey, label: 'Prix décroissant' },
                ]}
                currentSort={sortKey}
                onSortChange={setSortKey}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {sortedTransfers.map((item) => {
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>
                          <PriceDisplay conversion={item.priceConversion} amount={item.price} currency={item.currency} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#888' }}>Tarif garanti par véhicule</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          href={`/transfers/${encodeURIComponent(offerKey)}`}
                          style={{
                            padding: '0.65rem 1.1rem',
                            borderRadius: '6px',
                            border: '1.5px solid #01796F',
                            color: '#01796F',
                            background: '#fff',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                          }}
                        >
                          Détails
                        </Link>
                        <Link
                          href={`/booking?serviceType=TRANSFER&serviceId=${encodeURIComponent(offerKey)}&serviceTitle=${encodeURIComponent(item.vehicleModel || 'Transfert')}&price=${item.price}`}
                          className="btn-booking"
                          style={{
                            padding: '0.65rem 1.25rem',
                            borderRadius: '6px',
                            backgroundColor: '#01796F',
                            color: '#fff',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                          }}
                        >
                          Réserver
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}

          {/* Filter empty state: has search results, but none match current filter */}
          {hasSearched && transfers.length > 0 && sortedTransfers.length === 0 && !loading && (
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
