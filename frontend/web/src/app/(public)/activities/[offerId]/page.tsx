'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getOfferDetail } from '@/lib/offer-store';
import type { ActivityOffer } from '@/types/travel.types';
import { travelService } from '@/services/travel.service';
import { SafeEntityImage } from '@/components/travel/SafeEntityImage';
import { libraryService } from '@/services/library.service';
import FavoriteButton from '@/components/common/FavoriteButton';
import { EntityReviews } from '@/components/travel/EntityReviews';
import {
  OfferDetailsShell,
  OfferDetailsHeader,
  OfferPricePanel,
  ConditionList,
  DetailLoadingSkeleton,
  type ConditionItem,
} from '@/components/travel/details';

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ActivityDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityOffer | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [destination, setDestination] = useState('');
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const showActivity = (resolved: ActivityOffer) => {
    setActivity(resolved);
    const ref = resolved.id || resolved.offerId || offerId;
    libraryService.recordRecentView({
      resourceType: 'ACTIVITY', resourceReference: ref, title: resolved.title,
      destination: `${resolved.destination || resolved.city || ''} ${resolved.country ? `• ${resolved.country}` : ''}`,
      thumbnailUrl: resolved.imageUrl, providerLabel: resolved.provider || 'HBX',
    }).catch(() => {});
    libraryService.getFavorites().then(favs =>
      setIsFavorited(favs.some(fav => fav.resourceType === 'ACTIVITY' && fav.resourceReference === ref))
    ).catch(() => {});
  };

  const refreshActivity = async (city: string) => {
    if (!city.trim()) {
      setRefreshError('Indiquez une destination pour actualiser cette activité.');
      return;
    }
    setLoading(true);
    setRefreshError(null);
    try {
      const data = await travelService.searchActivities({ destination: city.trim() });
      const current = data.results?.find(item => (item.id || item.offerId) === offerId);
      if (current) showActivity(current);
      else setRefreshError(data.status === 'PROVIDER_UNAVAILABLE'
        ? (data.message && !data.message.includes('No live') && !data.message.includes('Phase')
            ? data.message
            : 'Le fournisseur d’activités est temporairement indisponible.')
        : 'Cette activité n’est plus disponible pour cette destination.');
    } catch {
      setRefreshError('Impossible d’actualiser cette activité pour le moment. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!offerId) return;
    const resolved = getOfferDetail<ActivityOffer>('ACTIVITY', offerId);
    if (resolved) {
      showActivity(resolved);
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([libraryService.getFavorites(), libraryService.getRecentViews()]).then(([favs, views]) => {
      if (cancelled) return;
      const known = favs.find(fav => fav.resourceType === 'ACTIVITY' && fav.resourceReference === offerId)
        || views.find(view => view.resourceType === 'ACTIVITY' && view.resourceReference === offerId);
      const city = known?.destination?.split(/[•,]/)[0].trim() || '';
      setDestination(city);
      setIsFavorited(favs.some(fav => fav.resourceType === 'ACTIVITY' && fav.resourceReference === offerId));
      if (city) void refreshActivity(city);
      else setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [offerId]);

  const conditions = useMemo<ConditionItem[]>(() => {
    if (!activity) return [];
    const items: ConditionItem[] = [];

    // Duration
    if (activity.durationHours) {
      items.push({
        icon: 'fas fa-clock',
        title: 'Durée estimée',
        description: `${activity.durationHours} heure(s) d'activité`,
        status: 'neutral',
      });
    }

    // Category
    if (activity.category) {
      items.push({
        icon: 'fas fa-tag',
        title: 'Catégorie d\'activité',
        description: activity.category,
        status: 'neutral',
      });
    }

    items.push({
      icon: 'fas fa-shield-alt',
      title: 'Source de l\'activité',
      description: `Partenaire ${activity.provider || 'HBX'}`,
      status: 'neutral',
    });

    return items;
  }, [activity]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!activity) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-slate-800 dark:text-slate-100">
        <h1 className="text-2xl font-bold">Cette activité n’est plus disponible.</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Actualisez les informations auprès du fournisseur avant de réserver.</p>
        <label className="mt-6 block text-sm font-medium">Destination
          <input value={destination} onChange={event => setDestination(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-[#062523] dark:text-white" />
        </label>
        {refreshError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{refreshError}</p>}
        <button type="button" onClick={() => void refreshActivity(destination)} className="mt-4 rounded-lg bg-[#01796F] px-4 py-2 text-sm font-semibold text-white">Actualiser l’activité</button>
        <div className="mt-8"><EntityReviews type="ACTIVITY" provider="HBX" reference={offerId} /></div>
      </main>
    );
  }

  const selRef = activity.selectionRef || activity.offerId || activity.id || activity.title;
  const bookingUrl = `/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(
    activity.offerId || activity.id || activity.title
  )}&selectionRef=${encodeURIComponent(selRef)}&serviceTitle=${encodeURIComponent(activity.title)}&price=${activity.price}&currency=${encodeURIComponent(activity.currency || 'EUR')}&startDate=${activity.date || ''}&travelers=${activity.travelers || 1}`;

  const badges = [activity.category || 'Excursion', `Partenaire ${activity.provider || 'HBX'}`];

  return (
    <OfferDetailsShell
      backHref="/activities"
      backLabel="Retour aux résultats d'activités"
      sidebar={
        <OfferPricePanel
          amount={activity.price}
          currency={activity.currency}
          conversion={activity.priceConversion}
          unitLabel="par participant"
          bookingHref={bookingUrl}
          bookingLabel="Sélectionner cette activité"
        />
      }
      mobileAction={
        <div className="travel-details-mobile-action__inner flex items-center justify-between gap-3">
          <div>
            <div className="travel-details-mobile-action__label text-xs">Tarif par personne</div>
            <div className="travel-details-mobile-action__price text-xl font-extrabold">
              {activity.price} {activity.currency}
            </div>
          </div>
          <a href={bookingUrl} className="travel-details-mobile-action__link rounded-lg px-5 py-2.5 text-sm font-bold">
            Sélectionner
          </a>
        </div>
      }
    >
      {/* Header */}
      <OfferDetailsHeader
        title={activity.title}
        subtitle={`${activity.destination || activity.city || ''} ${activity.country ? `• ${activity.country}` : ''}`}
        icon="fas fa-hiking"
        provider={activity.provider || 'HBX'}
        badges={badges}
      />

      {/* Activity Image (Authoritative Provider or Curated Asset) */}
      <div className="travel-details-media">
        <div className="travel-details-media__frame relative h-[320px] w-full">
          <SafeEntityImage
            src={activity.imageUrl}
            alt={activity.title}
            entityType="ACTIVITY"
            className="w-full h-full object-cover"
          />
          <div className="travel-details-media__favorite">
            <FavoriteButton
              resourceType="ACTIVITY"
              resourceReference={activity.id || offerId}
              title={activity.title}
              destination={`${activity.destination || activity.city || ''} ${activity.country ? `• ${activity.country}` : ''}`}
              thumbnailUrl={activity.imageUrl}
              providerLabel={activity.provider || 'HBX'}
              priceSnapshot={activity.price}
              currencySnapshot={activity.currency}
              isInitiallyFavorited={isFavorited}
              onToggle={(fav) => setIsFavorited(fav)}
            />
          </div>
        </div>
      </div>

      {/* Description Section */}
      {activity.description && (
        <div className="travel-details-description">
          <h3 className="mb-3 text-lg font-bold">
            Description de l&apos;expérience
          </h3>
          <p className="m-0 text-base leading-7 whitespace-pre-line">
            {stripHtml(activity.description)}
          </p>
        </div>
      )}

      {/* Conditions & Details */}
      <ConditionList
        title="Détails pratiques & Conditions"
        items={conditions}
      />
      <EntityReviews type="ACTIVITY" provider={activity.provider || 'HBX'} reference={activity.offerId || activity.id || offerId} />
    </OfferDetailsShell>
  );
}
