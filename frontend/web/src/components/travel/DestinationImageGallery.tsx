'use client';

import React, { useState } from 'react';
import { useDestinationImages } from '@/hooks/queries/useDestinationImages';
import type { ImageAsset } from '@/types/image.types';

export interface DestinationImageGalleryProps {
  city: string;
  country?: string;
  countryCode?: string;
  className?: string;
}

/**
 * Contextual destination gallery component.
 * Displays licensed stock travel photos from Pexels with full photographer attribution
 * and explicit visual provenance indicating these are destination atmosphere photos,
 * not specific hotel/activity property photos.
 */
export const DestinationImageGallery: React.FC<DestinationImageGalleryProps> = ({
  city,
  country,
  countryCode,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data, isLoading, isError } = useDestinationImages({
    city,
    country,
    countryCode,
    limit: 3,
  });

  const images = data?.images || [];
  const currentImage: ImageAsset | undefined = images[selectedIndex] || images[0];

  if (isLoading) {
    return (
      <div className={`w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} style={{ height: '240px' }}>
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <i className="fas fa-camera text-2xl mb-2" />
          <span className="text-xs">Chargement des photos de {city}…</span>
        </div>
      </div>
    );
  }

  if (isError || images.length === 0 || !currentImage) {
    return (
      <div className={`w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-teal-900/10 to-emerald-900/10 p-5 flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[#01796F] dark:text-[#02E0D5]">
            <i className="fas fa-city text-lg" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              Découvrez {city}{country ? `, ${country}` : ''}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Photos de la destination prochainement disponibles.
            </p>
          </div>
        </div>
        <span className="text-[11px] text-gray-400 font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-black/30 border border-gray-200/60 dark:border-white/10">
          Yuding Voyage
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm ${className}`}>
      {/* Main Hero Landscape Photo */}
      <div className="relative h-56 w-full overflow-hidden bg-black/5 sm:h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage.url}
          alt={currentImage.altText || `Photo de ${city}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />

        {/* Provenance Pill - Top Left */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm">
            <i className="fas fa-camera text-[10px] text-[#02E0D5]" aria-hidden="true" />
            <span>Ambiance Destination</span>
          </span>
        </div>

        {/* Pexels Attribution Badge - Bottom Left */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-white text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span>Photo par</span>
            {currentImage.photographerUrl ? (
              <a
                href={currentImage.photographerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline hover:text-[#02E0D5] transition-colors truncate"
              >
                {currentImage.photographerName || 'Photographe'}
              </a>
            ) : (
              <span className="font-bold">{currentImage.photographerName || 'Photographe'}</span>
            )}
            <span>sur</span>
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:text-[#02E0D5] transition-colors inline-flex items-center gap-1"
            >
              Pexels
              <i className="fas fa-external-link-alt text-[9px]" aria-hidden="true" />
            </a>
          </div>

          {currentImage.sourcePageUrl && (
            <a
              href={currentImage.sourcePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-300 hover:text-white underline ml-auto hidden sm:inline"
            >
              Voir la photo
            </a>
          )}
        </div>
      </div>

      {/* Thumbnail Bar (if multiple photos returned) */}
      {images.length > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 p-2.5 dark:border-white/5 dark:bg-gray-800/60">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Galerie ({selectedIndex + 1}/{images.length})
          </span>
          <div className="flex items-center gap-2">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-12 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedIndex === idx
                    ? 'border-[#01796F] dark:border-[#02E0D5] scale-105 shadow-sm'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`Afficher photo ${idx + 1} de ${city}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={`Vignette ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
