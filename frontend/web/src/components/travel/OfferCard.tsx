import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export interface OfferCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  price?: number;
  priceUnit?: string;
  badge?: string;
  href?: string;
  actionLabel?: string;
  category?: string;
  durationHours?: number;
  className?: string;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  title,
  subtitle,
  description,
  imageUrl,
  price,
  priceUnit = '/ pers.',
  badge,
  href,
  actionLabel = 'Réserver',
  category,
  durationHours,
  className = '',
}) => {
  return (
    <Card hoverable className={`flex flex-col h-full ${className}`}>
      <div className="h-48 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {badge && (
          <div className="absolute top-3 left-3 bg-[#01796F]/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {badge}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {category && (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#01796F] dark:text-[#02E0D5]">
                {category}
              </span>
              {durationHours && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <i className="fas fa-clock text-[10px]" />
                  {durationHours}h
                </span>
              )}
            </div>
          )}

          {subtitle && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#01796F] dark:text-[#02E0D5] block mb-1">
              {subtitle}
            </span>
          )}

          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {price !== undefined && (
          <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between mt-auto">
            <div>
              <span className="text-xl font-extrabold text-[#01796F] dark:text-[#02E0D5]">
                {price} €
              </span>
              {priceUnit && (
                <span className="text-xs text-gray-500 dark:text-gray-400"> {priceUnit}</span>
              )}
            </div>

            {href && (
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#01796F] hover:bg-[#005951] text-white text-sm font-semibold transition-colors shadow-sm hover:shadow"
              >
                <span>{actionLabel}</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
