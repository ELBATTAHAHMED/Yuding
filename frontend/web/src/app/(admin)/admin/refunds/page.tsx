'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useAdminRefunds,
  useAdminCancellations,
  useAdminBookings,
  useRetryRefundMutation,
} from '@/hooks/queries/useAdminQueries';
import { AdminRefund, AdminCancellation } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { exportToCsv } from '@/lib/admin-csv';

export default function AdminRefundsPage() {
  const [activeTab, setActiveTab] = useState<'REFUNDS' | 'CANCELLATIONS'>('REFUNDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [retryModalItem, setRetryModalItem] = useState<AdminCancellation | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: refunds = [], isLoading: loadingRefunds, refetch: refetchRefunds, isRefetching: refetchingRefunds } = useAdminRefunds(200);
  const { data: cancellations = [], isLoading: loadingCancellations, refetch: refetchCancellations, isRefetching: refetchingCancellations } = useAdminCancellations(200);
  const { data: bookings = [] } = useAdminBookings({ limit: 500 });

  const retryRefundMutation = useRetryRefundMutation();

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const getBookingRef = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    return booking ? booking.bookingReference : bookingId.substring(0, 8) + '...';
  };

  const handleRetryRefund = async () => {
    if (!retryModalItem) return;
    try {
      await retryRefundMutation.mutateAsync(retryModalItem.id);
      showNotification(`Remboursement relancé avec succès pour le dossier ${getBookingRef(retryModalItem.bookingId)}.`);
      setRetryModalItem(null);
      if (selectedItem?.id === retryModalItem.id) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Échec de la relance du remboursement.', 'error');
    }
  };

  // Filter Refunds
  const filteredRefunds = refunds.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const bRef = getBookingRef(r.bookingId).toLowerCase();
    return (
      r.refundReference.toLowerCase().includes(term) ||
      bRef.includes(term) ||
      r.bookingId.toLowerCase().includes(term) ||
      (r.reason && r.reason.toLowerCase().includes(term))
    );
  });

  // Filter Cancellations
  const filteredCancellations = cancellations.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const bRef = getBookingRef(c.bookingId).toLowerCase();
    return (
      bRef.includes(term) ||
      c.bookingId.toLowerCase().includes(term) ||
      c.requestedBy.toLowerCase().includes(term) ||
      (c.reason && c.reason.toLowerCase().includes(term)) ||
      (c.providerCancellationReference && c.providerCancellationReference.toLowerCase().includes(term))
    );
  });

  const paginatedRefunds = filteredRefunds.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const paginatedCancellations = filteredCancellations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalItems = activeTab === 'REFUNDS' ? filteredRefunds.length : filteredCancellations.length;

  const handleExportCsv = () => {
    if (activeTab === 'REFUNDS') {
      const rows = filteredRefunds.map((r) => ({
        RefundRef: r.refundReference,
        BookingId: r.bookingId,
        BookingRef: getBookingRef(r.bookingId),
        Amount: r.amount,
        Currency: r.currency,
        Status: r.status,
        Reason: r.reason || '',
        CreatedAt: r.createdAt,
      }));
      exportToCsv('grand_livre_remboursements_yuding', rows);
    } else {
      const rows = filteredCancellations.map((c) => ({
        CancellationId: c.id,
        BookingId: c.bookingId,
        BookingRef: getBookingRef(c.bookingId),
        RequestedBy: c.requestedBy,
        Status: c.status,
        Policy: c.policyType || 'STANDARD',
        RefundAmount: c.refundAmount ?? 0,
        Fee: c.cancellationFee ?? 0,
        Currency: c.currency || 'MAD',
        RequestedAt: c.requestedAt,
      }));
      exportToCsv('demandes_annulation_yuding', rows);
    }
  };

  const refundColumns = [
    {
      key: 'refundReference',
      header: 'RÉFÉRENCE REMBOURSEMENT',
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular font-extrabold text-xs" style={{ color: '#F87171' }}>
          {r.refundReference}
        </span>
      ),
    },
    {
      key: 'bookingId',
      header: 'DOSSIER RÉSERVATION',
      render: (r: AdminRefund) => (
        <Link
          href={`/admin/bookings?search=${encodeURIComponent(r.bookingId)}`}
          onClick={(e) => e.stopPropagation()}
          className="admin-mono-tabular font-bold text-xs no-underline hover:underline flex items-center gap-1.5"
          style={{ color: 'var(--admin-accent)' }}
        >
          <span>{getBookingRef(r.bookingId)}</span>
          <i className="fas fa-external-link-alt text-[0.6rem] opacity-60" />
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT RECÉDÉ',
      align: 'right' as const,
      render: (r: AdminRefund) => (
        <div className="flex flex-col items-end">
          <span className="admin-mono-tabular font-black text-xs" style={{ color: 'var(--admin-text-primary)' }}>
            {Number(r.amount).toFixed(2)} {r.currency}
          </span>
          <span className="text-[0.625rem] text-red-500 font-semibold">Crédité au client</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIF DU REMBOURSEMENT',
      render: (r: AdminRefund) => (
        <span className="text-xs truncate max-w-[200px] inline-block font-medium" style={{ color: 'var(--admin-text-muted)' }}>
          {r.reason || 'Annulation conforme au barème'}
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
    {
      key: 'actions',
      header: 'ACTIONS',
      align: 'right' as const,
      render: (r: AdminRefund) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedItem(r);
          }}
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded font-bold shadow-2xs"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-file-invoice-dollar text-[0.65rem] mr-1" />
          <span>Ticket</span>
        </button>
      ),
    },
  ];

  const cancellationColumns = [
    {
      key: 'bookingId',
      header: 'DOSSIER RÉSERVATION',
      render: (c: AdminCancellation) => (
        <Link
          href={`/admin/bookings?search=${encodeURIComponent(c.bookingId)}`}
          onClick={(e) => e.stopPropagation()}
          className="admin-mono-tabular font-bold text-xs no-underline hover:underline flex items-center gap-1.5"
          style={{ color: 'var(--admin-accent)' }}
        >
          <span>{getBookingRef(c.bookingId)}</span>
          <i className="fas fa-external-link-alt text-[0.6rem] opacity-60" />
        </Link>
      ),
    },
    {
      key: 'policyType',
      header: 'POLITIQUE APPLIQUÉE',
      render: (c: AdminCancellation) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {c.policyType || 'FLEXIBLE'}
        </span>
      ),
    },
    {
      key: 'formula',
      header: 'DÉCOMPTE FINANCIER',
      align: 'right' as const,
      render: (c: AdminCancellation) => {
        const refundAmt = c.refundAmount ?? 0;
        const fee = c.cancellationFee ?? 0;
        const curr = c.currency || 'MAD';
        return (
          <div className="flex flex-col items-end">
            <span className="admin-mono-tabular font-black text-xs" style={{ color: '#F87171' }}>
              {refundAmt.toFixed(2)} {curr}
            </span>
            <span className="text-[0.625rem] text-slate-400">
              Frais : {fee.toFixed(2)} {curr}
            </span>
          </div>
        );
      },
    },
    {
      key: 'requestedAt',
      header: 'DEMANDE ÉMISE',
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
      header: 'STATUT DU FLUX',
      render: (c: AdminCancellation) => (
        <AdminBadge variant={getStatusBadgeVariant(c.status)} size="sm">
          {c.status}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: 'INTERVENTION',
      align: 'right' as const,
      render: (c: AdminCancellation) => {
        const canRetry = c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED';
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canRetry && (
              <button
                type="button"
                onClick={() => setRetryModalItem(c)}
                className="admin-btn text-[0.7rem] py-1 px-2.5 rounded font-bold shadow-2xs animate-pulse"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#EF4444',
                }}
                title="Relancer le remboursement sur passerelle"
              >
                <i className="fas fa-redo-alt text-[0.65rem] mr-1" />
                <span>Relancer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedItem(c)}
              className="admin-btn text-[0.7rem] py-1 px-2.5 rounded font-semibold"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-secondary)',
              }}
            >
              <i className="fas fa-eye text-[0.65rem]" />
            </button>
          </div>
        );
      },
    },
  ];

  const filterSelects = [
    {
      key: 'status',
      label: 'Statut',
      value: statusFilter,
      onChange: (val: string) => {
        setStatusFilter(val);
        setCurrentPage(1);
      },
      options:
        activeTab === 'REFUNDS'
          ? [
              { label: 'Tous les statuts', value: 'ALL' },
              { label: 'COMPLETED / EXECUTED', value: 'COMPLETED' },
              { label: 'PENDING', value: 'PENDING' },
              { label: 'FAILED', value: 'FAILED' },
            ]
          : [
              { label: 'Tous les statuts', value: 'ALL' },
              { label: 'REFUND_FAILED', value: 'REFUND_FAILED' },
              { label: 'REFUNDED', value: 'REFUNDED' },
              { label: 'CANCELLED_NO_REFUND', value: 'CANCELLED_NO_REFUND' },
              { label: 'REQUESTED', value: 'REQUESTED' },
            ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Remboursements &amp; Annulations
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Flux autoritaire Phase 51 : Calcul du barème d&apos;annulation et exécution des remboursements (payment.refunds)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={totalItems === 0}
            className="admin-btn text-xs py-2 px-3.5 rounded-lg border font-semibold"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <i className="fas fa-file-csv text-xs mr-1 text-emerald-500" />
            <span>Exporter CSV ({totalItems})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in"
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--admin-accent-subtle)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: feedback.type === 'success' ? 'var(--admin-accent-border)' : 'rgba(239, 68, 68, 0.3)',
            color: feedback.type === 'success' ? 'var(--admin-accent)' : '#EF4444',
          }}
        >
          <i className={feedback.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('REFUNDS');
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
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
          onClick={() => {
            setActiveTab('CANCELLATIONS');
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
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
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={
          activeTab === 'REFUNDS'
            ? 'Rechercher REF-XXXX, réservation YUD-XXXX, motif...'
            : 'Rechercher réservation YUD-XXXX, demandeur, politique...'
        }
        filters={filterSelects}
        onRefresh={() => {
          refetchRefunds();
          refetchCancellations();
        }}
        isRefreshing={loadingRefunds || loadingCancellations || refetchingRefunds || refetchingCancellations}
        totalCount={activeTab === 'REFUNDS' ? refunds.length : cancellations.length}
        filteredCount={totalItems}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
          setCurrentPage(1);
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== 'ALL')}
      />

      {/* Active Tab Table with Pagination */}
      {activeTab === 'REFUNDS' ? (
        <AdminTable
          columns={refundColumns}
          data={paginatedRefunds}
          keyExtractor={(r) => r.id}
          isLoading={loadingRefunds}
          onRowClick={(r) => setSelectedItem(r)}
          emptyMessage="Aucun remboursement trouvé"
          footer={
            filteredRefunds.length > 0 ? (
              <AdminPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            ) : null
          }
        />
      ) : (
        <AdminTable
          columns={cancellationColumns}
          data={paginatedCancellations}
          keyExtractor={(c) => c.id}
          isLoading={loadingCancellations}
          onRowClick={(c) => setSelectedItem(c)}
          emptyMessage="Aucune demande d'annulation trouvée"
          footer={
            filteredCancellations.length > 0 ? (
              <AdminPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            ) : null
          }
        />
      )}

      {/* Detail Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.refundReference || getBookingRef(selectedItem?.bookingId || '')}
        subtitle={activeTab === 'REFUNDS' ? 'Reçu d\'exécution du remboursement' : 'Dossier d\'annulation Phase 51'}
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
          <div className="space-y-6">
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Données de l&apos;Opération
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Dossier Réservation
                  </span>
                  <Link
                    href={`/admin/bookings?search=${encodeURIComponent(selectedItem.bookingId)}`}
                    className="font-bold admin-mono-tabular no-underline hover:underline"
                    style={{ color: 'var(--admin-accent)' }}
                  >
                    {getBookingRef(selectedItem.bookingId)}
                  </Link>
                </div>
                {selectedItem.amount != null && (
                  <div>
                    <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                      Montant Recédé
                    </span>
                    <span className="admin-mono-tabular font-extrabold text-sm" style={{ color: '#F87171' }}>
                      {Number(selectedItem.amount).toFixed(2)} {selectedItem.currency}
                    </span>
                  </div>
                )}
                {selectedItem.refundAmount != null && (
                  <div>
                    <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                      Remboursement Net
                    </span>
                    <span className="admin-mono-tabular font-extrabold text-sm" style={{ color: '#F87171' }}>
                      {Number(selectedItem.refundAmount).toFixed(2)} {selectedItem.currency || 'MAD'}
                    </span>
                  </div>
                )}
                {selectedItem.cancellationFee != null && (
                  <div>
                    <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                      Frais Retenus
                    </span>
                    <span className="admin-mono-tabular font-bold" style={{ color: 'var(--admin-text-secondary)' }}>
                      {Number(selectedItem.cancellationFee).toFixed(2)} {selectedItem.currency || 'MAD'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedItem.reason && (
              <div
                className="p-4 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'var(--admin-surface)',
                  borderColor: 'var(--admin-border)',
                }}
              >
                <span className="block text-[0.6875rem] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Motif Fourni
                </span>
                <span className="font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                  {selectedItem.reason}
                </span>
              </div>
            )}
          </div>
        )}
      </AdminDrawer>

      {/* Retry Refund Confirmation Modal */}
      {retryModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setRetryModalItem(null)}
          />
          <div
            className="relative z-10 w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: 'var(--admin-text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-red-500"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <i className="fas fa-undo-alt text-base" />
              </div>
              <div>
                <h3 className="text-base font-black m-0" style={{ color: '#EF4444' }}>
                  Relancer le Remboursement
                </h3>
                <p className="text-xs m-0 truncate" style={{ color: 'var(--admin-text-muted)' }}>
                  Dossier {getBookingRef(retryModalItem.bookingId)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border text-xs space-y-1" style={{ backgroundColor: 'var(--admin-surface-muted)', borderColor: 'var(--admin-border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--admin-text-muted)' }}>Montant à rembourser :</span>
                <span className="font-bold admin-mono-tabular" style={{ color: '#EF4444' }}>
                  {retryModalItem.refundAmount?.toFixed(2)} {retryModalItem.currency || 'MAD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--admin-text-muted)' }}>Fournisseur :</span>
                <span className="font-bold">{retryModalItem.providerName || 'Passerelle'}</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
              Une nouvelle transaction de remboursement va être soumise à la passerelle de paiement. Si la passerelle valide le crédit, le statut passera à <strong>REFUNDED</strong> et sera consigné dans le Journal d&apos;Audit.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <button
                type="button"
                onClick={() => setRetryModalItem(null)}
                className="admin-btn text-xs py-2 px-3 rounded"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--admin-text-muted)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRetryRefund}
                disabled={retryRefundMutation.isPending}
                className="admin-btn text-xs py-2 px-4 rounded font-bold"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                }}
              >
                {retryRefundMutation.isPending ? 'Relance en cours...' : 'Exécuter le Remboursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
