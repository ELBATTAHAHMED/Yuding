'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TrainOffer, TrainLeg } from '@/types/travel.types';

export interface TrainCardProps {
  offer: TrainOffer;
}

export const TrainCard: React.FC<TrainCardProps> = ({ offer }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState(false);

  const getProductColor = (product?: string) => {
    const p = (product || '').toUpperCase();
    if (p.includes('BORAQ') || p.includes('TGV') || p.includes('AVE') || p.includes('ICE') || p.includes('HIGHSPEED')) {
      return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
    }
    if (p.includes('ATLAS') || p.includes('INTERCIT') || p.includes('LONG_DISTANCE')) {
      return { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' };
    }
    if (p.includes('TNR') || p.includes('REGIONAL')) {
      return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const badgeStyle = getProductColor(offer.productType);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
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

  const isTransitous = offer.provider === 'TRANSITOUS';
  const hasTransfers = (offer.numberOfTransfers ?? 0) > 0;

  const renderModeIcon = (mode?: string) => {
    if (!mode) return <i className="fas fa-train" />;
    switch (mode.toUpperCase()) {
      case 'WALK':
        return <i className="fas fa-walking" style={{ color: '#64748b' }} />;
      case 'SUBWAY':
        return <i className="fas fa-subway" style={{ color: '#0284c7' }} />;
      case 'TRAM':
        return <i className="fas fa-tram" style={{ color: '#059669' }} />;
      default:
        return <i className="fas fa-train" style={{ color: '#2563eb' }} />;
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: selected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header bar: Product badge + Operator + Source Badge */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
          {offer.trainNumber && (
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
              {offer.trainNumber}
            </span>
          )}
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>•</span>
          <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
            {offer.operator}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isTransitous ? (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#0f766e',
                background: '#f0fdfa',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #99f6e4',
                fontWeight: 600,
              }}
              title="Données horaires mondiales Transitous (NeTEx / GTFS)"
            >
              <i className="fas fa-globe-europe" style={{ marginRight: '4px', color: '#0f766e' }} />
              Transitous Global
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#059669',
                background: '#ecfdf5',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #a7f3d0',
                fontWeight: 600,
              }}
              title="Données horaires ONCF vérifiées"
            >
              <i className="fas fa-database" style={{ marginRight: '4px', color: '#059669' }} />
              GTFS communautaire ONCF
            </span>
          )}
        </div>
      </div>

      {/* Main schedule layout: Origin -> Duration / Transfers -> Destination */}
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
        <div style={{ minWidth: '130px' }}>
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
            minWidth: '150px',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            {formatDuration(offer.durationMinutes) || 'Direct'}
          </span>
          <div
            style={{
              width: '100%',
              maxWidth: '190px',
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
            <div
              style={{
                background: '#eff6ff',
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fas fa-train" style={{ fontSize: '0.75rem', color: '#2563eb' }} />
            </div>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2563eb',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: hasTransfers ? '#d97706' : '#16a34a',
              fontWeight: 600,
              marginTop: '4px',
            }}
          >
            {hasTransfers
              ? `${offer.numberOfTransfers} correspondance${offer.numberOfTransfers! > 1 ? 's' : ''}`
              : 'Direct'}
          </span>
        </div>

        {/* Destination */}
        <div style={{ minWidth: '130px', textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
            {formatTime(offer.arrivalTime)}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            {offer.destinationStation}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Arrivée prévue</div>
        </div>

        {/* Pricing & Selection */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            minWidth: '190px',
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

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href={`/trains/${encodeURIComponent(offer.offerId)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1.5px solid #2563eb',
                color: '#2563eb',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span>Détails</span>
            </Link>

            <button
              type="button"
              onClick={() => setSelected((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: selected ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              title="Mémoriser ce trajet pour votre itinéraire Yuding"
            >
              {selected ? (
                <>
                  <i className="fas fa-check-circle" />
                  <span>Sélectionné</span>
                </>
              ) : (
                <>
                  <i className="fas fa-hand-pointer" />
                  <span>Choisir</span>
                </>
              )}
            </button>
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
              <span>Vérifier sur le site officiel</span>
              <i className="fas fa-external-link-alt" style={{ fontSize: '0.7rem' }} />
            </a>
          )}
        </div>
      </div>

      {/* Expandable journey details (legs and intermediate stops) */}
      {((offer.legs && offer.legs.length > 0) || (offer.intermediateStops && offer.intermediateStops.length > 0)) && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
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
            <span>
              {showDetails
                ? 'Masquer les détails du trajet'
                : hasTransfers
                ? `Voir les ${offer.legs?.length || 2} étapes du trajet`
                : `Voir le parcours (${offer.intermediateStops?.length || 0} gares)`}
            </span>
            <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }} />
          </button>

          {showDetails && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {/* If structured multi-leg journey */}
              {offer.legs && offer.legs.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Étapes de l'itinéraire :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {offer.legs.map((leg: TrainLeg, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                            {renderModeIcon(leg.mode)}
                            <span>{leg.serviceName || leg.mode}</span>
                            {leg.operator && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({leg.operator})</span>}
                          </div>
                          {leg.durationMinutes && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                              {formatDuration(leg.durationMinutes)}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{leg.origin} ({formatTime(leg.departureTime)})</span>
                          <span>→</span>
                          <span>{leg.destination} ({formatTime(leg.arrivalTime)})</span>
                        </div>

                        {leg.intermediateStops && leg.intermediateStops.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            {leg.intermediateStops.length} arrêt(s) intermédiaire(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard intermediate stops list for single train */
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Gares desservies sur ce trajet :
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#334155' }}>
                    {offer.intermediateStops?.map((st, idx) => (
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
      )}
    </div>
  );
};
