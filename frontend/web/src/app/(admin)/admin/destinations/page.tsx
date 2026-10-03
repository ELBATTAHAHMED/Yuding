'use client';

import React from 'react';
import { useAdminDestinations } from '@/hooks/queries/useAdminQueries';

export default function AdminDestinationsPage() {
  const { data: destinations = [], isLoading, refetch } = useAdminDestinations();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Destinations Phares &amp; Éditoriales
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Catalogue des régions et villes marocaines enregistrées dans le schéma travel.destinations
          </p>
        </div>

        <button
          onClick={() => refetch()}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(0, 212, 170, 0.1)',
            border: '1px solid #00D4AA',
            color: '#00D4AA',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <i className="fas fa-sync" />
          Actualiser
        </button>
      </div>

      {/* Grid of destinations */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3rem', color: '#64748b' }}>Chargement des destinations...</div>
        ) : (
          destinations.map((d) => (
            <div
              key={d.id}
              style={{
                background: 'var(--bg-secondary, #111827)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  height: '140px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '1.25rem',
                }}
              >
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: d.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: d.isActive ? '#34d399' : '#f87171',
                    }}
                  >
                    {d.isActive ? 'ACTIF' : 'INACTIF'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#00D4AA', fontWeight: 700, textTransform: 'uppercase' }}>
                    {d.countryName} ({d.countryCode})
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0.1rem 0 0 0' }}>
                    {d.name}
                  </h3>
                </div>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Ville :</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{d.city}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Slug URL :</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.slug}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>UUID Base :</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.id.slice(0, 13)}...</span>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>travel.destinations</span>
                  <span style={{ fontSize: '0.75rem', color: '#00D4AA', fontWeight: 600 }}>Référencé en production</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
