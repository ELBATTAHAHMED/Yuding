'use client';

import React from 'react';

export default function AdminApiUsagePage() {
  const routes = [
    { method: 'POST', path: '/auth/login', service: 'IDENTITY-SERVICE', rateLimit: '50 req/min', authRequired: 'Non', status: '200 OK' },
    { method: 'GET', path: '/admin/users', service: 'IDENTITY-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/stats', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/bookings', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/payments', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apic/reviews/moderation', service: 'COMMENTAIRE-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'POST', path: '/api/ai/conversations', service: 'AI-SERVICE', rateLimit: '20 req/min', authRequired: 'JWT', status: '200 OK' },
    { method: 'GET', path: '/travel/flights/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Non', status: '200 OK' },
    { method: 'GET', path: '/travel/hotels/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Non', status: '200 OK' },
    { method: 'GET', path: '/travel/activities/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Non', status: '200 OK' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
          Consommation &amp; Routage API Gateway
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Topologie du Spring Cloud Gateway (port 8888), politique de rate-limiting Redis et quotas
        </p>
      </div>

      {/* Gateway Architecture Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>GATEWAY LISTENER</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>Port 8888</div>
          <div style={{ fontSize: '0.75rem', color: '#00D4AA', marginTop: '0.2rem' }}>Single backend entrypoint</div>
        </div>

        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>RATE LIMITER</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>Redis 7.4.11</div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>Token bucket par IP</div>
        </div>

        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>DÉFENSE EN PROFONDEUR</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>RS256 JWT</div>
          <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '0.2rem' }}>En-têtes X-User-* neutralisés</div>
        </div>
      </div>

      {/* Routes Table */}
      <div
        style={{
          background: 'var(--bg-secondary, #111827)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Routes Gateway Déclarées &amp; Politiques de Sécurité
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem' }}>MÉTHODE</th>
                <th style={{ padding: '0.85rem 1rem' }}>CHEMIN PASSERELLE</th>
                <th style={{ padding: '0.85rem 1rem' }}>SERVICE CIBLE</th>
                <th style={{ padding: '0.85rem 1rem' }}>RATE LIMIT</th>
                <th style={{ padding: '0.85rem 1rem' }}>AUTORISATION</th>
                <th style={{ padding: '0.85rem 1rem' }}>STATUT</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: r.method === 'GET' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: r.method === 'GET' ? '#38bdf8' : '#34d399',
                      }}
                    >
                      {r.method}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>
                    {r.path}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                    {r.service}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {r.rateLimit}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                    {r.authRequired}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontSize: '0.8rem', fontWeight: 700 }}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
