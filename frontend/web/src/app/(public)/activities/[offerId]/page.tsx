'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getOfferDetail } from '@/lib/offer-store';
import type { ActivityOffer } from '@/types/travel.types';
import { SafeEntityImage } from '@/components/travel/SafeEntityImage';
import {
  OfferDetailsShell,
  OfferDetailsHeader,
  OfferPricePanel,
  ConditionList,
  OfferExpiredState,
  DetailLoadingSkeleton,
  type ConditionItem,
} from '@/components/travel/details';

export default function ActivityDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityOffer | null>(null);

  useEffect(() => {
    if (offerId) {
      const resolved = getOfferDetail<ActivityOffer>('ACTIVITY', offerId);
      setActivity(resolved);
    }
    setLoading(false);
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

    // Source / Provenance
    const isCustom = activity.source === 'YUDING_CUSTOM';
    items.push({
      icon: 'fas fa-shield-alt',
      title: 'Source de l\'activité',
      description: isCustom ? 'Activité sélectionnée par Yuding' : `Partenaire ${activity.provider || 'HBX'}`,
      status: 'neutral',
    });

    return items;
  }, [activity]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!activity) {
    return (
      <div style={{ padding: '2rem 1rem' }}>
        <OfferExpiredState
          productLabel="cette activité"
          searchHref="/activities"
          searchLabel="Retourner à la recherche d'activités"
        />
      </div>
    );
  }

  const isCustom = activity.source === 'YUDING_CUSTOM';
  const bookingUrl = `/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(
    activity.offerId || activity.id || activity.title
  )}&serviceTitle=${encodeURIComponent(activity.title)}&price=${activity.price}`;

  const badges = [activity.category || 'Excursion', isCustom ? 'Yuding Sélect' : 'Partenaire HBX'];

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tarif par personne</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#01796F' }}>
              {activity.price} {activity.currency}
            </div>
          </div>
          <a
            href={bookingUrl}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              background: '#01796F',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
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
        provider={activity.provider || (isCustom ? 'YUDING' : 'HBX')}
        badges={badges}
      />

      {/* Activity Image (Authoritative Provider or Curated Asset) */}
      <div
        style={{
          background: 'var(--card, #ffffff)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ height: '320px', position: 'relative', width: '100%', background: '#e2e8f0' }}>
          <SafeEntityImage
            src={activity.imageUrl}
            alt={activity.title}
            entityType="ACTIVITY"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Description Section */}
      {activity.description && (
        <div
          style={{
            background: 'var(--card, #ffffff)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text, #0f172a)' }}>
            Description de l&apos;expérience
          </h3>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {activity.description}
          </p>
        </div>
      )}

      {/* Conditions & Details */}
      <ConditionList
        title="Détails pratiques & Conditions"
        items={conditions}
      />
    </OfferDetailsShell>
  );
}
