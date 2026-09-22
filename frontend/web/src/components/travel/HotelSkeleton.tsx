import React from 'react';

interface Props {
  count?: number;
}

/** Hotel-specific loading skeleton — mimics the hotel card layout */
export const HotelSkeleton: React.FC<Props> = ({ count = 6 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="animate-pulse"
        style={{
          background: 'var(--card, #fff)',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          gap: '1.25rem',
          overflow: 'hidden',
          padding: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Image placeholder */}
        <div
          style={{
            width: '120px',
            height: '90px',
            background: '#e5e7eb',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        />

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: '18px', background: '#e5e7eb', borderRadius: '4px', width: '55%' }} />
          <div style={{ height: '13px', background: '#e5e7eb', borderRadius: '4px', width: '35%' }} />
          <div style={{ height: '13px', background: '#e5e7eb', borderRadius: '4px', width: '70%' }} />
        </div>

        {/* Price + button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ height: '26px', background: '#e5e7eb', borderRadius: '4px', width: '80px' }} />
          <div style={{ height: '13px', background: '#e5e7eb', borderRadius: '4px', width: '55px' }} />
          <div style={{ height: '36px', background: '#e5e7eb', borderRadius: '6px', width: '100px', marginTop: '0.5rem' }} />
        </div>
      </div>
    ))}
  </div>
);
