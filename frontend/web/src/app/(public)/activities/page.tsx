'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ActivityOffer } from '@/types/travel.types';
import { DestinationWeather, GeoPlaceSelector, GeoMap, NearbyPoiPanel, DestinationImageGallery, SafeEntityImage, ActivitySkeleton } from '@/components/travel';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar } from '@/components/ui';
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
        setErrorMessage('Impossible de joindre le service d’activités. Vérifiez que la passerelle est active.');
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
    <div>
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="bg-slate-900 text-white py-8 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="mb-5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
              Activités &amp; Expériences
            </h1>
            <p className="text-sm md:text-base text-slate-300">
              Explorez des visites guidées, excursions et aventures inoubliables
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.2fr_auto] gap-3 items-end">
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
                <label className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left">
                  <i className="fas fa-calendar-alt mr-1.5 text-[#01796F]" />
                  Date de visite
                </label>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#01796F] focus:border-transparent transition-all"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#01796F] mb-1.5 uppercase tracking-wider text-left">
                  <i className="fas fa-user-friends mr-1.5 text-[#01796F]" />
                  Participants
                </label>
                <div className="flex items-center h-11 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-700">
                  <button
                    type="button"
                    onClick={() => setTravelers((v) => Math.max(1, v - 1))}
                    disabled={travelers <= 1}
                    className="w-10 h-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-bold text-sm text-slate-900 dark:text-white">
                    {travelers} pers.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTravelers((v) => Math.min(20, v + 1))}
                    disabled={travelers >= 20}
                    className="w-10 h-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

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
          {/* Category Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Toutes les activités', value: 'ALL' },
              { label: 'Aventure & Désert', value: 'Aventure' },
              { label: 'Sports Nautiques', value: 'Sports' },
              { label: 'Culture & Médina', value: 'Culture' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategory(tab.value)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: category === tab.value ? '#01796F' : 'var(--card, #eee)',
                  color: category === tab.value ? '#fff' : 'var(--text, #333)',
                  boxShadow: category === tab.value ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

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
                      style={{
                        background: 'var(--card, #fff)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                        <SafeEntityImage
                          src={act.imageUrl}
                          alt={act.title}
                          entityType="ACTIVITY"
                          className="w-full h-full object-cover"
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: isCustom ? '#D97706' : '#01796F',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                          }}
                        >
                          {isCustom ? 'Yuding Sélect' : 'Partenaire HBX'}
                        </span>
                      </div>

                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#01796F', textTransform: 'uppercase' }}>
                            {act.category || 'Excursion'}
                          </span>
                          {act.durationHours && (
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>
                              <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>
                              {act.durationHours}h
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: '1.4' }}>
                          {act.title}
                        </h3>
                        <p
                          style={{
                            color: '#666',
                            fontSize: '0.88rem',
                            marginBottom: '1.25rem',
                            lineHeight: '1.5',
                            flexGrow: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {act.description}
                        </p>

                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F' }}>
                              <PriceDisplay conversion={act.priceConversion} amount={act.price} currency={act.currency} />
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}> / pers.</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Link
                              href={`/activities/${encodeURIComponent(offerKey)}`}
                              style={{
                                padding: '0.6rem 0.95rem',
                                borderRadius: '6px',
                                border: '1.5px solid #01796F',
                                color: '#01796F',
                                background: '#fff',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              Détails
                            </Link>
                            <Link
                              href={`/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(offerKey)}&serviceTitle=${encodeURIComponent(act.title)}&price=${act.price}`}
                              className="btn-booking"
                              style={{
                                padding: '0.65rem 1.15rem',
                                borderRadius: '6px',
                                backgroundColor: '#01796F',
                                color: '#fff',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
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
    </div>
  );
}
