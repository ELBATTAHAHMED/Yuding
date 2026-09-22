import React from 'react';

export const DetailLoadingSkeleton: React.FC = () => {
  return (
    <div style={{ maxWidth: '1150px', margin: '2rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back button placeholder */}
      <div className="animate-pulse" style={{ width: '140px', height: '36px', background: '#e2e8f0', borderRadius: '6px' }} />

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Skeleton */}
          <div className="animate-pulse" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#e2e8f0', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ height: '22px', background: '#e2e8f0', borderRadius: '4px', width: '70%' }} />
              <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '4px', width: '40%' }} />
            </div>
          </div>

          {/* Timeline / Body Skeleton */}
          <div className="animate-pulse" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', width: '30%' }} />
            <div style={{ height: '100px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <div style={{ height: '100px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div>
          <div className="animate-pulse" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', width: '50%' }} />
            <div style={{ height: '36px', background: '#e2e8f0', borderRadius: '6px', width: '65%' }} />
            <div style={{ height: '44px', background: '#e2e8f0', borderRadius: '8px', width: '100%', marginTop: '0.5rem' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
