import React from 'react';
import Link from 'next/link';
import { HotelOffer } from '@/types/travel.types';
import { Card } from '@/components/ui/Card';
import { PriceDisplay } from './PriceDisplay';
import { SafeEntityImage } from './SafeEntityImage';

export interface HotelCardProps {
  hotel: HotelOffer;
  className?: string;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, className = '' }) => {
  const hotelDisplayName = hotel.name || hotel.hotelName || 'Hôtel';
  const selRef = hotel.selectionRef || hotel.offerId || hotel.id || hotel.hotelId || '';
  const bookingUrl = `/booking?serviceType=HOTEL&serviceId=${encodeURIComponent(hotel.id || hotel.hotelId || '')}&selectionRef=${encodeURIComponent(selRef)}&serviceTitle=${encodeURIComponent(
    hotelDisplayName
  )}&price=${hotel.pricePerNight}`;

  return (
    <Card
      hoverable
      className={`flex flex-col h-full ${className}`}
    >
      <div className="h-48 overflow-hidden relative">
        <SafeEntityImage
          src={hotel.imageUrl}
          alt={hotelDisplayName}
          entityType="HOTEL"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {hotel.rating && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-[#ffb300] px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <i className="fas fa-star" />
            <span>{hotel.rating}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">
              {hotel.name}
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-4">
            <i className="fas fa-map-marker-alt text-[#01796F] dark:text-[#02E0D5]" />
            <span>{hotel.city}, {hotel.country}</span>
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xl font-extrabold text-[#01796F] dark:text-[#02E0D5]">
              <PriceDisplay conversion={hotel.priceConversion} amount={hotel.pricePerNight} currency={hotel.currency} />
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400"> / nuit</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/hotels/${encodeURIComponent(hotel.offerId || hotel.hotelId || hotel.id || '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#01796F] text-[#01796F] dark:text-[#02E0D5] hover:bg-[#01796F]/10 text-xs font-semibold transition-colors"
            >
              <span>Détails</span>
            </Link>
            <Link
              href={bookingUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#01796F] hover:bg-[#005951] text-white text-xs font-semibold transition-colors shadow-sm hover:shadow"
            >
              <i className="fas fa-calendar-check text-xs" />
              <span>Réserver</span>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
};
