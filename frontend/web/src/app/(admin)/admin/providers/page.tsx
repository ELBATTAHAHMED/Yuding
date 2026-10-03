'use client';

import React from 'react';
import { useProviderHealth } from '@/hooks/queries/useAdminQueries';

export default function AdminProvidersPage() {
  const { data: providers = [], isLoading, refetch } = useProviderHealth();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Santé des Fournisseurs &amp; Architecture
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Surveillance en temps réel de l&apos;écosystème microservices Spring Boot, base de données, cache et APIs partenaires
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
          Actualiser le statut
        </button>
      </div>

      {/* Grid of Providers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3rem', color: '#64748b' }}>Sondage des services en cours...</div>
        ) : (
          providers.map((p) => (
            <div
              key={p.name}
              style={{
                background: 'var(--bg-secondary, #111827)',
                padding: '1.4rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background:
                      p.type === 'MICROSERVICE' ? 'rgba(56, 189, 248, 0.15)' :
                      p.type === 'INFRASTRUCTURE' ? 'rgba(168, 85, 247, 0.15)' :
                      p.type === 'TRAVEL_PROVIDER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color:
                      p.type === 'MICROSERVICE' ? '#38bdf8' :
                      p.type === 'INFRASTRUCTURE' ? '#c084fc' :
                      p.type === 'TRAVEL_PROVIDER' ? '#fbbf24' : '#34d399',
                  }}
                >
                  {p.type}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: p.status === 'UP' ? '#10b981' : '#ef4444',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.status === 'UP' ? '#34d399' : '#f87171' }}>
                    {p.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {p.name}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                  {p.details}
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                <span>Port {p.port || 'API Ext.'}</span>
                <span>Vérifié : {new Date(p.lastChecked).toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
