'use client';

import React, { useState } from 'react';
import { useAdminPayments } from '@/hooks/queries/useAdminQueries';
import { AdminPayment } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: payments = [], isLoading, refetch, isRefetching } = useAdminPayments({
    limit: 100,
    status: statusFilter,
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

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

  const columns = [
    {
      key: 'paymentReference',
      header: 'RÉFÉRENCE',
      render: (p: AdminPayment) => (
        <div className="flex items-center gap-1.5">
          <span className="admin-mono-tabular font-bold text-xs" style={{ color: '#38BDF8' }}>
            {p.paymentReference}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(p.paymentReference, p.id);
            }}
            className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
            title="Copier la référence"
          >
            <i className={`fas ${copiedId === p.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-[0.65rem]`} />
          </button>
        </div>
      ),
    },
    {
      key: 'bookingId',
      header: 'RÉSERVATION ASSOCIÉE',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {p.bookingId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'providerName',
      header: 'PASSERELLE',
      render: (p: AdminPayment) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          {p.providerName}
        </span>
      ),
    },
    {
      key: 'providerTransactionId',
      header: 'ID TRANSACTION FOURNISSEUR',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs truncate max-w-[150px] inline-block" style={{ color: 'var(--admin-text-muted)' }}>
          {p.providerTransactionId || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT',
      align: 'right' as const,
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {Number(p.amount).toFixed(2)} {p.currency}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'DATE TRANSACT.',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(p.createdAt).toLocaleDateString('fr-FR', {
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
      render: (p: AdminPayment) => (
        <AdminBadge variant={getStatusBadgeVariant(p.status)} size="sm">
          {p.status}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right' as const,
      render: (p: AdminPayment) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPayment(p);
          }}
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-eye text-[0.65rem]" />
          <span>Inspecter</span>
        </button>
      ),
    },
  ];

  const filterSelects = [
    {
      key: 'status',
      label: 'Statut',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: 'Tous les statuts', value: 'ALL' },
        { label: 'COMPLETED / PAID', value: 'COMPLETED' },
        { label: 'PENDING', value: 'PENDING' },
        { label: 'FAILED', value: 'FAILED' },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Grand Livre des Paiements
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Transactions immuables, captures de passerelles et horodatages financiers (payment.payments)
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher PAY-XXXX, ID transaction, UUID réservation..."
        filters={filterSelects}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={payments.length}
        filteredCount={filteredPayments.length}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== 'ALL')}
      />

      {/* Main Table */}
      <AdminTable
        columns={columns}
        data={filteredPayments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        onRowClick={(p) => setSelectedPayment(p)}
        emptyMessage="Aucun paiement trouvé"
        emptySubtext="Aucune transaction ne correspond aux filtres appliqués."
      />

      {/* Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment ? selectedPayment.paymentReference : ''}
        subtitle="Détail de la transaction financière"
        badge={
          selectedPayment && (
            <AdminBadge variant={getStatusBadgeVariant(selectedPayment.status)} size="sm">
              {selectedPayment.status}
            </AdminBadge>
          )
        }
        rawJson={selectedPayment}
      >
        {selectedPayment && (
          <div className="space-y-6">
            {/* Financial Details */}
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Données Transactionnelles
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Montant Capturé
                  </span>
                  <span className="text-base font-extrabold admin-mono-tabular" style={{ color: '#38BDF8' }}>
                    {Number(selectedPayment.amount).toFixed(2)} {selectedPayment.currency}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Passerelle Utilisée
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedPayment.providerName}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Type de Moyen
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                    {selectedPayment.paymentMethodType || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    ID Transaction Fournisseur
                  </span>
                  <span className="admin-mono-tabular font-medium break-all" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedPayment.providerTransactionId || 'Non fourni'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message if failed */}
            {selectedPayment.errorMessage && (
              <div
                className="p-4 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                }}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <i className="fas fa-exclamation-triangle" />
                  <span>Raison de l&apos;échec :</span>
                </div>
                <div className="admin-mono-tabular">{selectedPayment.errorMessage}</div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-2 border-l-2 ml-2 pl-4" style={{ borderColor: 'var(--admin-accent-border)' }}>
              <div className="text-xs">
                <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  Initiation du paiement
                </div>
                <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(selectedPayment.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
              <div className="text-xs mt-3">
                <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  Dernière mise à jour
                </div>
                <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(selectedPayment.updatedAt).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
