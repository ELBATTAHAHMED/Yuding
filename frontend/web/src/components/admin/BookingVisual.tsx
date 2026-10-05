'use client';

import React, { useState } from 'react';
import { parseTravelContext } from '@/lib/admin-travel';
import { AdminBooking } from '@/types/admin.types';

interface BookingVisualProps {
  booking: AdminBooking;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

export function BookingVisual({
  booking,
  size = 'md',
  showBadge = false,
  className = '',
}: BookingVisualProps) {
  const context = parseTravelContext(booking);
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs rounded-lg',
    md: 'w-12 h-12 text-sm rounded-xl',
    lg: 'w-16 h-16 text-base rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size];

  // Specific visual icon mapping by product type
  const getProductIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'HOTEL':
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'FLIGHT':
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'ACTIVITY':
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'TRANSFER':
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'TRAIN':
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM4 11h16" />
          </svg>
        );
      default:
        return (
          <svg className={iconSizes} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const getFallbackStyles = (type: string) => {
    switch (type.toUpperCase()) {
      case 'HOTEL':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40';
      case 'FLIGHT':
        return 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/40';
      case 'ACTIVITY':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40';
      case 'TRANSFER':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40';
      case 'TRAIN':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  // If real image is present and not broken (hotels / activities usually have genuine gallery photos)
  const hasRealImage = !!context.imageUrl && !imgError;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${sizeClasses} ${className}`}>
      {hasRealImage ? (
        <img
          src={context.imageUrl}
          alt={context.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-inherit transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center font-semibold select-none ${getFallbackStyles(
            context.productType
          )}`}
          title={`${context.badge}: ${context.title}`}
        >
          {getProductIcon(context.productType)}
        </div>
      )}

      {showBadge && (
        <span
          className="absolute bottom-0 right-0 px-1 py-0.5 text-[9px] font-bold uppercase rounded-tl tracking-wider text-white shadow-sm"
          style={{ backgroundColor: context.badgeColor }}
        >
          {context.productType.slice(0, 3)}
        </span>
      )}
    </div>
  );
}
