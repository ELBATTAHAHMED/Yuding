'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getOfferDetail } from '@/lib/offer-store';
import type { FlightOffer } from '@/types/travel.types';
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

export default function FlightDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [flight, setFlight] = useState<FlightOffer | null>(null);

  useEffect(() => {
    if (offerId) {
      const resolved = getOfferDetail<FlightOffer>('FLIGHT', offerId);
      setFlight(resolved);
    }
    setLoading(false);
  }, [offerId]);

  const durationLabel = useMemo(() => {
    if (!flight?.totalDurationMinutes) return undefined;
    const h = Math.floor(flight.totalDurationMinutes / 60);
    const m = flight.totalDurationMinutes % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  }, [flight]);

  const stopsLabel = useMemo(() => {
    if (flight?.stops == null) return 'Direct';
    if (flight.stops === 0) return 'Vol direct';
    return `${flight.stops} escale${flight.stops > 1 ? 's' : ''}`;
  }, [flight]);

  const timelineSegments = useMemo<TimelineSegment[]>(() => {
    if (!flight) return [];

    if (flight.legs && flight.legs.length > 0) {
      return flight.legs.map((leg, idx) => {
        const legDuration = leg.durationMinutes
          ? `${Math.floor(leg.durationMinutes / 60)}h${leg.durationMinutes % 60 > 0 ? ` ${leg.durationMinutes % 60}m` : ''}`
          : undefined;

        // Calculate layover to next leg if available
        let layoverAfter: string | undefined;
        if (idx < flight.legs!.length - 1) {
          const nextLeg = flight.legs![idx + 1];
          layoverAfter = `Escale à ${leg.arrivalAirport} (prochain vol vers ${nextLeg.arrivalAirport})`;
        }

        return {
          origin: leg.departureAirport,
          destination: leg.arrivalAirport,
          departureTime: leg.departureTime ? leg.departureTime.replace('T', ' ').substring(11, 16) : undefined,
          originDetail: leg.departureTime ? `Départ: ${leg.departureTime.substring(0, 10)}` : undefined,
          arrivalTime: leg.arrivalTime ? leg.arrivalTime.replace('T', ' ').substring(11, 16) : undefined,
          destinationDetail: leg.arrivalTime ? `Arrivée: ${leg.arrivalTime.substring(0, 10)}` : undefined,
          durationLabel: legDuration,
          carrierName: leg.airlineName || leg.airlineCode || flight.airlineName || flight.airlineCode,
          carrierCode: leg.airlineCode || flight.airlineCode,
          flightOrTrainNumber: leg.flightNumber || flight.flightNumber,
          layoverAfter,
        };
      });
    }

    // Single leg summary fallback
    return [
      {
        origin: flight.origin,
        originDetail: flight.departureTime ? `Départ: ${flight.departureTime.substring(0, 10)}` : undefined,
        departureTime: flight.departureTime ? flight.departureTime.replace('T', ' ').substring(11, 16) : undefined,
        destination: flight.destination,
        destinationDetail: flight.arrivalTime ? `Arrivée: ${flight.arrivalTime.substring(0, 10)}` : undefined,
        arrivalTime: flight.arrivalTime ? flight.arrivalTime.replace('T', ' ').substring(11, 16) : undefined,
        durationLabel,
        carrierName: flight.airlineName || flight.airlineCode,
        carrierCode: flight.airlineCode,
        flightOrTrainNumber: flight.flightNumber,
      },
    ];
  }, [flight, durationLabel]);

  const conditions = useMemo<ConditionItem[]>(() => {
    if (!flight) return [];
    const items: ConditionItem[] = [];

    // Cabin class
    if (flight.cabinClass) {
      items.push({
        icon: 'fas fa-chair',
        title: 'Classe de cabine',
        description: `Classe ${flight.cabinClass.toLowerCase()}`,
        status: 'neutral',
      });
    }

    // Available seats (truth rule: only show if present)
    if (flight.availableSeats != null) {
      items.push({
        icon: 'fas fa-user-check',
        title: 'Disponibilité sièges',
        description: `${flight.availableSeats} place(s) restante(s) à ce tarif`,
        status: flight.availableSeats <= 3 ? 'warning' : 'neutral',
      });
    }

    // Provider / Source
    if (flight.provider) {
      items.push({
        icon: 'fas fa-shield-alt',
        title: 'Source partenaire',
        description: `Offre fournie via le réseau partenaire ${flight.provider}`,
        status: 'neutral',
      });
    }

    return items;
  }, [flight]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!flight) {
    return (
      <div style={{ padding: '2rem 1rem' }}>
        <OfferExpiredState
          productLabel="ce vol"
          searchHref="/flights"
          searchLabel="Retourner à la recherche de vols"
        />
      </div>
    );
  }

  const airlineDisplayName = flight.airlineName || flight.airlineCode || 'Compagnie aérienne';
  const selRef = flight.selectionRef || flight.offerId;
  const bookingUrl = `/booking?serviceType=FLIGHT&serviceId=${encodeURIComponent(
    flight.offerId
  )}&selectionRef=${encodeURIComponent(selRef)}&serviceTitle=${encodeURIComponent(
    `${airlineDisplayName} (${flight.origin} → ${flight.destination})`
  )}&price=${flight.price}`;

  return (
    <OfferDetailsShell
      backHref="/flights"
      backLabel="Retour aux résultats de vols"
      sidebar={
        <OfferPricePanel
          amount={flight.price}
          currency={flight.currency}
          conversion={flight.priceConversion}
          unitLabel="par passager"
          priceType={flight.priceType}
          bookingHref={bookingUrl}
          bookingLabel="Sélectionner ce vol"
        />
      }
      mobileAction={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tarif par passager</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#01796F' }}>
              {flight.price} {flight.currency}
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
        title={`${flight.origin} → ${flight.destination}`}
        subtitle={`${airlineDisplayName} ${flight.flightNumber ? `• Vol ${flight.flightNumber}` : ''} • ${durationLabel || ''}`}
        icon="fas fa-plane"
        provider={flight.provider}
        badges={[stopsLabel, ...(flight.cabinClass ? [flight.cabinClass] : [])]}
      />

      {/* Itinerary Timeline */}
      <RouteTimeline
        title="Détails de l'itinéraire de vol"
        segments={timelineSegments}
      />

      {/* Conditions & Inclusions */}
      <ConditionList
        title="Conditions du vol & Informations"
        items={conditions}
      />
    </OfferDetailsShell>
  );
}
