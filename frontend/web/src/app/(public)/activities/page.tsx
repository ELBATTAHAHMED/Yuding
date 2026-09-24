'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ActivityOffer } from '@/types/travel.types';
import { DestinationWeather, GeoPlaceSelector, GeoMap, NearbyPoiPanel, DestinationImageGallery, SafeEntityImage, ActivitySkeleton } from '@/components/travel';
import { TravelHero, TravelPage } from '@/components/travel';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar, TravelerStepper } from '@/components/ui';
import { sortActivities } from '@/lib/search-ux';
import { saveSearchOffers } from '@/lib/offer-store';
import { useSearchSession } from '@/lib/search-session';
import type { ActivitySortKey } from '@/lib/search-ux';
import type { GeoPlace, NearbyPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ActivitiesPage() {
  const today = new Date().toISOString().split('T')[0];

  const [destination, setDestination] = useState('');
  const [selectedGeoPlace, setSelectedGeoPlace] = useState<GeoPlace | null>(null);
  const [destinationPois, setDestinationPois] = useState<NearbyPlace[]>([]);
  const [isLoadingPois, setIsLoadingPois] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<NearbyPlace | null>(null);
  const [showDestinationGuide, setShowDestinationGuide] = useState(false);
  const [date, setDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [category, setCategory] = useState('ALL');
  const [sortKey, setSortKey] = useState<ActivitySortKey>('PRICE_ASC');
  const placeRequestRef = useRef(0);

  const handlePlaceSelect = useCallback(async (place: GeoPlace | null) => {
    const requestId = ++placeRequestRef.current;
    setSelectedGeoPlace(place);
    setSelectedPoi(null);
    setDestinationPois([]);
    setIsLoadingPois(false);
    setShowDestinationGuide(Boolean(place?.latitude && place?.longitude));
    if (place) {
      const name = place.city || place.name;
      setDestination(name);
      setErrorMessage(null);

      if (place.latitude && place.longitude) {
        setIsLoadingPois(true);
        try {
          const pois = await geoService.getNearbyPlaces({
            lat: place.latitude,
            lon: place.longitude,
            radius: 5000,
            limit: 20,
          });
          if (requestId === placeRequestRef.current) setDestinationPois(pois);
        } catch {
          if (requestId === placeRequestRef.current) setDestinationPois([]);
        } finally {
          if (requestId === placeRequestRef.current) setIsLoadingPois(false);
        }
      }
    } else {
      setDestination('');
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setDestination(text);
    setErrorMessage(null);
  }, []);

  const [activities, setActivities] = useState<ActivityOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const city = params.get('destination')?.trim();
    if (!city) return;
    setDestination(city);
    setSelectedGeoPlace({
      id: `home-${city}`,
      name: city,
      city,
      formatted: city,
      countryCode: params.get('countryCode') || '',
      latitude: 0,
      longitude: 0,
    });
  }, []);

  useSearchSession('ACTIVITY', {
    destination, selectedGeoPlace, destinationPois, selectedPoi, showDestinationGuide,
    date, travelers, category, sortKey, activities, providerMessage, errorMessage, hasSearched,
  }, (saved) => {
    setDestination(saved.destination);
    setSelectedGeoPlace(saved.selectedGeoPlace);
    setDestinationPois(saved.destinationPois);
    setSelectedPoi(saved.selectedPoi);
    setShowDestinationGuide(saved.showDestinationGuide);
    setDate(saved.date);
    setTravelers(saved.travelers);
    setCategory(saved.category);
    setSortKey(saved.sortKey);
    setActivities(saved.activities);
    setProviderMessage(saved.providerMessage);
    setErrorMessage(saved.errorMessage);
    setHasSearched(saved.hasSearched);
  }, loading || isRetrying);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!destination.trim()) {
      setErrorMessage('Veuillez saisir une destination pour lancer la recherche.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const data = await travelService.searchActivities({
        destination: destination.trim(),
        date: date || undefined,
        travelers: travelers > 0 ? travelers : 1,
        category: category !== 'ALL' ? category : undefined,
      });

      setActivities(data.results || []);
      saveSearchOffers('ACTIVITY', data.results || []);
      if (data.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(data.message || 'Le fournisseur d’activités ne répond pas pour le moment.');
      }
    } catch (err: unknown) {
      setActivities([]);
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du partenaire d’activités. Veuillez patienter un instant.');
      } else if (msg.includes('TIMEOUT') || msg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai d’attente dépassé. Veuillez réessayer.');
      } else if (msg.includes('503') || msg.toLowerCase().includes('indisponible') || msg.toLowerCase().includes('unavailable')) {
        setErrorMessage('Le fournisseur d’activités ne répond pas pour le moment. Veuillez réessayer ultérieurement.');
      } else {
        setErrorMessage(msg.length < 120 ? msg : 'Une erreur est survenue lors de la recherche d’activités. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (loading || isRetrying) return;
    setIsRetrying(true);
    try {
      await handleSearch();
    } finally {
      setIsRetrying(false);
    }
  };

  const filtered = useMemo(() => activities.filter((act) => {
    if (category === 'ALL') return true;
    return act.category?.toLowerCase().includes(category.toLowerCase());
  }), [activities, category]);

  const sortedActivities = useMemo(() => sortActivities(filtered, sortKey), [filtered, sortKey]);

  return (
    <TravelPage page="activities">
      <TravelHero
        title="Activités & expériences"
        subtitle="Des idées authentiques pour donner du relief à votre voyage."
        destination={selectedGeoPlace ? destination || undefined : undefined}
        country={selectedGeoPlace?.country}
        defaultImageQuery="travel adventure activity excursion"
        defaultImageIndex={3}
        icon="fas fa-compass"
        compact={hasSearched}
      />
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              Activités &amp; Expériences
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Explorez des visites guidées, excursions et aventures inoubliables
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-[#062523] p-3.5 md:p-4 rounded-xl shadow-lg border border-[#01796F]/30 text-white"
          >
            <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr_auto]">
              <div className="min-w-0">
                <GeoPlaceSelector
                  id="activity-destination"
                  label="Destination"
                  placeholder="Ville ou lieu (ex: Paris, Marrakech, Rome)..."
                  type="city"
                  selectedPlace={selectedGeoPlace}
                  onSelect={handlePlaceSelect}
                  onQueryChange={handleQueryChange}
                  error={errorMessage && !destination.trim() ? errorMessage : null}
                  required
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left">
                  <i className="fas fa-calendar-alt mr-1.5 text-[#02E0D5]" />
                  Date de visite
                </label>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left">
                  <i className="fas fa-user-friends mr-1.5 text-[#02E0D5]" />
                  Participants
                </label>
                <TravelerStepper
                  field
                  value={travelers}
                  min={1}
                  max={20}
                  label="Participants"
                  valueLabel={(value) => `${value} pers.`}
                  onChange={setTravelers}
                />
              </div>

              <div className="w-full md:mt-5 lg:w-auto">
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
          {/* Category Tabs */}
          {hasSearched && sortedActivities.length > 0 && (
          <div className="flex justify-center gap-2.5 mb-6 flex-wrap">
            {[
              { label: 'Toutes les activités', value: 'ALL' },
              { label: 'Aventure & Désert', value: 'Aventure' },
              { label: 'Sports Nautiques', value: 'Sports' },
              { label: 'Culture & Médina', value: 'Culture' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategory(tab.value)}
                className={`px-4 py-2 rounded-full font-semibold text-xs transition-all ${
                  category === tab.value
                    ? 'bg-[#01796F] text-white shadow-md'
                    : 'bg-slate-200/80 dark:bg-[#062523] text-slate-700 dark:text-slate-300 hover:bg-[#01796F]/15 dark:hover:bg-[#0a302d]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          )}

          {/* Destination Guide & Map (Phase 26) */}
          {selectedGeoPlace && Boolean(selectedGeoPlace.latitude && selectedGeoPlace.longitude && showDestinationGuide) && (
            <div className="mb-9 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-[#01796F]/30 dark:bg-[#062523]">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-[#01796F] dark:text-[#02E0D5]">Guide de destination</p>
                  <h2 className="m-0 text-xl font-extrabold leading-snug text-slate-900 dark:text-white">
                    <i className="fas fa-map-marked-alt mr-2 text-[#01796F] dark:text-[#02E0D5]" />
                    {selectedGeoPlace.city || selectedGeoPlace.name} — Découverte &amp; Points d&apos;Intérêt
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedGeoPlace.country ? `${selectedGeoPlace.country} • ` : ''}Coordonnées: {selectedGeoPlace.latitude.toFixed(4)}, {selectedGeoPlace.longitude.toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDestinationGuide(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[#01796F]/50 hover:text-[#01796F] dark:border-[#01796F]/30 dark:text-slate-300"
                >
                  Masquer
                </button>
              </div>

              <div className="mb-4">
                <DestinationImageGallery
                  city={selectedGeoPlace.city || selectedGeoPlace.name}
                  country={selectedGeoPlace.country}
                  countryCode={selectedGeoPlace.countryCode}
                />
              </div>
              <div className="mb-4">
                <DestinationWeather
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  destinationName={selectedGeoPlace.city || selectedGeoPlace.name}
                />
              </div>
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
                <GeoMap
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  placeName={selectedGeoPlace.city || selectedGeoPlace.name}
                  pois={destinationPois}
                  selectedPoi={selectedPoi}
                  onSelectPoi={(poi) => setSelectedPoi(poi)}
                  height={360}
                />
                <NearbyPoiPanel
                  pois={destinationPois}
                  isLoading={isLoadingPois}
                  selectedPoi={selectedPoi}
                  onSelectPoi={(poi) => setSelectedPoi(poi)}
                  destinationName={selectedGeoPlace.city || selectedGeoPlace.name}
                />
              </div>
            </div>
          )}

          {!hasSearched && (
            <EmptyState
              icon="fa-compass"
              title="Prêt à explorer votre prochaine destination ?"
              description="Indiquez une ville ci-dessus (ex: Paris, Barcelone, Rome ou Marrakech) et cliquez sur Rechercher pour découvrir les offres en direct."
            />
          )}

          {hasSearched && loading && <ActivitySkeleton count={6} />}

          {hasSearched && !loading && errorMessage && (
            <ErrorState
              title="Erreur de recherche"
              message={errorMessage}
              onRetry={handleRetry}
            />
          )}

          {hasSearched && !loading && !errorMessage && sortedActivities.length === 0 && (
            <EmptyState
              icon="fa-search-location"
              title="Aucune activité disponible pour le moment"
              description={providerMessage || 'Aucune offre trouvée pour cette sélection. Essayez une autre ville ou date.'}
            />
          )}

          {hasSearched && sortedActivities.length > 0 && (
            <div>
              {/* Sort toolbar */}
              <SortBar
                count={sortedActivities.length}
                resultLabel="activité"
                sortOptions={[
                  { value: 'PRICE_ASC' as ActivitySortKey, label: 'Prix croissant' },
                  { value: 'PRICE_DESC' as ActivitySortKey, label: 'Prix décroissant' },
                ]}
                currentSort={sortKey}
                onSortChange={setSortKey}
              />

              <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedActivities.map((act) => {
                  const isCustom = act.source === 'YUDING_CUSTOM';
                  const offerKey = act.offerId || act.id || act.title;

                  return (
                    <div
                      key={offerKey}
                      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow] hover:border-[#01796F]/40 hover:shadow-md dark:border-[#01796F]/30 dark:bg-[#062523]"
                    >
                      <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-[#0a302d]">
                        <SafeEntityImage
                          src={act.imageUrl}
                          alt={act.title}
                          entityType="ACTIVITY"
                          className="h-full w-full object-cover"
                        />
                        <span
                          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ${
                            isCustom ? 'bg-amber-600' : 'bg-[#01796F]'
                          }`}
                        >
                          {isCustom ? 'Yuding Sélect' : 'Partenaire HBX'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-4 text-slate-900 dark:text-slate-100">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-[#01796F] dark:text-[#02E0D5] uppercase tracking-wider">
                            {act.category || 'Excursion'}
                          </span>
                          {act.durationHours && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[#0a302d] dark:text-slate-300">
                              <i className="fas fa-clock mr-1" />
                              {act.durationHours}h
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 min-h-[2.75rem] text-lg font-bold leading-snug text-slate-900 dark:text-white">
                          {act.title}
                        </h3>
                        <div aria-hidden="true" className="my-2.5 h-px bg-slate-200 dark:bg-[#327a73]/50" />
                        <p className="mb-2.5 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {stripHtml(act.description)}
                        </p>

                        <div className="mt-auto flex flex-col gap-3 border-t border-slate-300 pt-3 dark:border-[#327a73]/70">
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarif par personne</span>
                            <div className="text-2xl font-extrabold leading-tight text-[#01796F] dark:text-[#02E0D5]">
                              <PriceDisplay conversion={act.priceConversion} amount={act.price} currency={act.currency} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/activities/${encodeURIComponent(offerKey)}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#01796F]/50 bg-[#01796F]/10 px-2 text-center text-xs font-bold text-[#01796F] transition-colors hover:bg-[#01796F]/20 dark:border-[#02E0D5]/50 dark:bg-[#02E0D5]/10 dark:text-[#02E0D5]"
                            >
                              Détails
                            </Link>
                            <Link
                              href={`/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(offerKey)}&selectionRef=${encodeURIComponent(act.selectionRef || offerKey)}&serviceTitle=${encodeURIComponent(act.title)}&price=${act.price}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#01796F] px-2 text-center text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#005f57]"
                            >
                              Réserver
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </TravelPage>
  );
}
