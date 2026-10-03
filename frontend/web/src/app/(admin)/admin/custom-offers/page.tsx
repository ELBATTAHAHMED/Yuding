'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminBookings } from '@/hooks/queries/useAdminQueries';

export default function AdminCustomOffersPage() {
  const { data: bookings = [], isLoading } = useAdminBookings({ limit: 100 });

  // Filter bookings with offer snapshots
  const offersWithSnapshots = bookings.filter((b) => b.amount != null && b.provider != null);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Offres Capturées &amp; Snapshots Partenaires
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Instantanés immuables des sélections utilisateurs et offres tarifaires (booking.offer_snapshots)
          </p>
        </div>

        <Link
          href="/admin/bookings"
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(0, 212, 170, 0.1)',
            border: '1px solid #00D4AA',
            color: '#00D4AA',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          Voir Réservations Associées →
        </Link>
      </div>

      {/* Snapshot Inventory Table */}
      <div
        style={{
          background: 'var(--bg-secondary, #111827)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem' }}>RÉFÉRENCE</th>
                <th style={{ padding: '0.85rem 1rem' }}>VERTICALE</th>
                <th style={{ padding: '0.85rem 1rem' }}>FOURNISSEUR SOURCE</th>
                <th style={{ padding: '0.85rem 1rem' }}>PRIX AFFICHÉ</th>
                <th style={{ padding: '0.85rem 1rem' }}>STATUT RÉSERVATION</th>
                <th style={{ padding: '0.85rem 1rem' }}>EXPIRATION OFFRE</th>
                <th style={{ padding: '0.85rem 1rem' }}>DATE CAPTURE</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des snapshots...</td></tr>
              ) : offersWithSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Aucun instantané d&apos;offre trouvé.
                  </td>
                </tr>
              ) : (
                offersWithSnapshots.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#00D4AA' }}>
                      {b.bookingReference}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {b.productType}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background:
                            b.provider === 'NUITEE' ? 'rgba(56, 189, 248, 0.15)' :
                            b.provider === 'SCRAPPA' ? 'rgba(168, 85, 247, 0.15)' :
                            b.provider === 'HBX' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color:
                            b.provider === 'NUITEE' ? '#38bdf8' :
                            b.provider === 'SCRAPPA' ? '#c084fc' :
                            b.provider === 'HBX' ? '#fbbf24' : '#cbd5e1',
                        }}
                      >
                        {b.provider}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 800 }}>
                      {b.amount?.toFixed(2)} {b.currency}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: b.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: b.status === 'PAID' ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {b.expiresAt ? new Date(b.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(b.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
