'use client';

import React, { useState } from 'react';

export interface SafeEntityImageProps {
  src?: string | null;
  alt: string;
  entityType: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  className?: string;
  height?: string | number;
  width?: string | number;
  objectFit?: 'cover' | 'contain';
}

/**
 * Safe image renderer for provider entities (Hotels, Activities, Transfers).
 * Enforces the Truth In Imagery rule:
 * - If a genuine provider image exists, renders it.
 * - If missing or broken, renders a dignified neutral placeholder.
 * - NEVER secretly falls back to an unrelated stock photo.
 */
export const SafeEntityImage: React.FC<SafeEntityImageProps> = ({
  src,
  alt,
  entityType,
  className = '',
  height = '100%',
  width = '100%',
  objectFit = 'cover',
}) => {
  const [hasError, setHasError] = useState(false);

  const getIcon = () => {
    switch (entityType) {
      case 'HOTEL':
        return 'fas fa-hotel';
      case 'ACTIVITY':
        return 'fas fa-ticket-alt';
      case 'TRANSFER':
        return 'fas fa-taxi';
      default:
        return 'fas fa-image';
    }
  };

  const getPlaceholderLabel = () => {
    switch (entityType) {
      case 'HOTEL':
        return 'Photo non fournie par l’établissement';
      case 'ACTIVITY':
        return 'Photo non fournie par le partenaire';
      case 'TRANSFER':
        return 'Véhicule selon disponibilité';
      default:
        return 'Image non disponible';
    }
  };

  // If no source is provided or the image failed to load, display the neutral placeholder
  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 p-4 select-none ${className}`}
        style={{ width, height, minHeight: '160px' }}
        role="img"
        aria-label={`${alt} (${getPlaceholderLabel()})`}
      >
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
          <i className={`${getIcon()} text-lg text-gray-500 dark:text-gray-400`} aria-hidden="true" />
        </div>
        <span className="text-xs text-center font-medium line-clamp-1 max-w-[200px]">
          {getPlaceholderLabel()}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          Yuding Sécurisé
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
      style={{
        width,
        height,
        objectFit,
      }}
    />
  );
};
