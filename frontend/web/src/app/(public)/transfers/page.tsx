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
import { TravelHero, TravelPage } from '@/components/travel';
import { TransferSkeleton } from '@/components/travel/TransferSkeleton';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar, TravelerStepper } from '@/components/ui';
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
    <TravelPage page="transfers">
      <TravelHero
        title="Transferts"
        subtitle="Reliez aéroport, gare et destination avec des offres fournisseur vérifiables."
        destination={dropoff || pickup || undefined}
        defaultImageQuery="airport transfer van passengers"
        defaultImageIndex={0}
        icon="fas fa-route"
        compact={hasSearched}
      />
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              Transferts &amp; VTC
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Réservez vos navettes aéroport, chauffeurs privés et transferts interurbains
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-[#062523] p-3.5 md:p-4 rounded-xl shadow-lg border border-[#01796F]/30 text-white"
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
                  className="w-10 h-10 rounded-full border border-[#01796F]/40 bg-[#021817] text-[#02E0D5] hover:bg-[#01796F]/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-calendar-alt mr-1.5 text-[#02E0D5]" />
                  Date
                </label>
                <input
                  id="transferDate"
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              {/* Departure Time */}
              <div className="min-w-0">
                <label
                  htmlFor="transferTime"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-clock mr-1.5 text-[#02E0D5]" />
                  Heure
                </label>
                <input
                  id="transferTime"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              {/* Passenger Count */}
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left">
                  <i className="fas fa-users mr-1.5 text-[#02E0D5]" />
                  Passagers
                </label>
                <TravelerStepper
                  field
                  value={passengers}
                  min={1}
                  max={16}
                  label="Passagers"
                  decrementLabel="Diminuer les passagers"
                  incrementLabel="Augmenter les passagers"
                  onChange={setPassengers}
                />
              </div>

              {/* Submit Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full lg:w-auto h-10 px-6 bg-[#01796F] hover:bg-[#015f57] text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
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
            <div className="mt-2.5 p-2.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-xs flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </section>

      {/* ==================== CONTENT SECTION ==================== */}
      <section className="travel-results-section py-6 px-4 bg-slate-50 dark:bg-[#021817]">
        <div className="max-w-6xl mx-auto">
          {/* Mode Selector Tabs */}
          {hasSearched && transfers.length > 0 && (
          <div className="flex justify-center gap-3 mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'TAXI' ? 'ALL' : 'TAXI'))}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                transportType === 'TAXI'
                  ? 'bg-[#01796F] text-white shadow-md'
                  : 'bg-slate-200/80 dark:bg-[#062523] text-slate-700 dark:text-slate-300 hover:bg-[#01796F]/15 dark:hover:bg-[#0a302d]'
              }`}
            >
              <i className="fas fa-taxi" />
              Transfert Privé &amp; VTC {hasSearched && transfers.length > 0 && `(${categoryCounts.private})`}
            </button>

            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'TRAIN' ? 'ALL' : 'TRAIN'))}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                transportType === 'TRAIN'
                  ? 'bg-[#01796F] text-white shadow-md'
                  : 'bg-slate-200/80 dark:bg-[#062523] text-slate-700 dark:text-slate-300 hover:bg-[#01796F]/15 dark:hover:bg-[#0a302d]'
              }`}
            >
              <i className="fas fa-train" />
              Trains &amp; Navettes {hasSearched && transfers.length > 0 && `(${categoryCounts.shared})`}
            </button>

            <button
              type="button"
              onClick={() => setTransportType((prev) => (prev === 'CAR_RENTAL' ? 'ALL' : 'CAR_RENTAL'))}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                transportType === 'CAR_RENTAL'
                  ? 'bg-[#01796F] text-white shadow-md'
                  : 'bg-slate-200/80 dark:bg-[#062523] text-slate-700 dark:text-slate-300 hover:bg-[#01796F]/15 dark:hover:bg-[#0a302d]'
              }`}
            >
              <i className="fas fa-car" />
              Minibus &amp; véhicules {hasSearched && transfers.length > 0 && `(${categoryCounts.minibus})`}
            </button>
          </div>
          )}

          {/* Active filter badge / reset option */}
          {hasSearched && transfers.length > 0 && transportType !== 'ALL' && (
            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => setTransportType('ALL')}
                className="text-[#01796F] dark:text-[#02E0D5] font-semibold text-xs hover:underline inline-flex items-center gap-1.5"
              >
                <i className="fas fa-undo-alt" />
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

              <div className="flex flex-col gap-4">
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
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(245px,.42fr)] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-[border-color,box-shadow] hover:border-[#01796F]/40 hover:shadow-md dark:border-[#01796F]/30 dark:bg-[#062523] dark:text-slate-100"
                  >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-2xl shrink-0">
                          <i className={vehicleIcon} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex gap-2 items-center mb-1">
                            <span
                              style={{ background: badgeBg }}
                              className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            >
                              {badgeLabel}
                            </span>
                            <span className="bg-slate-200 dark:bg-[#0a302d] text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Partenaire HBX
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                            {item.vehicleModel || 'Berline Confort'}
                          </h3>
                          <p className="m-0 mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            <i className="fas fa-route mr-1.5 text-[#01796F] dark:text-[#02E0D5]" />
                            {item.pickup || item.departureCity || 'Aéroport'} → {item.dropoff || item.arrivalCity || 'Destination'}
                          </p>
                          {item.capacity && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 inline-block">
                              <i className="fas fa-users mr-1" />
                              Jusqu&apos;à {item.capacity} passagers
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:py-1 lg:pl-5 dark:border-[#01796F]/25">
                        <div className="lg:text-right">
                          <div className="text-2xl font-extrabold leading-tight text-[#01796F] dark:text-[#02E0D5]">
                            <PriceDisplay conversion={item.priceConversion} amount={item.price} currency={item.currency} />
                          </div>
                          <div className="text-[11px] text-slate-400">Tarif garanti par véhicule</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/transfers/${encodeURIComponent(offerKey)}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#01796F]/50 bg-[#01796F]/10 px-2 text-center text-xs font-bold text-[#01796F] transition-colors hover:bg-[#01796F]/20 dark:border-[#02E0D5]/50 dark:bg-[#02E0D5]/10 dark:text-[#02E0D5]"
                          >
                            Détails
                          </Link>
                          <Link
                            href={`/booking?serviceType=TRANSFER&serviceId=${encodeURIComponent(offerKey)}&selectionRef=${encodeURIComponent(item.selectionRef || offerKey)}&serviceTitle=${encodeURIComponent(item.vehicleModel || 'Transfert')}&price=${item.price}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#01796F] px-2 text-center text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#005f57]"
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
            <div className="text-center py-12 px-4 bg-white dark:bg-[#062523] rounded-xl shadow-md border border-slate-200 dark:border-[#01796F]/30 text-slate-900 dark:text-slate-100">
              <div className="w-14 h-14 rounded-full bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fas fa-filter" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                Aucun transfert dans cette catégorie
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                Aucun véhicule ne correspond au filtre sélectionné pour ce trajet. {transfers.length} option(s) disponible(s) dans les autres catégories.
              </p>
              <button
                type="button"
                onClick={() => setTransportType('ALL')}
                className="px-5 py-2.5 rounded-lg bg-[#01796F] hover:bg-[#015f57] text-white font-bold text-xs transition-colors shadow-sm"
              >
                <i className="fas fa-th-large mr-2" />
                Afficher tous les transferts ({transfers.length})
              </button>
            </div>
          )}
        </div>
      </section>
    </TravelPage>
  );
}
