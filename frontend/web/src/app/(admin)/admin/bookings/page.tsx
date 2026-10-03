'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminBooking } from '@/types/admin.types';

export default function AdminBookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  const { data: bookings = [], isLoading, refetch } = useAdminBookings({
    limit: 100,
    status: statusFilter,
    productType: productFilter,
  });

  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.userId.toLowerCase().includes(term) ||
      (b.provider && b.provider.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Gestion des Réservations V2
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Traçabilité exhaustive du cycle de vie des réservations (schéma booking.bookings)
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
            placeholder="Rechercher par référence YUD-XXXX, UUID utilisateur..."
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
          <option value="ALL">Tous les statuts</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
          <option value="PAID">PAID</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
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
          <option value="ALL">Tous les types de produit</option>
          <option value="HOTEL">HÔTELS</option>
          <option value="FLIGHT">VOLS</option>
          <option value="ACTIVITY">ACTIVITÉS</option>
          <option value="TRANSFER">TRANSFERS</option>
          <option value="TRAIN">TRAINS</option>
        </select>
      </div>

      {/* Bookings Table */}
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
                <th style={{ padding: '0.85rem 1rem' }}>CLIENT (USER ID)</th>
                <th style={{ padding: '0.85rem 1rem' }}>TYPE PRODUIT</th>
                <th style={{ padding: '0.85rem 1rem' }}>FOURNISSEUR</th>
                <th style={{ padding: '0.85rem 1rem' }}>MONTANT</th>
                <th style={{ padding: '0.85rem 1rem' }}>STATUT</th>
                <th style={{ padding: '0.85rem 1rem' }}>CRÉATION</th>
                <th style={{ padding: '0.85rem 1rem' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement des réservations...</td></tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-ticket-alt" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', color: '#475569' }} />
                    Aucune réservation ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#00D4AA' }}>
                      {b.bookingReference}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {b.userId.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {b.productType}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {b.provider || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 700 }}>
                      {b.amount ? `${b.amount.toFixed(2)} ${b.currency}` : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background:
                            b.status === 'PAID' ? 'rgba(16, 185, 129, 0.15)' :
                            b.status === 'PENDING_PAYMENT' ? 'rgba(245, 158, 11, 0.15)' :
                            b.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.15)' :
                            b.status === 'REFUNDED' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color:
                            b.status === 'PAID' ? '#34d399' :
                            b.status === 'PENDING_PAYMENT' ? '#fbbf24' :
                            b.status === 'CANCELLED' ? '#f87171' :
                            b.status === 'REFUNDED' ? '#38bdf8' : '#94a3b8',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(b.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => setSelectedBooking(b)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#00D4AA',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspecter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal Drawer */}
      {selectedBooking && (
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
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#00D4AA', fontWeight: 700, letterSpacing: '0.08em' }}>DOSSIER RÉSERVATION</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0 0 0' }}>
                  {selectedBooking.bookingReference}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UUID Interne</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedBooking.id}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Identifiant Voyageur (User ID)</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedBooking.userId}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Type &amp; Fournisseur</div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>
                  {selectedBooking.productType} ({selectedBooking.provider || 'N/A'})
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Montant Autoritaire</div>
                <div style={{ fontSize: '0.85rem', color: '#00D4AA', fontWeight: 800 }}>
                  {selectedBooking.amount ? `${selectedBooking.amount.toFixed(2)} ${selectedBooking.currency}` : 'Non tarifé'}
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Statut Actuel</div>
                <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>{selectedBooking.status}</div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dernière Mutation d&apos;État</div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {new Date(selectedBooking.statusChangedAt).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            {selectedBooking.providerOfferId && (
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Provider Offer ID</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedBooking.providerOfferId}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedBooking(null)}
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
