'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { libraryService } from '@/services/library.service';
import type {
  FavoriteItem,
  SavedTripItem,
  RecentSearchItem,
  RecentViewItem,
  FavoriteResourceType,
} from '@/types/library.types';
import FavoriteButton from '@/components/common/FavoriteButton';

type ActiveTab = 'favorites' | 'saved-trips' | 'recent-searches' | 'recent-views';

export default function FavoritesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') as ActiveTab;
  const initialTab: ActiveTab = ['favorites', 'saved-trips', 'recent-searches', 'recent-views'].includes(tabParam)
    ? tabParam
    : 'favorites';

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [favoriteFilter, setFavoriteFilter] = useState<'ALL' | FavoriteResourceType>('ALL');

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [savedTrips, setSavedTrips] = useState<SavedTripItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [recentViews, setRecentViews] = useState<RecentViewItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state when URL param changes
  useEffect(() => {
    if (tabParam && ['favorites', 'saved-trips', 'recent-searches', 'recent-views'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const setTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/account/favorites?tab=${tab}`);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [favs, trips, searches, views] = await Promise.all([
        libraryService.getFavorites().catch(() => []),
        libraryService.getSavedTrips().catch(() => []),
        libraryService.getRecentSearches().catch(() => []),
        libraryService.getRecentViews().catch(() => []),
      ]);
      setFavorites(favs);
      setSavedTrips(trips);
      setRecentSearches(searches);
      setRecentViews(views);
    } catch {
      setError('Impossible de charger vos données de voyage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handlers
  const handleRemoveFavorite = (favRef: string) => {
    setFavorites(prev => prev.filter(f => f.publicReference !== favRef));
  };

  const handleUnsaveTrip = async (savedTripRef: string) => {
    try {
      await libraryService.unsaveTrip(savedTripRef);
      setSavedTrips(prev => prev.filter(t => t.publicReference !== savedTripRef));
    } catch (err) {
      console.error('Failed to unsave trip:', err);
    }
  };

  const handleDeleteSearch = async (searchRef: string) => {
    try {
      await libraryService.deleteRecentSearch(searchRef);
      setRecentSearches(prev => prev.filter(s => s.publicReference !== searchRef));
    } catch (err) {
      console.error('Failed to delete search:', err);
    }
  };

  const handleClearSearches = async () => {
    if (!window.confirm('Voulez-vous vraiment effacer tout votre historique de recherche ?')) return;
    try {
      await libraryService.clearRecentSearches();
      setRecentSearches([]);
    } catch (err) {
      console.error('Failed to clear searches:', err);
    }
  };

  const handleDeleteView = async (viewRef: string) => {
    try {
      await libraryService.deleteRecentView(viewRef);
      setRecentViews(prev => prev.filter(v => v.publicReference !== viewRef));
    } catch (err) {
      console.error('Failed to delete view:', err);
    }
  };

  const handleClearViews = async () => {
    if (!window.confirm('Voulez-vous vraiment effacer vos dernières consultations ?')) return;
    try {
      await libraryService.clearRecentViews();
      setRecentViews([]);
    } catch (err) {
      console.error('Failed to clear views:', err);
    }
  };

  // Build rerun URL for recent searches
  const getSearchRerunUrl = (search: RecentSearchItem): string => {
    const p = search.criteriaPayload || {};
    const type = (search.searchType || '').toUpperCase();
    if (type.includes('FLIGHT')) {
      return `/vols?origin=${encodeURIComponent(search.origin || p.origin || '')}&destination=${encodeURIComponent(search.destination || p.destination || '')}&departureDate=${encodeURIComponent(search.departureDate || p.departureDate || '')}`;
    }
    if (type.includes('HOTEL')) {
      return `/hotels?destination=${encodeURIComponent(search.destination || p.destination || p.city || '')}&checkIn=${encodeURIComponent(search.departureDate || p.checkInDate || '')}&checkOut=${encodeURIComponent(search.returnDate || p.checkOutDate || '')}`;
    }
    if (type.includes('ACTIVIT')) {
      return `/activities?city=${encodeURIComponent(search.destination || p.city || p.destination || '')}`;
    }
    if (type.includes('TRIP')) {
      return `/planifier?origin=${encodeURIComponent(search.origin || p.origin || '')}&destination=${encodeURIComponent(search.destination || p.destination || '')}`;
    }
    return '/';
  };

  // Format relative date
  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const filteredFavorites = favorites.filter(f => favoriteFilter === 'ALL' || f.resourceType === favoriteFilter);

  return (
    <main className="account-empty-page" style={{ maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <header className="account-page-header">
        <div>
          <p className="account-kicker">VOTRE BIBLIOTHÈQUE VOYAGEUR</p>
          <h1>Mes favoris &amp; Historique</h1>
          <p>Retrouvez vos hébergements coups de cœur, voyages planifiés et recherches récentes.</p>
        </div>
        <span className="account-header-mark favorite">
          <i className="fas fa-bookmark" aria-hidden="true" />
        </span>
      </header>

      {/* Tabs navigation */}
      <nav className="library-tabs-nav" aria-label="Sections de la bibliothèque">
        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={`library-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
        >
          <i className="fas fa-heart" aria-hidden="true" />
          <span>Coups de cœur</span>
          <span className="library-tab-count">{favorites.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('saved-trips')}
          className={`library-tab-btn ${activeTab === 'saved-trips' ? 'active' : ''}`}
        >
          <i className="fas fa-suitcase-rolling" aria-hidden="true" />
          <span>Voyages enregistrés</span>
          <span className="library-tab-count">{savedTrips.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('recent-searches')}
          className={`library-tab-btn ${activeTab === 'recent-searches' ? 'active' : ''}`}
        >
          <i className="fas fa-search" aria-hidden="true" />
          <span>Recherches récentes</span>
          <span className="library-tab-count">{recentSearches.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('recent-views')}
          className={`library-tab-btn ${activeTab === 'recent-views' ? 'active' : ''}`}
        >
          <i className="fas fa-history" aria-hidden="true" />
          <span>Consultés récemment</span>
          <span className="library-tab-count">{recentViews.length}</span>
        </button>
      </nav>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true" />
          <p style={{ marginTop: '12px', fontSize: '15px' }}>Chargement de vos données...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#991b1b', marginBottom: '24px' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* TAB 1: FAVORIS */}
          {activeTab === 'favorites' && (
            <section aria-labelledby="tab-fav-heading">
              <h2 id="tab-fav-heading" className="sr-only">Mes coups de cœur</h2>

              {/* Sub-filters */}
              {favorites.length > 0 && (
                <div className="library-subfilters">
                  <button
                    type="button"
                    className={`library-subfilter-btn ${favoriteFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFavoriteFilter('ALL')}
                  >
                    Tous ({favorites.length})
                  </button>
                  <button
                    type="button"
                    className={`library-subfilter-btn ${favoriteFilter === 'HOTEL' ? 'active' : ''}`}
                    onClick={() => setFavoriteFilter('HOTEL')}
                  >
                    Hôtels ({favorites.filter(f => f.resourceType === 'HOTEL').length})
                  </button>
                  <button
                    type="button"
                    className={`library-subfilter-btn ${favoriteFilter === 'ACTIVITY' ? 'active' : ''}`}
                    onClick={() => setFavoriteFilter('ACTIVITY')}
                  >
                    Activités ({favorites.filter(f => f.resourceType === 'ACTIVITY').length})
                  </button>
                  <button
                    type="button"
                    className={`library-subfilter-btn ${favoriteFilter === 'DESTINATION' ? 'active' : ''}`}
                    onClick={() => setFavoriteFilter('DESTINATION')}
                  >
                    Destinations ({favorites.filter(f => f.resourceType === 'DESTINATION').length})
                  </button>
                </div>
              )}

              {filteredFavorites.length === 0 ? (
                <section className="account-empty-panel" aria-labelledby="favorites-empty-title">
                  <div className="account-empty-icon favorite">
                    <i className="fas fa-heart" aria-hidden="true" />
                  </div>
                  <div className="account-empty-copy">
                    <p className="account-kicker">VOTRE LISTE D&apos;ENVIES</p>
                    <h2 id="favorites-empty-title">Aucun favori enregistré</h2>
                    <p>Explorez nos hébergements, trajets et activités, puis ajoutez vos coups de cœur pour les retrouver rapidement.</p>
                  </div>
                  <Link href="/hotels" className="account-primary-action favorite">
                    <i className="fas fa-bed" aria-hidden="true" /> Découvrir les hébergements
                  </Link>
                </section>
              ) : (
                <div className="library-grid">
                  {filteredFavorites.map(fav => {
                    const viewUrl = fav.resourceType === 'HOTEL'
                      ? `/hotels/${fav.resourceReference}`
                      : fav.resourceType === 'ACTIVITY'
                      ? `/activities/${fav.resourceReference}`
                      : `/destinations/${fav.resourceReference}`;

                    return (
                      <article key={fav.publicReference} className="library-card">
                        <div className="library-card-img-wrap">
                          <img
                            src={fav.thumbnailUrl || '/images/destination-placeholder.jpg'}
                            alt={fav.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/destination-placeholder.jpg';
                            }}
                          />
                          <span className="library-card-type-badge">
                            {fav.resourceType === 'HOTEL' ? 'Hôtel' : fav.resourceType === 'ACTIVITY' ? 'Activité' : 'Destination'}
                          </span>
                          <div className="library-card-fav-btn">
                            <FavoriteButton
                              resourceType={fav.resourceType}
                              resourceReference={fav.resourceReference}
                              title={fav.title}
                              destination={fav.destination}
                              thumbnailUrl={fav.thumbnailUrl}
                              providerLabel={fav.providerLabel}
                              priceSnapshot={fav.priceSnapshot}
                              currencySnapshot={fav.currencySnapshot}
                              isInitiallyFavorited={true}
                              onToggle={(active: boolean) => {
                                if (!active) handleRemoveFavorite(fav.publicReference);
                              }}
                            />
                          </div>
                        </div>

                        <div className="library-card-body">
                          <h3 className="library-card-title">{fav.title}</h3>
                          <p className="library-card-subtitle">
                            <i className="fas fa-map-marker-alt" aria-hidden="true" />
                            <span>{fav.destination || 'Maroc'}</span>
                          </p>

                          <div className="library-card-footer">
                            <div className="library-price-display">
                              {fav.priceSnapshot != null ? (
                                <>
                                  <span className="library-price-amount">
                                    {fav.priceSnapshot} {fav.currencySnapshot || 'MAD'}
                                  </span>
                                  {fav.capturedAt && (
                                    <span className="library-price-note">
                                      Prix observé le {new Date(fav.capturedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="library-price-note">Tarif selon disponibilité</span>
                              )}
                            </div>

                            <Link href={viewUrl} className="btn-secondary-sm">
                              Voir l&apos;offre <i className="fas fa-arrow-right" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 2: VOYAGES ENREGISTRÉS */}
          {activeTab === 'saved-trips' && (
            <section aria-labelledby="tab-trips-heading">
              <h2 id="tab-trips-heading" className="sr-only">Voyages enregistrés</h2>

              {savedTrips.length === 0 ? (
                <section className="account-empty-panel">
                  <div className="account-empty-icon favorite" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <i className="fas fa-suitcase-rolling" aria-hidden="true" />
                  </div>
                  <div className="account-empty-copy">
                    <p className="account-kicker">PLANS DE VOYAGE</p>
                    <h2>Aucun voyage enregistré</h2>
                    <p>Créez des itinéraires sur mesure avec notre planificateur intelligent et retrouvez-les ici.</p>
                  </div>
                  <Link href="/planifier" className="account-primary-action favorite">
                    <i className="fas fa-magic" aria-hidden="true" /> Créer un itinéraire avec l&apos;IA
                  </Link>
                </section>
              ) : (
                <div className="library-grid">
                  {savedTrips.map(trip => (
                    <article key={trip.publicReference} className="library-card">
                      <div className="library-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7' }}>
                            ENREGISTRÉ
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{trip.tripPlanReference}</span>
                        </div>

                        <h3 className="library-card-title" style={{ fontSize: '18px', marginTop: '4px' }}>
                          {trip.title || `${trip.originCity || 'Origine'} → ${trip.destinationCity || 'Destination'}`}
                        </h3>

                        <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px', margin: '14px 0' }}>
                          {trip.startDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="far fa-calendar-alt" aria-hidden="true" />
                              <span>{trip.startDate} → {trip.endDate || ''}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-users" aria-hidden="true" />
                            <span>{trip.travelersCount || 1} voyageur(s)</span>
                          </div>
                        </div>

                        <div className="library-card-footer">
                          <div className="library-price-display">
                            {trip.budgetAmount ? (
                              <>
                                <span className="library-price-amount">
                                  {trip.budgetAmount} {trip.budgetCurrency || 'MAD'}
                                </span>
                                <span className="library-price-note">Budget planifié</span>
                              </>
                            ) : (
                              <span className="library-price-note">Itinéraire personnalisé</span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleUnsaveTrip(trip.publicReference)}
                              className="btn-danger-ghost"
                              title="Retirer des voyages enregistrés"
                              aria-label="Retirer des voyages enregistrés"
                            >
                              <i className="fas fa-trash-alt" aria-hidden="true" />
                            </button>
                            <Link href={`/planifier?tripRef=${trip.tripPlanReference}`} className="btn-primary-sm">
                              Ouvrir <i className="fas fa-arrow-right" aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: RECHERCHES RÉCENTES */}
          {activeTab === 'recent-searches' && (
            <section aria-labelledby="tab-searches-heading">
              <div className="library-header-actions">
                <h2 id="tab-searches-heading" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Vos dernières recherches ({recentSearches.length})
                </h2>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSearches}
                    className="btn-secondary-sm"
                    style={{ color: '#ef4444' }}
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true" /> Tout effacer
                  </button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <section className="account-empty-panel">
                  <div className="account-empty-icon favorite" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <i className="fas fa-search" aria-hidden="true" />
                  </div>
                  <div className="account-empty-copy">
                    <p className="account-kicker">HISTORIQUE DE RECHERCHE</p>
                    <h2>Aucune recherche récente</h2>
                    <p>Vos critères de recherche seront automatiquement conservés ici pour vous faire gagner du temps.</p>
                  </div>
                  <Link href="/vols" className="account-primary-action favorite">
                    <i className="fas fa-plane-departure" aria-hidden="true" /> Rechercher des vols
                  </Link>
                </section>
              ) : (
                <div className="library-list">
                  {recentSearches.map(item => {
                    const searchTitle = item.origin && item.destination
                      ? `${item.origin} → ${item.destination}`
                      : item.destination || item.origin || 'Recherche de voyage';
                    const searchSubtitle = [
                      item.departureDate && `${item.departureDate}${item.returnDate ? ` → ${item.returnDate}` : ''}`,
                      item.travelersCount && `${item.travelersCount} voyageur(s)`,
                    ].filter(Boolean).join(' • ');

                    const rerunUrl = getSearchRerunUrl(item);

                    return (
                      <div key={item.publicReference} className="library-list-item">
                        <div className="library-item-content">
                          <div className="library-item-main">
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                              {item.searchType}
                            </span>
                            <span className="library-item-title">{searchTitle}</span>
                            {item.isExpired && (
                              <span className="library-badge-expired">
                                <i className="fas fa-clock" style={{ marginRight: '4px' }} /> Dates expirées
                              </span>
                            )}
                          </div>

                          <div className="library-item-details">
                            {searchSubtitle && <span>{searchSubtitle}</span>}
                            <span>• Effectuée {formatRelativeTime(item.lastSearchedAt || item.createdAt)}</span>
                          </div>
                        </div>

                        <div className="library-item-actions">
                          <button
                            type="button"
                            onClick={() => handleDeleteSearch(item.publicReference)}
                            className="btn-danger-ghost"
                            title="Supprimer cette recherche"
                            aria-label="Supprimer cette recherche"
                          >
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                          <Link href={rerunUrl} className="btn-secondary-sm">
                            <i className="fas fa-redo-alt" aria-hidden="true" /> Relancer
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: CONSULTÉS RÉCEMMENT */}
          {activeTab === 'recent-views' && (
            <section aria-labelledby="tab-views-heading">
              <div className="library-header-actions">
                <h2 id="tab-views-heading" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  Vos consultations récentes ({recentViews.length})
                </h2>
                {recentViews.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearViews}
                    className="btn-secondary-sm"
                    style={{ color: '#ef4444' }}
                  >
                    <i className="fas fa-trash-alt" aria-hidden="true" /> Tout effacer
                  </button>
                )}
              </div>

              {recentViews.length === 0 ? (
                <section className="account-empty-panel">
                  <div className="account-empty-icon favorite" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                    <i className="fas fa-eye" aria-hidden="true" />
                  </div>
                  <div className="account-empty-copy">
                    <p className="account-kicker">HISTORIQUE DE NAVIGATION</p>
                    <h2>Aucune consultation récente</h2>
                    <p>Les fiches d&apos;hôtels et d&apos;activités que vous consultez apparaîtront ici pour une reprise rapide.</p>
                  </div>
                  <Link href="/hotels" className="account-primary-action favorite">
                    <i className="fas fa-compass" aria-hidden="true" /> Explorer le catalogue
                  </Link>
                </section>
              ) : (
                <div className="library-list">
                  {recentViews.map(view => {
                    const itemUrl = view.resourceType === 'HOTEL'
                      ? `/hotels/${view.resourceReference}`
                      : view.resourceType === 'ACTIVITY'
                      ? `/activities/${view.resourceReference}`
                      : `/destinations/${view.resourceReference}`;

                    return (
                      <div key={view.publicReference} className="library-list-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexGrow: 1, minWidth: 0 }}>
                          {view.thumbnailUrl && (
                            <img
                              src={view.thumbnailUrl}
                              alt={view.title}
                              style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}

                          <div className="library-item-content">
                            <div className="library-item-main">
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                                {view.resourceType === 'HOTEL' ? 'Hôtel' : view.resourceType === 'ACTIVITY' ? 'Activité' : 'Destination'}
                              </span>
                              <span className="library-item-title">{view.title}</span>
                            </div>

                            <div className="library-item-details">
                              {view.destination && <span>{view.destination}</span>}
                              <span>• Consulté {formatRelativeTime(view.lastViewedAt || view.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="library-item-actions">
                          <button
                            type="button"
                            onClick={() => handleDeleteView(view.publicReference)}
                            className="btn-danger-ghost"
                            title="Supprimer cette consultation"
                            aria-label="Supprimer cette consultation"
                          >
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                          <Link href={itemUrl} className="btn-secondary-sm">
                            Consulter <i className="fas fa-arrow-right" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Help / Footer suggestion row */}
      <section className="account-help-row" style={{ marginTop: '40px' }}>
        <div>
          <strong>Une destination vous tente déjà&nbsp;?</strong>
          <span>Composez votre prochaine escapade ou demandez à l&apos;IA de vous préparer un séjour sur mesure.</span>
        </div>
        <Link href="/planifier">
          Planifier un voyage <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
