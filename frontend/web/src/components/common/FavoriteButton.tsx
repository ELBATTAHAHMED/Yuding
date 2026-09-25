'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { libraryService } from '@/services/library.service';
import type { FavoriteResourceType } from '@/types/library.types';
import { useRouter } from 'next/navigation';

export interface FavoriteButtonProps {
  resourceType: FavoriteResourceType;
  resourceReference: string;
  title: string;
  destination?: string | null;
  thumbnailUrl?: string | null;
  providerLabel?: string | null;
  priceSnapshot?: number | null;
  currencySnapshot?: string | null;
  isInitiallyFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  resourceType,
  resourceReference,
  title,
  destination,
  thumbnailUrl,
  providerLabel,
  priceSnapshot,
  currencySnapshot,
  isInitiallyFavorited = false,
  size = 'md',
  className = '',
  showLabel = false,
  onToggle,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState<boolean>(isInitiallyFavorited);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsFavorited(isInitiallyFavorited);
  }, [isInitiallyFavorited]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const handleToggle = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (isLoading) return;

    // Optimistic toggle
    const nextState = !isFavorited;
    setIsFavorited(nextState);
    setIsLoading(true);

    try {
      if (nextState) {
        await libraryService.addFavorite({
          resourceType,
          resourceReference,
          title,
          destination: destination || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          providerLabel: providerLabel || undefined,
          priceSnapshot: priceSnapshot != null ? priceSnapshot : undefined,
          currencySnapshot: currencySnapshot || undefined,
        });
        setFeedback('Ajouté aux favoris');
      } else {
        await libraryService.removeFavoriteByResource(resourceType, resourceReference);
        setFeedback('Retiré des favoris');
      }

      onToggle?.(nextState);
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      // Rollback on failure
      setIsFavorited(!nextState);
      setFeedback('Erreur lors de la mise à jour');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setIsLoading(false);
    }
  };

  const label = isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#01796F] dark:focus:ring-[#02E0D5] ${
          isFavorited
            ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 shadow-sm'
            : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm'
        } ${sizeClasses} ${className}`}
      >
        {isLoading ? (
          <i className="fas fa-spinner fa-spin text-xs" aria-hidden="true" />
        ) : isFavorited ? (
          <i className="fas fa-heart text-rose-500 dark:text-rose-400" aria-hidden="true" />
        ) : (
          <i className="far fa-heart" aria-hidden="true" />
        )}
      </button>

      {showLabel && (
        <span
          onClick={handleToggle}
          className="ml-2 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-200 hover:text-[#01796F] dark:hover:text-[#02E0D5]"
        >
          {isFavorited ? 'Enregistré' : 'Ajouter aux favoris'}
        </span>
      )}

      {feedback && (
        <div
          role="status"
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none z-30 animate-fade-in"
        >
          {feedback}
        </div>
      )}
    </div>
  );
};

export default FavoriteButton;
