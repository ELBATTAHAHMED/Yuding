'use client';

import React, { useMemo, useState } from 'react';
import type { NearbyPlace } from '@/types/geo.types';
import styles from './NearbyPoiPanel.module.css';

export interface NearbyPoiPanelProps {
  pois: NearbyPlace[];
  isLoading?: boolean;
  selectedPoi?: NearbyPlace | null;
  onSelectPoi?: (poi: NearbyPlace) => void;
  destinationName?: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'Tous', icon: 'fas fa-th-large' },
  { id: 'attractions', label: 'Attractions', icon: 'fas fa-landmark' },
  { id: 'museums', label: 'Musées', icon: 'fas fa-monument' },
  { id: 'restaurants', label: 'Restaurants', icon: 'fas fa-utensils' },
  { id: 'cafes', label: 'Cafés', icon: 'fas fa-coffee' },
  { id: 'parks', label: 'Parcs', icon: 'fas fa-tree' },
  { id: 'shopping', label: 'Shopping', icon: 'fas fa-shopping-bag' },
  { id: 'transport', label: 'Transports', icon: 'fas fa-subway' },
];

const categoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'museums': return 'fas fa-monument';
    case 'restaurants': return 'fas fa-utensils';
    case 'cafes': return 'fas fa-coffee';
    case 'parks': return 'fas fa-tree';
    case 'shopping': return 'fas fa-shopping-bag';
    case 'transport': return 'fas fa-subway';
    default: return 'fas fa-landmark';
  }
};

const formatDistance = (meters?: number) => {
  if (meters == null) return null;
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
};

export const NearbyPoiPanel: React.FC<NearbyPoiPanelProps> = ({
  pois,
  isLoading = false,
  selectedPoi,
  onSelectPoi,
  destinationName,
}) => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const filteredPois = useMemo(
    () => activeCategory === 'ALL' ? pois : pois.filter((poi) => poi.category?.toLowerCase() === activeCategory.toLowerCase()),
    [pois, activeCategory],
  );

  return (
    <div className={`${styles.panel} ${!isLoading && filteredPois.length > 0 ? styles.panelFilled : ''}`}>
      <div className={styles.heading}>
        <h3><i className="fas fa-compass" aria-hidden="true" />À voir &amp; visiter {destinationName ? `à ${destinationName}` : 'à proximité'}</h3>
        <span>{filteredPois.length} point{filteredPois.length !== 1 ? 's' : ''} d&apos;intérêt</span>
      </div>

      <div className={styles.categories} role="group" aria-label="Filtrer les lieux par catégorie">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
            className={`${styles.categoryButton} ${activeCategory === category.id ? styles.categoryActive : ''}`}
            aria-pressed={activeCategory === category.id}
          >
            <i className={category.icon} aria-hidden="true" />{category.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.state} role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" />Recherche des lieux remarquables...</div>
      ) : filteredPois.length === 0 ? (
        <div className={styles.state}><i className="fas fa-map-marker-alt" aria-hidden="true" /><strong>Aucun lieu trouvé dans cette catégorie</strong><span>Sélectionnez une autre catégorie ci-dessus.</span></div>
      ) : (
        <div className={styles.list}>
          {filteredPois.map((poi) => {
            const distance = formatDistance(poi.distanceMeters);
            return (
              <button
                key={poi.id}
                type="button"
                onClick={() => onSelectPoi?.(poi)}
                className={`${styles.poiCard} ${selectedPoi?.id === poi.id ? styles.poiSelected : ''}`}
                aria-pressed={selectedPoi?.id === poi.id}
              >
                <span className={styles.poiTop}>
                  <strong>{poi.name}</strong>
                  <span className={styles.poiIcon}><i className={categoryIcon(poi.category)} aria-hidden="true" /></span>
                </span>
                {poi.formattedAddress && <span className={styles.address}>{poi.formattedAddress}</span>}
                <span className={styles.poiMeta}>
                  <span className={styles.poiCategory}>{poi.category}</span>
                  {distance && <span className={styles.distance}><i className="fas fa-walking" aria-hidden="true" />{distance}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
