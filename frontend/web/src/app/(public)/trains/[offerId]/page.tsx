'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getOfferDetail } from '@/lib/offer-store';
import type { TrainOffer, TrainLeg } from '@/types/travel.types';
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

export default function TrainDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [train, setTrain] = useState<TrainOffer | null>(null);

  useEffect(() => {
    if (offerId) {
      const resolved = getOfferDetail<TrainOffer>('TRAIN', offerId);
      setTrain(resolved);
    }
    setLoading(false);
  }, [offerId]);

  const durationLabel = useMemo(() => {
    if (!train?.durationMinutes) return undefined;
    const h = Math.floor(train.durationMinutes / 60);
    const m = train.durationMinutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }, [train]);

  const isTransitous = train?.provider === 'TRANSITOUS';
  const hasTransfers = (train?.numberOfTransfers ?? 0) > 0;

  const timelineSegments = useMemo<TimelineSegment[]>(() => {
    if (!train) return [];

    if (train.legs && train.legs.length > 0) {
      return train.legs.map((leg: TrainLeg, idx: number) => {
        const legDuration = leg.durationMinutes
          ? `${Math.floor(leg.durationMinutes / 60)}h ${leg.durationMinutes % 60}m`
          : undefined;

        let layoverAfter: string | undefined;
        if (idx < train.legs!.length - 1) {
          const nextLeg = train.legs![idx + 1];
          layoverAfter = `Correspondance à ${leg.destination} (prochain départ vers ${nextLeg.destination})`;
        }

        return {
          origin: leg.origin || train.originStation,
          departureTime: leg.departureTime ? leg.departureTime.substring(0, 5) : undefined,
          destination: leg.destination || train.destinationStation,
          arrivalTime: leg.arrivalTime ? leg.arrivalTime.substring(0, 5) : undefined,
          durationLabel: legDuration,
          carrierName: leg.operator || leg.serviceName || train.operator,
          flightOrTrainNumber: leg.serviceName,
          mode: leg.mode,
          layoverAfter,
          intermediateStops: leg.intermediateStops?.map((s) => ({
            stationName: s.stationName,
            departureTime: s.departureTime ? s.departureTime.substring(0, 5) : undefined,
          })),
        };
      });
    }

    // Direct single train
    return [
      {
        origin: train.originStation,
        departureTime: train.departureTime ? train.departureTime.substring(0, 5) : undefined,
        destination: train.destinationStation,
        arrivalTime: train.arrivalTime ? train.arrivalTime.substring(0, 5) : undefined,
        durationLabel,
        carrierName: train.operator,
        flightOrTrainNumber: train.trainNumber,
        intermediateStops: train.intermediateStops?.map((s) => ({
          stationName: s.stationName,
          departureTime: s.departureTime ? s.departureTime.substring(0, 5) : undefined,
        })),
      },
    ];
  }, [train, durationLabel]);

  const conditions = useMemo<ConditionItem[]>(() => {
    if (!train) return [];
    const items: ConditionItem[] = [];

    // Service & Schedule source
    if (isTransitous) {
      items.push({
        icon: 'fas fa-globe-europe',
        title: 'Moteur d\'itinéraire',
        description: 'Itinéraire ferroviaire international propulsé par Transitous (moteur MOTIS / OpenStreetMap).',
        status: 'neutral',
      });
    } else {
      items.push({
        icon: 'fas fa-database',
        title: 'Source des horaires',
        description: 'Horaires du réseau marocain ONCF issus du jeu de données GTFS communautaire.',
        status: 'neutral',
      });
    }

    // Freshness & Calendar coverage
    if (train.dataFreshness) {
      items.push({
        icon: 'fas fa-calendar-alt',
        title: 'Validité du calendrier',
        description: train.dataFreshness,
        status: 'neutral',
      });
    }

    // Operator Link
    if (train.officialScheduleUrl) {
      items.push({
        icon: 'fas fa-external-link-alt',
        title: 'Portail officiel de l\'opérateur',
        description: 'Vérifiez et réservez vos billets directement sur le site officiel de l\'opérateur.',
        status: 'neutral',
      });
    }

    return items;
  }, [train, isTransitous]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!train) {
    return (
      <div style={{ padding: '2rem 1rem' }}>
        <OfferExpiredState
          productLabel="cette liaison en train"
          searchHref="/trains"
          searchLabel="Retourner à la recherche de trains"
        />
      </div>
    );
  }

  const badges = [
    train.productType || 'Train',
    hasTransfers ? `${train.numberOfTransfers} correspondance(s)` : 'Direct',
  ];

  return (
    <OfferDetailsShell
      backHref="/trains"
      backLabel="Retour aux horaires de train"
      sidebar={
        <div>
          <OfferPricePanel
            amount={train.price}
            currency={train.currency || 'MAD'}
            isFareUnavailable={train.price == null}
            fareUnavailableMessage="Tarif non disponible via cette source de données (horaires indicatifs)"
          />

          {train.officialScheduleUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a
                href={train.officialScheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#1e293b',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                <span>Consulter sur le portail officiel</span>
                <i className="fas fa-external-link-alt" style={{ fontSize: '0.8rem' }} />
              </a>
            </div>
          )}
        </div>
      }
    >
      {/* Header */}
      <OfferDetailsHeader
        title={`${train.originStation} → ${train.destinationStation}`}
        subtitle={`${train.operator} • ${train.departureDate ? `Date: ${train.departureDate} • ` : ''}${durationLabel || ''}`}
        icon="fas fa-train"
        provider={isTransitous ? 'TRANSITOUS' : 'ONCF GTFS'}
        sourceLabel="Source"
        badges={badges}
      />

      {/* Train Journey Timeline */}
      <RouteTimeline
        title="Détails du parcours ferroviaire"
        segments={timelineSegments}
      />

      {/* Conditions & Source Transparency */}
      <ConditionList
        title="Informations de service & Source de données"
        items={conditions}
      />
    </OfferDetailsShell>
  );
}
