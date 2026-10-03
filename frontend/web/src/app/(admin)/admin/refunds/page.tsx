'use client';

import React, { useState } from 'react';
import { useAdminRefunds, useAdminCancellations } from '@/hooks/queries/useAdminQueries';
import { AdminRefund, AdminCancellation } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminRefundsPage() {
  const [activeTab, setActiveTab] = useState<'REFUNDS' | 'CANCELLATIONS'>('REFUNDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { data: refunds = [], isLoading: loadingRefunds, refetch: refetchRefunds, isRefetching: refetchingRefunds } = useAdminRefunds(100);
  const { data: cancellations = [], isLoading: loadingCancellations, refetch: refetchCancellations, isRefetching: refetchingCancellations } = useAdminCancellations(100);

  const filteredRefunds = refunds.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.refundReference.toLowerCase().includes(term) ||
      r.bookingId.toLowerCase().includes(term) ||
      (r.reason && r.reason.toLowerCase().includes(term))
    );
  });

  const filteredCancellations = cancellations.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.bookingId.toLowerCase().includes(term) ||
      c.requestedBy.toLowerCase().includes(term) ||
      (c.reason && c.reason.toLowerCase().includes(term))
    );
  });

  const refundColumns = [
    {
      key: 'refundReference',
      header: 'RÉFÉRENCE',
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: '#F87171' }}>
          {r.refundReference}
        </span>
      ),
    },
    {
      key: 'bookingId',
      header: 'RÉSERVATION',
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {r.bookingId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT REMBOURSÉ',
      align: 'right' as const,
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {Number(r.amount).toFixed(2)} {r.currency}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIF',
      render: (r: AdminRefund) => (
        <span className="text-xs truncate max-w-[200px] inline-block" style={{ color: 'var(--admin-text-muted)' }}>
          {r.reason || 'Demande client standard'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'DATE EXÉCUTION',
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(r.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUT',
      render: (r: AdminRefund) => (
        <AdminBadge variant={getStatusBadgeVariant(r.status)} size="sm">
          {r.status}
        </AdminBadge>
      ),
    },
  ];

  const cancellationColumns = [
    {
      key: 'bookingId',
      header: 'RÉSERVATION ASSOCIÉE',
      render: (c: AdminCancellation) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
          {c.bookingId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'requestedBy',
      header: 'DEMANDEUR',
      render: (c: AdminCancellation) => (
        <span className="text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
          {c.requestedBy}
        </span>
      ),
    },
    {
      key: 'policyType',
      header: 'POLITIQUE',
      render: (c: AdminCancellation) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-bold"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-primary)',
          }}
        >
          {c.policyType || 'STANDARD'}
        </span>
      ),
    },
    {
      key: 'refundAmount',
      header: 'REMBOURSEMENT CALCULÉ',
      align: 'right' as const,
      render: (c: AdminCancellation) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: '#F87171' }}>
          {c.refundAmount != null ? `${Number(c.refundAmount).toFixed(2)} ${c.currency || 'EUR'}` : '—'}
        </span>
      ),
    },
    {
      key: 'requestedAt',
      header: 'DATE DE DEMANDE',
      render: (c: AdminCancellation) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(c.requestedAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUT DEMANDE',
      render: (c: AdminCancellation) => (
        <AdminBadge variant={getStatusBadgeVariant(c.status)} size="sm">
          {c.status}
        </AdminBadge>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Remboursements &amp; Annulations
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Flux d&apos;annulation unifié Phase 51 et enregistrements financiers (payment.refunds &amp; booking.cancellation_requests)
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('REFUNDS')}
          className={`admin-btn text-xs py-2 px-3.5 rounded-lg border transition-all ${
            activeTab === 'REFUNDS' ? 'shadow-xs font-bold' : 'opacity-70 font-semibold'
          }`}
          style={{
            backgroundColor: activeTab === 'REFUNDS' ? 'var(--admin-surface)' : 'transparent',
            borderColor: activeTab === 'REFUNDS' ? 'var(--admin-border-strong)' : 'transparent',
            color: activeTab === 'REFUNDS' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
          }}
        >
          <i className="fas fa-undo-alt text-xs" style={{ color: '#F87171' }} />
          <span>Grand Livre des Remboursements</span>
          <span className="admin-mono-tabular text-[0.6875rem] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 ml-1">
            {refunds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CANCELLATIONS')}
          className={`admin-btn text-xs py-2 px-3.5 rounded-lg border transition-all ${
            activeTab === 'CANCELLATIONS' ? 'shadow-xs font-bold' : 'opacity-70 font-semibold'
          }`}
          style={{
            backgroundColor: activeTab === 'CANCELLATIONS' ? 'var(--admin-surface)' : 'transparent',
            borderColor: activeTab === 'CANCELLATIONS' ? 'var(--admin-border-strong)' : 'transparent',
            color: activeTab === 'CANCELLATIONS' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
          }}
        >
          <i className="fas fa-ban text-xs" style={{ color: '#F59E0B' }} />
          <span>Demandes d&apos;Annulation (Phase 51)</span>
          <span className="admin-mono-tabular text-[0.6875rem] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 ml-1">
            {cancellations.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          activeTab === 'REFUNDS'
            ? 'Rechercher REF-XXXX, UUID réservation, motif...'
            : 'Rechercher UUID réservation, demandeur, motif...'
        }
        onRefresh={() => {
          refetchRefunds();
          refetchCancellations();
        }}
        isRefreshing={loadingRefunds || loadingCancellations || refetchingRefunds || refetchingCancellations}
        totalCount={activeTab === 'REFUNDS' ? refunds.length : cancellations.length}
        filteredCount={activeTab === 'REFUNDS' ? filteredRefunds.length : filteredCancellations.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Active Tab Table */}
      {activeTab === 'REFUNDS' ? (
        <AdminTable
          columns={refundColumns}
          data={filteredRefunds}
          keyExtractor={(r) => r.id}
          isLoading={loadingRefunds}
          onRowClick={(r) => setSelectedItem(r)}
          emptyMessage="Aucun remboursement trouvé"
        />
      ) : (
        <AdminTable
          columns={cancellationColumns}
          data={filteredCancellations}
          keyExtractor={(c) => c.id}
          isLoading={loadingCancellations}
          onRowClick={(c) => setSelectedItem(c)}
          emptyMessage="Aucune demande d'annulation trouvée"
        />
      )}

      {/* Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.refundReference || selectedItem?.bookingId || 'Détail'}
        subtitle="Inspection de l'opération"
        badge={
          selectedItem && (
            <AdminBadge variant={getStatusBadgeVariant(selectedItem.status)} size="sm">
              {selectedItem.status}
            </AdminBadge>
          )
        }
        rawJson={selectedItem}
      >
        {selectedItem && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4 rounded-lg border space-y-2"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="font-bold uppercase tracking-wider text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                Données de l&apos;Opération
              </div>
              <div>
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Réservation
                </span>
                <span className="admin-mono-tabular font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {selectedItem.bookingId}
                </span>
              </div>
              {selectedItem.amount != null && (
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Montant Remboursé
                  </span>
                  <span className="admin-mono-tabular font-extrabold text-sm" style={{ color: '#F87171' }}>
                    {Number(selectedItem.amount).toFixed(2)} {selectedItem.currency}
                  </span>
                </div>
              )}
              {selectedItem.reason && (
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Motif / Justificatif
                  </span>
                  <span style={{ color: 'var(--admin-text-secondary)' }}>{selectedItem.reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
