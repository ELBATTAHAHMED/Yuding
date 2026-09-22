import React from 'react';

interface Props {
  count?: number;
}

/** Train-specific loading skeleton — mimics the train result row */
export const TrainSkeleton: React.FC<Props> = ({ count = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="animate-pulse"
        style={{
          background: 'var(--card, #fff)',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Train icon circle */}
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />

        {/* Times + route */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ height: '18px', background: '#e5e7eb', borderRadius: '4px', width: '45%' }} />
          <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '60%' }} />
        </div>

        {/* Duration badge */}
        <div style={{ height: '28px', background: '#e5e7eb', borderRadius: '999px', width: '70px', flexShrink: 0 }} />

        {/* Price + button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ height: '24px', background: '#e5e7eb', borderRadius: '4px', width: '65px' }} />
          <div style={{ height: '36px', background: '#e5e7eb', borderRadius: '6px', width: '90px' }} />
        </div>
      </div>
    ))}
  </div>
);
