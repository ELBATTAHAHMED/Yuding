'use client';

import React from 'react';
import { AdminStats } from '@/types/admin.types';
import {
  useAdminStats,
  useAdminRecentReservations,
  useAdminRecentPayments,
} from '@/hooks/queries/useAdminQueries';

export default function AdminOverviewPage() {
  const { data: statsData, isLoading: loadingStats } = useAdminStats();
  const { data: recentReservations = [], isLoading: loadingRes } = useAdminRecentReservations();
  const { data: recentPayments = [], isLoading: loadingPay } = useAdminRecentPayments();

  const stats: AdminStats = statsData || {
    totalReservations: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalHebergements: 0,
    totalTransports: 0,
    totalActivites: 0,
  };
  const loading = loadingStats || loadingRes || loadingPay;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
          Tableau de Bord &amp; Indicateurs Clés
        </h1>
        <p style={{ color: '#b0bec5', fontSize: '0.95rem' }}>
          Vue d&apos;ensemble de l&apos;activité de la plateforme Yuding
        </p>
      </div>

      {/* Stats Cards */}
      <div
        className="stats-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-ticket" style={{ fontSize: '1.8rem', color: '#00D4AA', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalReservations}</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Total réservations</p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-credit-card" style={{ fontSize: '1.8rem', color: '#29b6f6', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalPayments}</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Total paiements</p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-coins" style={{ fontSize: '1.8rem', color: '#ffd54f', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalRevenue.toLocaleString()} €</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Revenu total</p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-bed" style={{ fontSize: '1.8rem', color: '#ab47bc', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalHebergements}</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Hébergements actifs</p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-bus" style={{ fontSize: '1.8rem', color: '#26a69a', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalTransports}</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Transports catalogués</p>
        </div>

        <div
          className="stat-card"
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <i className="fas fa-calendar-alt" style={{ fontSize: '1.8rem', color: '#ff7043', marginBottom: '0.5rem' }}></i>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.totalActivites}</h3>
          <p style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Activités disponibles</p>
        </div>
      </div>

      {/* Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        {/* Recent Reservations */}
        <div
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.75rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Dernières réservations</h2>
            <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(0, 212, 170, 0.15)', color: '#00D4AA', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              {recentReservations.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', color: '#b0bec5' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#90a4ae' }}>
                  <th style={{ padding: '0.6rem' }}>ID</th>
                  <th style={{ padding: '0.6rem' }}>Service</th>
                  <th style={{ padding: '0.6rem' }}>Dates</th>
                  <th style={{ padding: '0.6rem' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.6rem', color: '#fff', fontWeight: 600 }}>#{r.idr || idx + 1}</td>
                    <td style={{ padding: '0.6rem' }}>{r.details || 'Hôtel Yuding'}</td>
                    <td style={{ padding: '0.6rem' }}>{r.dateDepart}</td>
                    <td style={{ padding: '0.6rem', color: '#00D4AA', fontWeight: 700 }}>{r.prixTotal || 120} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div
          style={{
            background: 'var(--bg-secondary, #1A1F2E)',
            padding: '1.75rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Derniers paiements</h2>
            <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(41, 182, 246, 0.15)', color: '#29b6f6', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
              {recentPayments.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', color: '#b0bec5' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#90a4ae' }}>
                  <th style={{ padding: '0.6rem' }}>ID</th>
                  <th style={{ padding: '0.6rem' }}>Mode</th>
                  <th style={{ padding: '0.6rem' }}>Date</th>
                  <th style={{ padding: '0.6rem' }}>Statut</th>
                  <th style={{ padding: '0.6rem' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.6rem', color: '#fff', fontWeight: 600 }}>#{p.idp || idx + 1}</td>
                    <td style={{ padding: '0.6rem' }}>{p.mode || 'CARTE'}</td>
                    <td style={{ padding: '0.6rem' }}>{p.datePaiement || '2026-09-19'}</td>
                    <td style={{ padding: '0.6rem' }}>
                      <span style={{ padding: '0.15rem 0.5rem', background: '#1b5e20', color: '#a5d6a7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {p.status || 'VALIDE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem', color: '#00D4AA', fontWeight: 700 }}>{p.montant} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
