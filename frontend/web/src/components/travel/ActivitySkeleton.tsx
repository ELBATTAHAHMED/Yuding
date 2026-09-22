import React from 'react';

interface Props {
  count?: number;
}

/** Activity-specific loading skeleton — mimics the activity card layout */
export const ActivitySkeleton: React.FC<Props> = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '1.25rem',
    }}
  >
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="animate-pulse"
        style={{
          background: 'var(--card, #fff)',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Image placeholder */}
        <div style={{ height: '160px', background: '#e5e7eb' }} />

        {/* Content */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: '16px', background: '#e5e7eb', borderRadius: '4px', width: '70%' }} />
          <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '45%' }} />
          <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '4px', width: '90%' }} />
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: '22px', background: '#e5e7eb', borderRadius: '4px', width: '60px' }} />
            <div style={{ height: '34px', background: '#e5e7eb', borderRadius: '6px', width: '85px' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);
