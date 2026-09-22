import React from 'react';

interface Props {
  count?: number;
}

/** Transfer-specific loading skeleton — mimics the transfer result row */
export const TransferSkeleton: React.FC<Props> = ({ count = 5 }) => (
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
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Vehicle icon circle */}
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />

        {/* Vehicle info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ height: '16px', background: '#e5e7eb', borderRadius: '4px', width: '40%' }} />
          <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '60%' }} />
        </div>

        {/* Capacity badge */}
        <div style={{ height: '26px', background: '#e5e7eb', borderRadius: '999px', width: '60px', flexShrink: 0 }} />

        {/* Price + button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: 'auto' }}>
          <div style={{ height: '24px', background: '#e5e7eb', borderRadius: '4px', width: '70px' }} />
          <div style={{ height: '36px', background: '#e5e7eb', borderRadius: '6px', width: '90px' }} />
        </div>
      </div>
    ))}
  </div>
);
