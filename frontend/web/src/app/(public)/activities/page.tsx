'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ActivityOffer } from '@/types/travel.types';
import { DestinationWeather, GeoPlaceSelector, GeoMap, NearbyPoiPanel, DestinationImageGallery, SafeEntityImage, ActivitySkeleton } from '@/components/travel';
import { TravelHero, TravelPage } from '@/components/travel';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar, TravelerStepper } from '@/components/ui';
import { sortActivities } from '@/lib/search-ux';
import { saveSearchOffers } from '@/lib/offer-store';
import type { ActivitySortKey } from '@/lib/search-ux';
import type { GeoPlace, NearbyPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

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

  const handlePlaceSelect = async (place: GeoPlace | null) => {
    setSelectedGeoPlace(place);
    setSelectedPoi(null);
    if (place) {
      const name = place.city || place.name;
      setDestination(name);
      setErrorMessage(null);

      if (place.latitude && place.longitude) {
        setIsLoadingPois(true);
        setShowDestinationGuide(true);
        try {
          const pois = await geoService.getNearbyPlaces({
            lat: place.latitude,
            lon: place.longitude,
            radius: 5000,
            limit: 20,
          });
          setDestinationPois(pois);
        } catch {
          setDestinationPois([]);
        } finally {
          setIsLoadingPois(false);
        }
      }
    } else {
      setDestination('');
      setDestinationPois([]);
      setShowDestinationGuide(false);
    }
  };

  const [activities, setActivities] = useState<ActivityOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
        setProviderMessage(data.message);
      }
    } catch (err: unknown) {
      setActivities([]);
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du partenaire d’activités. Veuillez patienter un instant.');
      } else if (msg.includes('TIMEOUT') || msg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai d’attente dépassé. Veuillez réessayer.');
      } else {
        setErrorMessage('Le fournisseur d’activités ne répond pas pour le moment. Veuillez réessayer ultérieurement.');
      }
    } finally {
      setLoading(false);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr_auto] gap-2.5 items-end">
              <div className="min-w-0">
                <GeoPlaceSelector
                  id="activity-destination"
                  label="Destination"
                  placeholder="Ville ou lieu (ex: Paris, Marrakech, Rome)..."
                  type="city"
                  selectedPlace={selectedGeoPlace}
                  onSelect={handlePlaceSelect}
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
          {selectedGeoPlace && selectedGeoPlace.latitude && selectedGeoPlace.longitude && showDestinationGuide && (
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                marginBottom: '2.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#01796F', margin: 0 }}>
                    <i className="fas fa-map-marked-alt" style={{ marginRight: '0.5rem' }} />
                    {selectedGeoPlace.city || selectedGeoPlace.name} — Découverte &amp; Points d&apos;Intérêt
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.88rem' }}>
                    {selectedGeoPlace.country ? `${selectedGeoPlace.country} • ` : ''}Coordonnées: {selectedGeoPlace.latitude.toFixed(4)}, {selectedGeoPlace.longitude.toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDestinationGuide(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  Masquer
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <DestinationWeather
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  destinationName={selectedGeoPlace.city || selectedGeoPlace.name}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <DestinationImageGallery
                  city={selectedGeoPlace.city || selectedGeoPlace.name}
                  country={selectedGeoPlace.country}
                  countryCode={selectedGeoPlace.countryCode}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                <GeoMap
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  placeName={selectedGeoPlace.city || selectedGeoPlace.name}
                  pois={destinationPois}
                  selectedPoi={selectedPoi}
                  onSelectPoi={(poi) => setSelectedPoi(poi)}
                  height={340}
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
              onRetry={() => { setHasSearched(false); setErrorMessage(null); setActivities([]); }}
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '2rem',
                }}
              >
                {sortedActivities.map((act) => {
                  const isCustom = act.source === 'YUDING_CUSTOM';
                  const offerKey = act.offerId || act.id || act.title;

                  return (
                    <div
                      key={offerKey}
                      className="bg-white dark:bg-[#062523] rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-[#01796F]/30 flex flex-col transition-all hover:border-[#01796F]/50"
                    >
                      <div className="h-48 overflow-hidden relative">
                        <SafeEntityImage
                          src={act.imageUrl}
                          alt={act.title}
                          entityType="ACTIVITY"
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-3 right-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md ${
                            isCustom ? 'bg-amber-600' : 'bg-[#01796F]'
                          }`}
                        >
                          {isCustom ? 'Yuding Sélect' : 'Partenaire HBX'}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col text-slate-900 dark:text-slate-100">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-bold text-[#01796F] dark:text-[#02E0D5] uppercase tracking-wider">
                            {act.category || 'Excursion'}
                          </span>
                          {act.durationHours && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              <i className="fas fa-clock mr-1" />
                              {act.durationHours}h
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1">
                          {act.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 flex-grow">
                          {act.description}
                        </p>

                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-100 dark:border-[#01796F]/20 flex-wrap gap-2">
                          <div>
                            <span className="text-lg font-bold text-[#01796F] dark:text-[#02E0D5]">
                              <PriceDisplay conversion={act.priceConversion} amount={act.price} currency={act.currency} />
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400"> / pers.</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/activities/${encodeURIComponent(offerKey)}`}
                              className="px-3 py-1.5 rounded-lg border border-[#01796F] text-[#01796F] dark:text-[#02E0D5] dark:border-[#02E0D5]/50 hover:bg-[#01796F]/10 font-bold text-xs whitespace-nowrap transition-colors"
                            >
                              Détails
                            </Link>
                            <Link
                              href={`/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(offerKey)}&selectionRef=${encodeURIComponent(act.selectionRef || offerKey)}&serviceTitle=${encodeURIComponent(act.title)}&price=${act.price}`}
                              className="btn-booking px-3.5 py-1.5 rounded-lg text-white font-bold text-xs whitespace-nowrap transition-colors shadow-sm"
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
