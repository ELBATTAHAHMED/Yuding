import React from 'react';
import Link from 'next/link';
import { FlightOffer } from '@/types/travel.types';
import { Card } from '@/components/ui/Card';

export interface FlightCardProps {
  flight: FlightOffer;
  className?: string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, className = '' }) => {
  const bookingUrl = `/booking?serviceType=FLIGHT&serviceId=${flight.id}&serviceTitle=${encodeURIComponent(
    `${flight.airline} (${flight.origin} → ${flight.destination})`
  )}&price=${flight.price}`;

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
          <h3 className="font-bold text-base text-gray-900 dark:text-white">{flight.airline}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Vol {flight.flightNumber}</span>
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
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            Direct
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
            {flight.price} €
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {flight.availableSeats} places restantes
          </div>
        </div>

        <Link
          href={bookingUrl}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-[#01796F] hover:bg-[#005951] text-white text-sm font-semibold transition-colors shadow-sm hover:shadow shrink-0"
        >
          <i className="fas fa-ticket-alt text-xs" />
          <span>Réserver</span>
        </Link>
      </div>
    </Card>
  );
};
