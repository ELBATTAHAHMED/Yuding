import React from 'react';

interface Props {
  count?: number;
}

/** Flight-specific loading skeleton — mimics the flight result row layout */
export const FlightSkeleton: React.FC<Props> = ({ count = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        style={{
          background: 'var(--card, #fff)',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Airline circle */}
        <div
          className="animate-pulse"
          style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }}
        />

        {/* Airline name + code */}
        <div className="animate-pulse" style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ height: '14px', background: '#e5e7eb', borderRadius: '4px', width: '80%' }} />
          <div style={{ height: '11px', background: '#e5e7eb', borderRadius: '4px', width: '50%' }} />
        </div>

        {/* Departure */}
        <div className="animate-pulse" style={{ flex: '0 0 70px', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{ height: '20px', background: '#e5e7eb', borderRadius: '4px', width: '100%' }} />
          <div style={{ height: '11px', background: '#e5e7eb', borderRadius: '4px', width: '60%' }} />
        </div>

        {/* Arrow + duration */}
        <div className="animate-pulse" style={{ flex: '0 0 80px', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{ height: '14px', background: '#e5e7eb', borderRadius: '4px', width: '90%' }} />
          <div style={{ height: '11px', background: '#e5e7eb', borderRadius: '4px', width: '60%' }} />
        </div>

        {/* Arrival */}
        <div className="animate-pulse" style={{ flex: '0 0 70px', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{ height: '20px', background: '#e5e7eb', borderRadius: '4px', width: '100%' }} />
          <div style={{ height: '11px', background: '#e5e7eb', borderRadius: '4px', width: '60%' }} />
        </div>

        {/* Price + button */}
        <div className="animate-pulse" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ height: '28px', background: '#e5e7eb', borderRadius: '4px', width: '70px' }} />
          <div style={{ height: '38px', background: '#e5e7eb', borderRadius: '6px', width: '90px' }} />
        </div>
      </div>
    ))}
  </div>
);
