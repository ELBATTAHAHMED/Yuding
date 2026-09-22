'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import type { TrainOffer, TrainStation } from '@/types/travel.types';
import { StationSelector } from '@/components/travel/StationSelector';
import { TravelHero, TravelPage } from '@/components/travel';
import { TrainCard } from '@/components/travel/TrainCard';
import { TrainSkeleton } from '@/components/travel/TrainSkeleton';
import { EmptyState, ErrorState, SortBar } from '@/components/ui';
import { saveSearchOffers } from '@/lib/offer-store';

const TODAY = new Date().toISOString().split('T')[0];

export default function TrainsPage() {
  const [stations, setStations] = useState<TrainStation[]>([]);
  const [originStation, setOriginStation] = useState<TrainStation | null>(null);
  const [destinationStation, setDestinationStation] = useState<TrainStation | null>(null);
  const [date, setDate] = useState(TODAY);
  const [departureTime, setDepartureTime] = useState('');
  const [passengers, setPassengers] = useState(1);

  const [trains, setTrains] = useState<TrainOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outdatedNotice, setOutdatedNotice] = useState<string | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  // Filters
  const [directOnly, setDirectOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEPARTURE' | 'DURATION'>('DEPARTURE');

  // Fetch station directory on mount
  useEffect(() => {
    let mounted = true;
    travelService
      .getTrainStations()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setStations(data);
        }
      })
      .catch(() => {
        // Fail silently - station autocomplete will show empty
      })
      .finally(() => {
        if (mounted) setLoadingStations(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSwap = () => {
    const temp = originStation;
    setOriginStation(destinationStation);
    setDestinationStation(temp);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!originStation) {
      setErrorMessage('Veuillez sélectionner une gare de départ.');
      return;
    }
    if (!destinationStation) {
      setErrorMessage('Veuillez sélectionner une gare d’arrivée.');
      return;
    }
    if (originStation.id.toLowerCase() === destinationStation.id.toLowerCase()) {
      setErrorMessage('La gare de départ et la gare d’arrivée ne peuvent pas être identiques.');
      return;
    }
    if (!date) {
      setErrorMessage('Veuillez sélectionner une date de voyage.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setOutdatedNotice(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const originCoords =
        originStation.latitude && originStation.longitude
          ? `${originStation.latitude},${originStation.longitude}`
          : originStation.id.includes(',')
          ? originStation.id
          : undefined;

      const destCoords =
        destinationStation.latitude && destinationStation.longitude
          ? `${destinationStation.latitude},${destinationStation.longitude}`
          : destinationStation.id.includes(',')
          ? destinationStation.id
          : undefined;

      const response = await travelService.searchTrains({
        originStation: originStation.name || originStation.id,
        destinationStation: destinationStation.name || destinationStation.id,
        date,
        departureTime: departureTime || undefined,
        currency: 'EUR',
        originCoordinates: originCoords,
        destinationCoordinates: destCoords,
        originCountryCode: originStation.countryCode,
        destinationCountryCode: destinationStation.countryCode,
      });

      if (response.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(response.message);
        setTrains([]);
      } else {
        const results = response.results || [];
        setTrains(results);
        saveSearchOffers('TRAIN', results);
      }
    } catch (err: unknown) {
      setTrains([]);
      const errMsg = err instanceof Error ? err.message : String(err);

      // Detect Freshness Gate rejection (SCHEDULE_DATA_OUTDATED)
      if (
        errMsg.includes('SCHEDULE_DATA_OUTDATED') ||
        errMsg.includes('422') ||
        errMsg.includes('not available for date') ||
        errMsg.includes('outside feed validity') ||
        errMsg.includes('valid from')
      ) {
        setOutdatedNotice(
          'Les horaires pour cette date ne sont pas disponibles dans le jeu de données GTFS (validité du calendrier dépassée). Conformément aux règles de transparence Yuding, aucun horaire obsolète ou inféré n’est présenté comme horaire officiel en temps réel.'
        );
      } else if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du fournisseur de données. Veuillez patienter un instant.');
      } else if (errMsg.includes('TIMEOUT') || errMsg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai d’attente dépassé lors de la consultation des horaires. Veuillez réessayer.');
      } else {
        setErrorMessage(
          'Impossible de récupérer les horaires pour ce trajet. Veuillez vérifier votre connexion ou réessayer plus tard.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamically extract unique products from current results
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    trains.forEach((t) => {
      if (t.productType) set.add(t.productType);
    });
    return Array.from(set);
  }, [trains]);

  // Filter and Sort results
  const filteredTrains = useMemo(() => {
    let list = [...trains];

    if (directOnly) {
      list = list.filter((t) => t.direct);
    }

    if (selectedProduct !== 'ALL') {
      list = list.filter((t) => t.productType === selectedProduct);
    }

    list.sort((a, b) => {
      if (sortBy === 'DURATION') {
        return (a.durationMinutes || 9999) - (b.durationMinutes || 9999);
      }
      return (a.departureTime || '').localeCompare(b.departureTime || '');
    });

    return list;
  }, [trains, directOnly, selectedProduct, sortBy]);

  return (
    <TravelPage page="trains">
      <TravelHero
        title="Trains"
        subtitle="Des horaires ferroviaires fiables pour le Maroc et les réseaux internationaux."
        destination={destinationStation?.city || undefined}
        country={destinationStation?.country}
        icon="fas fa-train"
        compact={hasSearched}
      />
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              Trains
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Consultez les liaisons ferroviaires et grilles horaires au Maroc (ONCF) et dans le monde (Transitous)
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-[#062523] p-3.5 md:p-4 rounded-xl shadow-lg border border-[#01796F]/30 text-white"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_auto_1.4fr_1fr_0.9fr_0.8fr_auto] gap-2.5 items-end">
              {/* Origin Station */}
              <div className="min-w-0">
                <StationSelector
                  id="originStation"
                  label="Gare de départ"
                  icon="fas fa-train"
                  placeholder={loadingStations ? 'Chargement...' : 'Gare de départ (ex: Casa, Paris, Lyon)...'}
                  stations={stations}
                  selectedStation={originStation}
                  onSelect={(st) => {
                    setOriginStation(st);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={loadingStations}
                />
              </div>

              {/* Swap Button */}
              <div className="hidden lg:flex items-center justify-center pb-0.5">
                <button
                  type="button"
                  onClick={handleSwap}
                  disabled={!originStation && !destinationStation}
                  title="Inverser les gares"
                  className="w-10 h-10 rounded-full border border-[#01796F]/40 bg-[#021817] text-[#02E0D5] hover:bg-[#01796F]/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fas fa-exchange-alt text-xs" />
                </button>
              </div>

              {/* Destination Station */}
              <div className="min-w-0">
                <StationSelector
                  id="destinationStation"
                  label="Gare d’arrivée"
                  icon="fas fa-map-marker-alt"
                  placeholder={loadingStations ? 'Chargement...' : 'Gare d’arrivée (ex: Rabat, Tanger)...'}
                  stations={stations}
                  selectedStation={destinationStation}
                  onSelect={(st) => {
                    setDestinationStation(st);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={loadingStations}
                />
              </div>

              {/* Departure Date */}
              <div className="min-w-0">
                <label
                  htmlFor="trainDate"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-calendar-alt mr-1.5 text-[#02E0D5]" />
                  Date
                </label>
                <input
                  id="trainDate"
                  type="date"
                  value={date}
                  min={TODAY}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              {/* Optional Time */}
              <div className="min-w-0">
                <label
                  htmlFor="trainTime"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
                >
                  <i className="fas fa-clock mr-1.5 text-[#02E0D5]" />
                  Heure
                </label>
                <input
                  id="trainTime"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              {/* Passengers */}
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left">
                  <i className="fas fa-users mr-1.5 text-[#02E0D5]" />
                  Passagers
                </label>
                <div className="flex items-center h-10 border border-[#01796F]/40 rounded-lg overflow-hidden bg-[#021817]">
                  <button
                    type="button"
                    onClick={() => setPassengers((v) => Math.max(1, v - 1))}
                    disabled={passengers <= 1}
                    className="w-9 h-full bg-[#062523] text-white font-bold text-xs hover:bg-[#01796F]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-bold text-xs text-white">
                    {passengers}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPassengers((v) => Math.min(9, v + 1))}
                    disabled={passengers >= 9}
                    className="w-9 h-full bg-[#062523] text-white font-bold text-xs hover:bg-[#01796F]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="submit"
                  disabled={loading || !originStation || !destinationStation || !date}
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
      <section className="py-6 px-4 bg-slate-50 dark:bg-[#021817] min-h-[50vh]">
        <div className="max-w-6xl mx-auto">
        {/* Freshness Gate Alert (Outdated Schedule Rejection) */}
        {outdatedNotice && (
          <div
            style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '1.8rem', color: '#d97706', marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#92400e', fontWeight: 700 }}>
                  Horaires non disponibles pour cette date (Contrôle d’actualité des données)
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#78350f', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {outdatedNotice}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <a
                    href="https://www.oncf-voyages.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#d97706',
                      color: '#ffffff',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Consulter les horaires officiels actuels sur ONCF</span>
                    <i className="fas fa-external-link-alt" />
                  </a>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', fontStyle: 'italic' }}>
                    (Redirection externe vers le portail officiel de l’ONCF)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Unavailable message */}
        {providerMessage && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            <i className="fas fa-satellite-dish" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>{providerMessage}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <TrainSkeleton count={5} />}

        {/* Filters and sorting bar when results exist */}
        {!loading && hasSearched && trains.length > 0 && (
          <div>
            <SortBar
              count={filteredTrains.length}
              resultLabel="liaison"
              sortOptions={[
                { value: 'DEPARTURE', label: 'Heure de départ' },
                { value: 'DURATION', label: 'Durée la plus courte' },
              ]}
              currentSort={sortBy}
              onSortChange={(val) => setSortBy(val as 'DEPARTURE' | 'DURATION')}
              activeChips={[
                ...(directOnly ? [{ key: 'directOnly', label: 'Directs uniquement' }] : []),
                ...(selectedProduct !== 'ALL' ? [{ key: 'product', label: `Type: ${selectedProduct}` }] : []),
              ]}
              onChipRemove={(key) => {
                if (key === 'directOnly') setDirectOnly(false);
                if (key === 'product') setSelectedProduct('ALL');
              }}
            />

            {/* Sub-filters row (direct only checkbox and product select) */}
            <div className="flex items-center gap-6 flex-wrap mb-4 px-4 py-2 bg-white dark:bg-[#062523] rounded-lg border border-slate-200 dark:border-[#01796F]/30 text-slate-800 dark:text-slate-200 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                  className="rounded border-slate-300 text-[#01796F] focus:ring-[#02E0D5]"
                />
                <span>Directs uniquement</span>
              </label>

              {availableProducts.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Type de train :</span>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-[#01796F]/40 text-xs bg-white dark:bg-[#021817] text-slate-900 dark:text-white"
                  >
                    <option value="ALL">Tous les trains</option>
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && filteredTrains.length > 0 && (
          <div className="flex flex-col gap-4">
            {filteredTrains.map((train) => (
              <TrainCard key={train.offerId} offer={train} />
            ))}
          </div>
        )}

        {/* Empty Filter State */}
        {!loading && hasSearched && trains.length > 0 && filteredTrains.length === 0 && (
          <EmptyState
            icon="fa-filter"
            title="Aucune liaison ne correspond à vos filtres"
            description="Essayez de désactiver le filtre 'Directs uniquement' ou de sélectionner 'Tous les trains'."
          />
        )}

        {/* Empty Search State */}
        {!loading && hasSearched && trains.length === 0 && !outdatedNotice && !providerMessage && (
          <EmptyState
            icon="fa-train"
            title="Aucun train trouvé pour cette liaison"
            description="Aucune circulation directe ou horaire correspondant n’a été identifiée pour cette date ou cet horaire."
          />
        )}

        {/* Initial Prompt State (before search) */}
        {!hasSearched && (
          <EmptyState
            icon="fa-route"
            title="Recherchez votre itinéraire en train"
            description="Sélectionnez une gare de départ, une gare d’arrivée et votre date de départ pour afficher les horaires."
          />
        )}

        {/* Attribution & Legal disclaimer */}
        <div className="mt-12 p-4 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/20 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Attribution &amp; Informations de source :
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Réseau Maroc (ONCF) :</strong> Données issues du jeu GTFS communautaire (
              <a
                href="https://github.com/orhazal/oncf-gtfs-unofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01796F] dark:text-[#02E0D5] underline hover:no-underline"
              >
                orhazal/oncf-gtfs-unofficial
              </a>
              , Licence ODbL 1.0) — horaires fournis à titre indicatif sans réservation transactionnelle directe.
              Pour toute réservation officielle, consultez{' '}
              <a
                href="https://www.oncf-voyages.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01796F] dark:text-[#02E0D5] underline hover:no-underline"
              >
                oncf-voyages.ma
              </a>
              .
            </div>
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Réseau International :</strong> Planification d&apos;itinéraires ferroviaires et multimodaux propulsée par{' '}
              <a
                href="https://transitous.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#01796F] dark:text-[#02E0D5] underline hover:no-underline"
              >
                Transitous
              </a>{' '}
              (moteur libre MOTIS, données OpenStreetMap / GTFS / NeTEx). Les tarifs ne sont pas fournis par cette source.
            </div>
          </div>
        </div>
        </div>
      </section>
    </TravelPage>
  );
}
