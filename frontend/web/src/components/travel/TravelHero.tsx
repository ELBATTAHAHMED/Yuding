'use client';

import React from 'react';
import { useDestinationImages } from '@/hooks/queries/useDestinationImages';

export interface TravelHeroProps {
  title: string;
  subtitle: string;
  /** A structured or stable contextual destination; never represents an offer. */
  destination?: string;
  country?: string;
  icon: string;
  compact?: boolean;
}

/**
 * Shared contextual hero for travel search pages. It deliberately uses only
 * destination imagery obtained through the Gateway-mediated Pexels service.
 */
export function TravelHero({
  title,
  subtitle,
  destination,
  country,
  icon,
  compact = false,
}: TravelHeroProps) {
  const city = destination?.trim() || 'Voyage';
  const { data, isLoading } = useDestinationImages({ city, country, limit: 1 });
  const image = data?.images?.[0];

  return (
    <section className={`travel-hero ${compact ? 'travel-hero--compact' : ''}`} aria-label={`${title} — contexte de destination`}>
      <div className="travel-hero__media" aria-hidden="true">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt="" className="travel-hero__image" />
        )}
      </div>
      <div className="travel-hero__overlay" aria-hidden="true" />
      <div className="travel-hero__content">
        <p className="travel-hero__eyebrow"><i className={icon} aria-hidden="true" /> Yuding Travel</p>
        <h1>{title}</h1>
        <p className="travel-hero__subtitle">{subtitle}</p>
        <p className="travel-hero__context">{destination ? `Explorer ${destination}` : 'Planifiez un voyage qui vous ressemble'}</p>
      </div>
      <div className="travel-hero__attribution" aria-live="polite">
        {image ? (
          <>
            Photo par{' '}
            {image.photographerUrl ? <a href={image.photographerUrl} target="_blank" rel="noopener noreferrer">{image.photographerName || 'photographe'}</a> : image.photographerName || 'photographe'}{' '}
            sur <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
          </>
        ) : (
          <span>{isLoading ? 'Chargement de l’ambiance destination…' : 'Ambiance de voyage Yuding'}</span>
        )}
      </div>
    </section>
  );
}
