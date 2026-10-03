'use client';

import React, { useState } from 'react';
import { useAdminRefunds, useAdminCancellations } from '@/hooks/queries/useAdminQueries';

export default function AdminRefundsPage() {
  const [activeTab, setActiveTab] = useState<'REFUNDS' | 'CANCELLATIONS'>('REFUNDS');
  const { data: refunds = [], isLoading: loadingRefunds, refetch: refetchRefunds } = useAdminRefunds(50);
  const { data: cancellations = [], isLoading: loadingCancellations, refetch: refetchCancellations } = useAdminCancellations(50);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Remboursements &amp; Annulations
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Supervision du flux d&apos;annulation unifié Phase 51 et des remboursements exécutés (payment.refunds)
          </p>
        </div>

        <button
          onClick={() => {
            refetchRefunds();
            refetchCancellations();
          }}
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('REFUNDS')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'REFUNDS' ? 'rgba(0, 212, 170, 0.15)' : 'transparent',
            color: activeTab === 'REFUNDS' ? '#00D4AA' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Grand Livre des Remboursements ({refunds.length})
        </button>
        <button
          onClick={() => setActiveTab('CANCELLATIONS')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'CANCELLATIONS' ? 'rgba(0, 212, 170, 0.15)' : 'transparent',
            color: activeTab === 'CANCELLATIONS' ? '#00D4AA' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Demandes d&apos;Annulation ({cancellations.length})
        </button>
      </div>

      {activeTab === 'REFUNDS' ? (
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
                  <th style={{ padding: '0.85rem 1rem' }}>RÉFÉRENCE REMBOURSEMENT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>RÉSERVATION ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MONTANT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MOTIF</th>
                  <th style={{ padding: '0.85rem 1rem' }}>PROVIDER REFUND ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {loadingRefunds ? (
                  <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des remboursements...</td></tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Aucun remboursement exécuté pour le moment.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                        {r.refundReference}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {r.bookingId.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 800 }}>
                        {r.amount.toFixed(2)} {r.currency}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: r.status === 'SUCCEEDED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: r.status === 'SUCCEEDED' ? '#34d399' : '#f87171',
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {r.reason || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {r.providerRefundId || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                  <th style={{ padding: '0.85rem 1rem' }}>RÉSERVATION ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>POLITIQUE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>FOURNISSEUR</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUT ANNULATION</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REMBOURSEMENT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUT REMBOURSEMENT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>DATE DEMANDE</th>
                </tr>
              </thead>
              <tbody>
                {loadingCancellations ? (
                  <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des demandes...</td></tr>
                ) : cancellations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Aucune demande d&apos;annulation enregistrée.
                    </td>
                  </tr>
                ) : (
                  cancellations.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                        {c.bookingId.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {c.policyType || 'STANDARD'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                        {c.providerName || 'YUDING_DEMO'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: c.status === 'CANCELLED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: c.status === 'CANCELLED' ? '#34d399' : '#f87171',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 700 }}>
                        {c.refundAmount != null ? `${c.refundAmount.toFixed(2)} ${c.currency || 'EUR'}` : '0.00 EUR'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: c.refundStatus === 'PROCESSED' ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                          {c.refundStatus || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {new Date(c.requestedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
