'use client';

import React, { useState } from 'react';
import { useAdminPayments } from '@/hooks/queries/useAdminQueries';
import { AdminPayment } from '@/types/admin.types';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);

  const { data: payments = [], isLoading, refetch } = useAdminPayments({
    limit: 100,
    status: statusFilter,
  });

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(term) ||
      (p.providerTransactionId && p.providerTransactionId.toLowerCase().includes(term)) ||
      (p.providerName && p.providerName.toLowerCase().includes(term)) ||
      p.bookingId.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Grand Livre des Paiements &amp; Transactions
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Enregistrements immuables du schéma payment.payments et passerelles financières
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

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Rechercher par référence PAY-XXXX, ID transaction, UUID réservation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              background: 'var(--bg-secondary, #111827)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#90a4ae',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--bg-secondary, #111827)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">Tous les statuts de paiement</option>
          <option value="SUCCEEDED">SUCCEEDED (Validé)</option>
          <option value="REQUIRES_ACTION">REQUIRES_ACTION</option>
          <option value="FAILED">FAILED (Échoué)</option>
          <option value="REFUNDED">REFUNDED (Remboursé)</option>
        </select>
      </div>

      {/* Payments Table */}
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
                <th style={{ padding: '0.85rem 1rem' }}>RÉSERVATION ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>PASSERELLE</th>
                <th style={{ padding: '0.85rem 1rem' }}>MÉTHODE</th>
                <th style={{ padding: '0.85rem 1rem' }}>MONTANT</th>
                <th style={{ padding: '0.85rem 1rem' }}>STATUT</th>
                <th style={{ padding: '0.85rem 1rem' }}>TRANSACTION ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>DATE</th>
                <th style={{ padding: '0.85rem 1rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement du grand livre...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-credit-card" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', color: '#475569' }} />
                    Aucune transaction trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                      {p.paymentReference}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {p.bookingId.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 700 }}>
                        {p.providerName}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {p.paymentMethodType || 'Standard'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 800 }}>
                      {p.amount.toFixed(2)} {p.currency}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
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
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {p.providerTransactionId || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => setSelectedPayment(p)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedPayment(null)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.08em' }}>TRANSACTION PAIEMENT</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0 0 0' }}>
                  {selectedPayment.paymentReference}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UUID Paiement</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedPayment.id}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UUID Réservation liée</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedPayment.bookingId}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Passerelle &amp; Méthode</div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>
                  {selectedPayment.providerName} ({selectedPayment.paymentMethodType || 'Standard'})
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Montant &amp; Devise</div>
                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 800 }}>
                  {selectedPayment.amount.toFixed(2)} {selectedPayment.currency}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Statut Transaction</div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>{selectedPayment.status}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date Traitement</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {new Date(selectedPayment.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            {selectedPayment.providerTransactionId && (
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID de Transaction Fournisseur (Capture / Gateway)</div>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700 }}>
                  {selectedPayment.providerTransactionId}
                </div>
              </div>
            )}

            {selectedPayment.errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700 }}>Message d&apos;Erreur Passerelle</div>
                <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                  {selectedPayment.errorMessage}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
