import React from 'react';
import Link from 'next/link';
import { FlightOffer } from '@/types/travel.types';
import { Card } from '@/components/ui/Card';
import { PriceDisplay } from './PriceDisplay';
import FavoriteButton from '@/components/common/FavoriteButton';

export interface FlightCardProps {
  flight: FlightOffer;
  className?: string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, className = '' }) => {
  const displayName = flight.airlineName || flight.airlineCode || '—';
  const selRef = flight.selectionRef || flight.offerId;
  const isPriced = flight.price != null && flight.price > 0;
  const bookingUrl = `/booking?serviceType=FLIGHT&serviceId=${encodeURIComponent(flight.offerId)}&selectionRef=${encodeURIComponent(selRef)}&serviceTitle=${encodeURIComponent(
    `${displayName} (${flight.origin} → ${flight.destination})`
  )}${isPriced ? `&price=${flight.price}` : ''}&currency=${encodeURIComponent(flight.currency || 'EUR')}`;

  const durationLabel = flight.totalDurationMinutes
    ? `${Math.floor(flight.totalDurationMinutes / 60)}h${flight.totalDurationMinutes % 60 > 0 ? ` ${flight.totalDurationMinutes % 60}m` : ''}`
    : null;

  const stopsLabel =
    flight.stops != null
      ? flight.stops === 0
        ? 'Direct'
        : `${flight.stops} escale${flight.stops > 1 ? 's' : ''}`
      : 'Direct';

  return (
    <Card
      hoverable
      className={`p-5 flex flex-col md:flex-row items-center justify-between gap-6 ${className}`}
    >
      {/* Airline Info */}
      <div className="flex items-center gap-4 min-w-[200px] w-full md:w-auto">
        <div className="w-12 h-12 rounded-full bg-[#01796F]/10 dark:bg-[#02E0D5]/10 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-xl shrink-0">
          <i className="fas fa-plane" />
        </div>
        <div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">{displayName}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {flight.airlineCode}{flight.flightNumber ? ` · Vol ${flight.flightNumber}` : ''}
          </span>
        </div>
      </div>

      {/* Flight Schedule */}
      <div className="flex items-center justify-around gap-6 sm:gap-10 w-full md:w-auto">
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {flight.departureTime}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            {flight.origin}
          </div>
        </div>

        <div className="flex flex-col items-center text-[#01796F] dark:text-[#02E0D5]">
          <i className="fas fa-long-arrow-alt-right text-xl" />
          {durationLabel && (
            <span className="text-[10px] text-gray-400 font-medium">{durationLabel}</span>
          )}
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            {stopsLabel}
          </span>
        </div>

        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">
            {flight.arrivalTime}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            {flight.destination}
          </div>
        </div>
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-white/5">
        <div className="text-left md:text-right">
          <div className="text-2xl font-extrabold text-[#01796F] dark:text-[#02E0D5]">
            <PriceDisplay conversion={flight.priceConversion} amount={flight.price} currency={flight.currency} />
          </div>
          {flight.availableSeats != null && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {flight.availableSeats} places restantes
            </div>
          )}
          {flight.priceType === 'round_trip_starting' && (
            <div className="text-xs text-gray-400">à partir de (A/R)</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FavoriteButton
            resourceType="FLIGHT"
            resourceReference={flight.offerId}
            title={`${displayName} (${flight.origin} → ${flight.destination})`}
            destination={`${flight.origin} → ${flight.destination}`}
            providerLabel={flight.provider || flight.airlineName || 'Vol'}
            priceSnapshot={flight.price}
            currencySnapshot={flight.currency || 'EUR'}
            size="sm"
          />
          <Link
            href={`/flights/${encodeURIComponent(flight.offerId)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-[#01796F] text-[#01796F] dark:text-[#02E0D5] hover:bg-[#01796F]/10 text-sm font-semibold transition-colors shrink-0"
          >
            <span>Détails</span>
          </Link>
          {isPriced ? (
            <Link
              href={bookingUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[#01796F] hover:bg-[#005951] text-white text-sm font-semibold transition-colors shadow-sm hover:shadow shrink-0"
            >
              <i className="fas fa-ticket-alt text-xs" />
              <span>Réserver</span>
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-semibold cursor-not-allowed shrink-0"
              title="Tarif indisponible pour réservation en ligne"
            >
              <i className="fas fa-ban text-xs" />
              <span>Indisponible</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
