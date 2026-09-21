'use client';

import React, { useState, useMemo } from 'react';
import type { NearbyPlace } from '@/types/geo.types';

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

export const NearbyPoiPanel: React.FC<NearbyPoiPanelProps> = ({
  pois,
  isLoading = false,
  selectedPoi,
  onSelectPoi,
  destinationName,
}) => {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const filteredPois = useMemo(() => {
    if (activeCategory === 'ALL') return pois;
    return pois.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [pois, activeCategory]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'museums':
        return 'fas fa-monument';
      case 'restaurants':
        return 'fas fa-utensils';
      case 'cafes':
        return 'fas fa-coffee';
      case 'parks':
        return 'fas fa-tree';
      case 'shopping':
        return 'fas fa-shopping-bag';
      case 'transport':
        return 'fas fa-subway';
      default:
        return 'fas fa-landmark';
    }
  };

  const formatDistance = (meters?: number) => {
    if (!meters && meters !== 0) return null;
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        padding: '1.25rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#01796F', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-compass" />
          À voir &amp; visiter {destinationName ? `à ${destinationName}` : 'à proximité'}
        </h3>
        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>
          {filteredPois.length} point{filteredPois.length !== 1 ? 's' : ''} d&apos;intérêt
        </span>
      </div>

      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
          scrollbarWidth: 'thin',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                border: isSelected ? '1px solid #01796F' : '1px solid #e0e0e0',
                background: isSelected ? '#01796F' : '#f9f9f9',
                color: isSelected ? '#fff' : '#555',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <i className={cat.icon} style={{ fontSize: '0.78rem' }} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* POI Cards Container */}
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#01796F' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.9rem' }}>Recherche des lieux remarquables...</div>
        </div>
      ) : filteredPois.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <i className="fas fa-map-marker-alt" style={{ fontSize: '1.8rem', color: '#ccc', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Aucun lieu trouvé dans cette catégorie</div>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>Sélectionnez une autre catégorie ci-dessus.</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '0.85rem',
            maxHeight: '340px',
            overflowY: 'auto',
            paddingRight: '0.35rem',
          }}
        >
          {filteredPois.map((poi) => {
            const isSelected = selectedPoi?.id === poi.id;
            const dist = formatDistance(poi.distanceMeters);

            return (
              <div
                key={poi.id}
                onClick={() => onSelectPoi?.(poi)}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: isSelected ? '1.5px solid #01796F' : '1px solid #eee',
                  background: isSelected ? '#e0f2f1' : '#fafafa',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#222',
                        lineHeight: 1.25,
                      }}
                    >
                      {poi.name}
                    </span>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#01796F',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className={getCategoryIcon(poi.category)} />
                    </div>
                  </div>

                  {poi.formattedAddress && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#666',
                        lineHeight: 1.3,
                        marginBottom: '0.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {poi.formattedAddress}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                  <span
                    style={{
                      background: '#e0f2f1',
                      color: '#004d40',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {poi.category}
                  </span>
                  {dist && (
                    <span style={{ color: '#01796F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <i className="fas fa-walking" style={{ fontSize: '0.7rem' }} />
                      {dist}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
