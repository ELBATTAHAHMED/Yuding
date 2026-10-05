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
        <span className="admin-mono-tabular font-bold text-xs text-rose-600 dark:text-rose-400">
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
          className="admin-mono-tabular font-semibold text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 no-underline"
        >
          <span>{getBookingRef(r.bookingId)}</span>
          <i className="fas fa-external-link-alt text-[9px] opacity-60" />
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT RECÉDÉ',
      align: 'right' as const,
      render: (r: AdminRefund) => (
        <div className="flex flex-col items-end">
          <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-slate-100">
            {Number(r.amount).toFixed(2)} {r.currency}
          </span>
          <span className="text-[10px] text-rose-500 font-semibold">Crédité au client</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIF DU REMBOURSEMENT',
      render: (r: AdminRefund) => (
        <span className="text-xs truncate max-w-[200px] inline-block font-medium text-slate-600 dark:text-slate-300">
          {r.reason || 'Annulation conforme au barème'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'DATE EXÉCUTION',
      render: (r: AdminRefund) => (
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {new Date(r.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
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
          className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
        >
          <i className="fas fa-file-invoice-dollar text-[10px] mr-1" />
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
          className="admin-mono-tabular font-semibold text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 no-underline"
        >
          <span>{getBookingRef(c.bookingId)}</span>
          <i className="fas fa-external-link-alt text-[9px] opacity-60" />
        </Link>
      ),
    },
    {
      key: 'policyType',
      header: 'POLITIQUE APPLIQUÉE',
      render: (c: AdminCancellation) => (
        <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
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
            <span className="admin-mono-tabular font-bold text-xs text-rose-600 dark:text-rose-400">
              {refundAmt.toFixed(2)} {curr}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {new Date(c.requestedAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
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
                className="text-xs font-bold py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors shadow-2xs animate-pulse"
                title="Relancer le remboursement sur passerelle"
              >
                <i className="fas fa-redo-alt text-[10px] mr-1" />
                <span>Relancer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedItem(c)}
              className="text-xs font-semibold py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
            >
              <i className="fas fa-eye text-[10px]" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Remboursements &amp; Annulations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Flux autoritaire Phase 51 : Calcul du barème d&apos;annulation et exécution des remboursements (payment.refunds)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={totalItems === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <i className="fas fa-file-csv text-[11px]" />
            <span>Exporter CSV ({totalItems})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <i className={feedback.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('REFUNDS');
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          className={`inline-flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg border transition-all ${
            activeTab === 'REFUNDS'
              ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <i className="fas fa-undo-alt text-rose-500 text-xs" />
          <span>Grand Livre des Remboursements</span>
          <span className="admin-mono-tabular text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
          className={`inline-flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg border transition-all ${
            activeTab === 'CANCELLATIONS'
              ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 shadow-2xs'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <i className="fas fa-ban text-amber-500 text-xs" />
          <span>Demandes d&apos;Annulation (Phase 51)</span>
          <span className="admin-mono-tabular text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
            ? 'Rechercher REF-XXXX, réservation YUD-XXXX, motif...'
            : 'Rechercher réservation YUD-XXXX, demandeur, politique...'
        }
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            },
            options:
              activeTab === 'REFUNDS'
                ? [
                    { value: 'ALL', label: 'Tous les statuts' },
                    { value: 'COMPLETED', label: 'Confirmé / Exécuté' },
                    { value: 'PENDING', label: 'En attente' },
                    { value: 'FAILED', label: 'Échoué' },
                  ]
                : [
                    { value: 'ALL', label: 'Tous les statuts' },
                    { value: 'REFUND_FAILED', label: 'Échec Remboursement' },
                    { value: 'REFUNDED', label: 'Remboursé' },
                    { value: 'CANCELLED_NO_REFUND', label: 'Annulé Sans Frais' },
                    { value: 'REQUESTED', label: 'Enregistré' },
                  ],
          },
        ]}
      />

      {/* Active Tab Table inside Reference-style Rounded-2xl Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {activeTab === 'REFUNDS' ? (
          <AdminTable
            columns={refundColumns}
            data={paginatedRefunds}
            keyExtractor={(r) => r.id}
            isLoading={loadingRefunds}
            onRowClick={(r) => setSelectedItem(r)}
            emptyMessage="Aucun remboursement trouvé."
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
            emptyMessage="Aucune demande d'annulation trouvée."
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
      </div>

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
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Données de l&apos;Opération
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">Dossier Réservation</span>
                  <Link
                    href={`/admin/bookings?search=${encodeURIComponent(selectedItem.bookingId)}`}
                    className="font-bold admin-mono-tabular text-emerald-600 dark:text-emerald-400 no-underline hover:underline"
                  >
                    {getBookingRef(selectedItem.bookingId)}
                  </Link>
                </div>
                {selectedItem.amount != null && (
                  <div>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">Montant Recédé</span>
                    <span className="admin-mono-tabular font-black text-sm text-rose-600 dark:text-rose-400">
                      {Number(selectedItem.amount).toFixed(2)} {selectedItem.currency}
                    </span>
                  </div>
                )}
                {selectedItem.refundAmount != null && (
                  <div>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">Remboursement Net</span>
                    <span className="admin-mono-tabular font-black text-sm text-rose-600 dark:text-rose-400">
                      {Number(selectedItem.refundAmount).toFixed(2)} {selectedItem.currency || 'MAD'}
                    </span>
                  </div>
                )}
                {selectedItem.cancellationFee != null && (
                  <div>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">Frais Retenus</span>
                    <span className="admin-mono-tabular font-bold text-slate-700 dark:text-slate-300">
                      {Number(selectedItem.cancellationFee).toFixed(2)} {selectedItem.currency || 'MAD'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedItem.reason && (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs shadow-2xs">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Motif Fourni
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
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
          <div className="relative z-10 w-full max-w-md p-6 rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <i className="fas fa-undo-alt text-base" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400 m-0">
                  Relancer le Remboursement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 truncate">
                  Dossier {getBookingRef(retryModalItem.bookingId)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Montant à rembourser :</span>
                <span className="font-bold admin-mono-tabular text-rose-600 dark:text-rose-400">
                  {retryModalItem.refundAmount?.toFixed(2)} {retryModalItem.currency || 'MAD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Fournisseur :</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{retryModalItem.providerName || 'Passerelle'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Une nouvelle transaction de remboursement va être soumise à la passerelle de paiement. Si la passerelle valide le crédit, le statut passera à <strong>REFUNDED</strong> et sera consigné dans le Journal d&apos;Audit.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRetryModalItem(null)}
                className="text-xs py-2 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRetryRefund}
                disabled={retryRefundMutation.isPending}
                className="text-xs py-2 px-4 rounded-lg font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50"
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
