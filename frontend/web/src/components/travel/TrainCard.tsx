'use client';

import React, { useState } from 'react';
import type { TrainOffer } from '@/types/travel.types';

export interface TrainCardProps {
  offer: TrainOffer;
}

export const TrainCard: React.FC<TrainCardProps> = ({ offer }) => {
  const [showStops, setShowStops] = useState(false);

  const getProductColor = (product?: string) => {
    switch (product) {
      case 'Al Boraq':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
      case 'Al Atlas':
        return { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' };
      case 'TNR':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const badgeStyle = getProductColor(offer.productType);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    // If HH:mm:ss, slice to HH:mm
    if (timeStr.length >= 5) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Header bar: Product badge + Train Number + Source */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: badgeStyle.bg,
              color: badgeStyle.text,
              border: `1px solid ${badgeStyle.border}`,
            }}
          >
            {offer.productType || 'Train'}
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
            N° {offer.trainNumber}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>•</span>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{offer.operator}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              background: '#f8fafc',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
            }}
            title="Source provenance"
          >
            <i className="fas fa-database" style={{ marginRight: '4px', color: '#64748b' }} />
            {offer.source}
          </span>
        </div>
      </div>

      {/* Main schedule layout: Origin -> Line with duration -> Destination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Origin */}
        <div style={{ minWidth: '120px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            {formatTime(offer.departureTime)}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            {offer.originStation}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Départ prévu</div>
        </div>

        {/* Journey Duration & Route Indicator */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '140px',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            {formatDuration(offer.durationMinutes) || 'Direct'}
          </span>
          <div
            style={{
              width: '100%',
              maxWidth: '180px',
              height: '2px',
              background: '#cbd5e1',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2563eb',
              }}
            />
            <i className="fas fa-train" style={{ fontSize: '0.8rem', color: '#2563eb' }} />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2563eb',
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
            {offer.direct ? 'Direct' : `${offer.stopsCount} arrêt(s)`}
          </span>
        </div>

        {/* Destination */}
        <div style={{ minWidth: '120px', textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            {formatTime(offer.arrivalTime)}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            {offer.destinationStation}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Arrivée prévue</div>
        </div>

        {/* Pricing / Fare notice */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            minWidth: '180px',
            borderLeft: '1px solid #f1f5f9',
            paddingLeft: '1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748b',
              fontStyle: 'italic',
              textAlign: 'right',
              marginBottom: '0.5rem',
            }}
          >
            Tarif non disponible via cette source
          </div>

          {offer.officialScheduleUrl && (
            <a
              href={offer.officialScheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span>Vérifier sur ONCF</span>
              <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }} />
            </a>
          )}
        </div>
      </div>

      {/* Expandable stops details */}
      {offer.intermediateStops && offer.intermediateStops.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowStops(!showStops)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{showStops ? 'Masquer le parcours' : `Voir le parcours (${offer.intermediateStops.length} gares)`}</span>
            <i className={`fas fa-chevron-${showStops ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }} />
          </button>

          {showStops && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Gares desservies sur ce trajet :
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#334155' }}>
                {offer.intermediateStops.map((st, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <strong>{st.stationName}</strong>
                    {st.departureTime && (
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>
                        (Départ: {formatTime(st.departureTime)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
