'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getOfferDetail } from '@/lib/offer-store';
import type { TransferOffer } from '@/types/travel.types';
import {
  isPrivateTransfer,
  isSharedNavette,
  isMinibusOrRental,
} from '@/lib/transfer-filters';
import {
  OfferDetailsShell,
  OfferDetailsHeader,
  OfferPricePanel,
  RouteTimeline,
  ConditionList,
  OfferExpiredState,
  DetailLoadingSkeleton,
  type TimelineSegment,
  type ConditionItem,
} from '@/components/travel/details';

export default function TransferDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<TransferOffer | null>(null);

  useEffect(() => {
    if (offerId) {
      const resolved = getOfferDetail<TransferOffer>('TRANSFER', offerId);
      setTransfer(resolved);
    }
    setLoading(false);
  }, [offerId]);

  const categoryInfo = useMemo(() => {
    if (!transfer) return { label: 'Transfert', icon: 'fas fa-car' };
    if (isSharedNavette(transfer)) {
      return { label: 'Navette Partagée', icon: 'fas fa-bus' };
    }
    if (isMinibusOrRental(transfer)) {
      return { label: 'Minibus & Van', icon: 'fas fa-shuttle-van' };
    }
    return { label: 'Transfert Privé / VTC', icon: 'fas fa-taxi' };
  }, [transfer]);

  const timelineSegments = useMemo<TimelineSegment[]>(() => {
    if (!transfer) return [];
    return [
      {
        origin: transfer.pickup || 'Point de prise en charge',
        originDetail: transfer.departureCity ? `Zone: ${transfer.departureCity}` : undefined,
        departureTime: transfer.time || undefined,
        destination: transfer.dropoff || 'Point de dépose',
        destinationDetail: transfer.arrivalCity ? `Zone: ${transfer.arrivalCity}` : undefined,
        carrierName: transfer.vehicleModel || categoryInfo.label,
        mode: categoryInfo.label,
      },
    ];
  }, [transfer, categoryInfo]);

  const conditions = useMemo<ConditionItem[]>(() => {
    if (!transfer) return [];
    const items: ConditionItem[] = [];

    // Capacity
    if (transfer.capacity != null) {
      items.push({
        icon: 'fas fa-users',
        title: 'Capacité passagers',
        description: `Jusqu'à ${transfer.capacity} passager(s)`,
        status: 'neutral',
      });
    }

    // Vehicle model
    if (transfer.vehicleModel) {
      items.push({
        icon: 'fas fa-car-side',
        title: 'Modèle de véhicule',
        description: transfer.vehicleModel,
        status: 'neutral',
      });
    }

    // Date & Time
    if (transfer.date || transfer.time) {
      items.push({
        icon: 'fas fa-calendar-check',
        title: 'Prise en charge prévue',
        description: `${transfer.date || ''} à ${transfer.time || 'heure convenue'}`,
        status: 'neutral',
      });
    }

    // Provider provenance
    if (transfer.provider) {
      items.push({
        icon: 'fas fa-shield-alt',
        title: 'Partenaire de transport',
        description: `Réservation opérée via le réseau partenaire ${transfer.provider}`,
        status: 'neutral',
      });
    }

    return items;
  }, [transfer]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!transfer) {
    return (
      <div style={{ padding: '2rem 1rem' }}>
        <OfferExpiredState
          productLabel="ce transfert"
          searchHref="/transfers"
          searchLabel="Retourner à la recherche de transferts"
        />
      </div>
    );
  }

  const selRef = transfer.selectionRef || transfer.offerId || transfer.id || `trf-${transfer.price}`;
  const bookingUrl = `/booking?serviceType=TRANSFER&serviceId=${encodeURIComponent(
    transfer.offerId || transfer.id || `trf-${transfer.price}`
  )}&selectionRef=${encodeURIComponent(selRef)}&serviceTitle=${encodeURIComponent(transfer.vehicleModel || 'Transfert')}&price=${transfer.price}`;

  const badges = [categoryInfo.label];
  if (transfer.capacity) badges.push(`${transfer.capacity} places`);

  return (
    <OfferDetailsShell
      backHref="/transfers"
      backLabel="Retour aux résultats de transferts"
      sidebar={
        <OfferPricePanel
          amount={transfer.price}
          currency={transfer.currency}
          conversion={transfer.priceConversion}
          unitLabel="par trajet"
          bookingHref={bookingUrl}
          bookingLabel="Sélectionner ce transfert"
        />
      }
      mobileAction={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tarif par trajet</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#01796F' }}>
              {transfer.price} {transfer.currency}
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
        title={`${transfer.pickup || 'Départ'} → ${transfer.dropoff || 'Arrivée'}`}
        subtitle={`${transfer.vehicleModel || categoryInfo.label} • ${transfer.date ? `Le ${transfer.date}` : ''} ${transfer.time ? `à ${transfer.time}` : ''}`}
        icon={categoryInfo.icon}
        provider={transfer.provider || 'HBX'}
        badges={badges}
      />

      {/* Point-to-point Route Timeline */}
      <RouteTimeline
        title="Détails du trajet de transfert"
        segments={timelineSegments}
      />

      {/* Conditions & Information */}
      <ConditionList
        title="Véhicule & Conditions de prise en charge"
        items={conditions}
      />
    </OfferDetailsShell>
  );
}
