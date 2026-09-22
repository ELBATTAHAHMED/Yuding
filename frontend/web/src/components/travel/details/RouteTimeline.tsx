import React from 'react';

export interface TimelineSegment {
  origin: string;
  originDetail?: string; // e.g. "Aéroport Mohammed V (CMN)" or "Gare Casa-Port"
  departureTime?: string;
  destination: string;
  destinationDetail?: string;
  arrivalTime?: string;
  durationLabel?: string;
  carrierName?: string;
  carrierCode?: string;
  flightOrTrainNumber?: string;
  mode?: string;
  layoverAfter?: string; // e.g. "Escale 1h 45m à Madrid (MAD)" or "Correspondance 25m à Rabat"
  stopsCount?: number;
  intermediateStops?: { stationName: string; departureTime?: string }[];
}

export interface RouteTimelineProps {
  title?: string;
  segments: TimelineSegment[];
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  title = 'Itinéraire & Horaires',
  segments = [],
}) => {
  if (!segments || segments.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--card, #ffffff)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text, #0f172a)' }}>
        {title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {segments.map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Segment Card */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
              }}
            >
              {/* Carrier & Mode Bar */}
              {(seg.carrierName || seg.flightOrTrainNumber || seg.mode) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#01796F' }}>
                    <i className="fas fa-route" />
                    <span>{seg.carrierName || seg.mode || 'Trajet'}</span>
                    {seg.flightOrTrainNumber && (
                      <span style={{ color: '#64748b', fontWeight: 600 }}>• N° {seg.flightOrTrainNumber}</span>
                    )}
                  </div>

                  {seg.durationLabel && (
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, background: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <i className="fas fa-clock" style={{ marginRight: '0.3rem', color: '#94a3b8' }} />
                      {seg.durationLabel}
                    </span>
                  )}
                </div>
              )}

              {/* Departure & Arrival Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {/* Departure node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#01796F', marginTop: '4px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                        {seg.departureTime || '—'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                        {seg.origin}
                      </span>
                    </div>
                    {seg.originDetail && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {seg.originDetail}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical connecting line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    bottom: '16px',
                    left: '5.5px',
                    width: '1.5px',
                    background: '#cbd5e1',
                  }}
                />

                {/* Arrival node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#01796F', marginTop: '4px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                        {seg.arrivalTime || '—'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                        {seg.destination}
                      </span>
                    </div>
                    {seg.destinationDetail && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {seg.destinationDetail}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Intermediate stops list if present */}
              {seg.intermediateStops && seg.intermediateStops.length > 0 && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>Arrêts intermédiaires ({seg.intermediateStops.length}) : </span>
                  {seg.intermediateStops.map((st, sIdx) => (
                    <span key={sIdx}>
                      {st.stationName}{st.departureTime ? ` (${st.departureTime})` : ''}
                      {sIdx < seg.intermediateStops!.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Layover / Connection Banner (between segments) */}
            {seg.layoverAfter && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#92400e',
                }}
              >
                <i className="fas fa-hourglass-half" style={{ color: '#d97706' }} />
                <span>{seg.layoverAfter}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
