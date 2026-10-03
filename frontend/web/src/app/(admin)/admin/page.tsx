'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminStats, useAdminBookings, useAdminPayments, useProviderHealth } from '@/hooks/queries/useAdminQueries';

export default function AdminOverviewPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: recentBookings = [], isLoading: loadingBookings } = useAdminBookings({ limit: 5 });
  const { data: recentPayments = [], isLoading: loadingPayments } = useAdminPayments({ limit: 5 });
  const { data: providerHealth = [] } = useProviderHealth();

  const upProviders = providerHealth.filter((p) => p.status === 'UP').length;
  const totalProviders = providerHealth.length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Title bar */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            Console des Opérations Yuding
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Métriques d&apos;activité consolidées en temps réel sur les domaines Booking, Payment, Travel &amp; AI
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: '#34d399',
              fontWeight: 600,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span>Systèmes opérationnels ({upProviders}/{totalProviders})</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Bookings */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.4rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>RÉSERVATIONS TOTALES</span>
            <i className="fas fa-ticket-alt" style={{ color: '#00D4AA' }} />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.5rem' }}>
            {loadingStats ? '...' : (stats?.totalReservations ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            Vols, hôtels, activités &amp; transferts
          </div>
        </div>

        {/* Total Payments */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.4rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>TRANSACTIONS PAIEMENTS</span>
            <i className="fas fa-credit-card" style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.5rem' }}>
            {loadingStats ? '...' : (stats?.totalPayments ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
            Passerelle PayPal &amp; transactions sécurisées
          </div>
        </div>

        {/* Revenue */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.4rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>VOLUME TRANSACTIONNEL</span>
            <i className="fas fa-coins" style={{ color: '#fbbf24' }} />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.5rem' }}>
            {loadingStats ? '...' : `${(stats?.totalRevenue ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.4rem' }}>
            Paiements validés &amp; capturés
          </div>
        </div>

        {/* Refunds & Cancellations */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.4rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>REMBOURSEMENTS &amp; ANNULATIONS</span>
            <i className="fas fa-undo-alt" style={{ color: '#f87171' }} />
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.5rem' }}>
            {loadingStats ? '...' : `${stats?.totalRefunds ?? 0} / ${stats?.totalCancellations ?? 0}`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            {loadingStats ? '...' : `${(stats?.totalRefundedAmount ?? 0).toFixed(2)} € remboursés`}
          </div>
        </div>
      </div>

      {/* Breakdowns section */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          {/* Vertical product breakdown */}
          <div
            style={{
              background: 'var(--bg-secondary, #111827)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem 0' }}>
              Répartition par Type de Produit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.bookingsByProduct &&
                Object.entries(stats.bookingsByProduct).map(([type, count]) => {
                  const percent = Math.round((count / (stats.totalReservations || 1)) * 100);
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                        <span>{type}</span>
                        <span style={{ fontWeight: 700 }}>{count} ({percent}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: '#00D4AA', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Booking lifecycle status breakdown */}
          <div
            style={{
              background: 'var(--bg-secondary, #111827)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem 0' }}>
              Statut du Cycle de Vie des Réservations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.bookingsByStatus &&
                Object.entries(stats.bookingsByStatus).map(([st, count]) => {
                  const percent = Math.round((count / (stats.totalReservations || 1)) * 100);
                  const color =
                    st === 'PAID' ? '#10b981' :
                    st === 'PENDING_PAYMENT' ? '#f59e0b' :
                    st === 'EXPIRED' ? '#64748b' :
                    st === 'CANCELLED' ? '#ef4444' : '#38bdf8';
                  return (
                    <div key={st}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                        <span>{st}</span>
                        <span style={{ fontWeight: 700 }}>{count} ({percent}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Operational Activity Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Bookings */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Dernières Réservations V2
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>Directement depuis le schéma booking.bookings</p>
            </div>
            <Link
              href="/admin/bookings"
              style={{
                fontSize: '0.8rem',
                color: '#00D4AA',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Voir tout ({stats?.totalReservations ?? 0}) →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.07)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>RÉFÉRENCE</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>TYPE</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>MONTANT</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>STATUT</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {loadingBookings ? (
                  <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des réservations...</td></tr>
                ) : recentBookings.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Aucune réservation enregistrée.</td></tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {b.bookingReference}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#cbd5e1' }}>
                        {b.productType}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#f8fafc', fontWeight: 600 }}>
                        {b.amount ? `${b.amount.toFixed(2)} ${b.currency}` : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              b.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' :
                              b.status === 'PENDING_PAYMENT' ? 'rgba(245, 158, 11, 0.15)' :
                              b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color:
                              b.status === 'PAID' ? '#34d399' :
                              b.status === 'PENDING_PAYMENT' ? '#fbbf24' :
                              b.status === 'CANCELLED' ? '#f87171' : '#94a3b8',
                          }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {new Date(b.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Grand Livre des Paiements
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>Directement depuis le schéma payment.payments</p>
            </div>
            <Link
              href="/admin/payments"
              style={{
                fontSize: '0.8rem',
                color: '#00D4AA',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Voir tout ({stats?.totalPayments ?? 0}) →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.07)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>RÉFÉRENCE</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>FOURNISSEUR</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>MONTANT</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>STATUT</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {loadingPayments ? (
                  <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des paiements...</td></tr>
                ) : recentPayments.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>Aucun paiement enregistré.</td></tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {p.paymentReference}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#cbd5e1' }}>
                        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem' }}>
                          {p.providerName}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#f8fafc', fontWeight: 700 }}>
                        {p.amount.toFixed(2)} {p.currency}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              p.status === 'SUCCEEDED' ? 'rgba(16, 185, 129, 0.15)' :
                              p.status === 'REFUNDED' ? 'rgba(56, 189, 248, 0.15)' :
                              p.status === 'FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color:
                              p.status === 'SUCCEEDED' ? '#34d399' :
                              p.status === 'REFUNDED' ? '#38bdf8' :
                              p.status === 'FAILED' ? '#f87171' : '#fbbf24',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
