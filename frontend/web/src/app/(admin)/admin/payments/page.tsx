'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminPayments, useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminPayment } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { exportToCsv } from '@/lib/admin-csv';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: payments = [], isLoading, refetch, isRefetching } = useAdminPayments({
    limit: 200,
    status: statusFilter,
  });

  const { data: bookings = [] } = useAdminBookings({ limit: 500 });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getBookingRef = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    return booking ? booking.bookingReference : bookingId.substring(0, 8) + '...';
  };

  const filteredPayments = payments.filter((p) => {
    if (providerFilter !== 'ALL' && p.providerName !== providerFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const bRef = getBookingRef(p.bookingId).toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(term) ||
      bRef.includes(term) ||
      p.bookingId.toLowerCase().includes(term) ||
      (p.providerTransactionId && p.providerTransactionId.toLowerCase().includes(term)) ||
      (p.providerName && p.providerName.toLowerCase().includes(term)) ||
      (p.errorMessage && p.errorMessage.toLowerCase().includes(term))
    );
  });

  const totalItems = filteredPayments.length;
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportCsv = () => {
    const rows = filteredPayments.map((p) => ({
      Reference: p.paymentReference,
      BookingId: p.bookingId,
      BookingRef: getBookingRef(p.bookingId),
      Provider: p.providerName,
      TransactionId: p.providerTransactionId || '',
      Amount: p.amount,
      Currency: p.currency,
      Status: p.status,
      Method: p.paymentMethodType || '',
      Error: p.errorMessage || '',
      CreatedAt: p.createdAt,
    }));
    exportToCsv('grand_livre_paiements_yuding', rows);
  };

  const columns = [
    {
      key: 'paymentReference',
      header: 'RÉFÉRENCE TRANSACTION',
      render: (p: AdminPayment) => (
        <div className="flex items-center gap-1.5 py-1">
          <span className="admin-mono-tabular font-bold text-xs text-sky-600 dark:text-sky-400">
            {p.paymentReference}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(p.paymentReference, p.id);
            }}
            className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
            title="Copier la référence de paiement"
          >
            <i className={`fas ${copiedId === p.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-[10px]`} />
          </button>
        </div>
      ),
    },
    {
      key: 'bookingId',
      header: 'DOSSIER RÉSERVATION',
      render: (p: AdminPayment) => {
        const bRef = getBookingRef(p.bookingId);
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/admin/bookings?search=${encodeURIComponent(p.bookingId)}`}
              className="admin-mono-tabular font-semibold text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 no-underline"
            >
              <span>{bRef}</span>
              <i className="fas fa-external-link-alt text-[9px] opacity-60" />
            </Link>
          </div>
        );
      },
    },
    {
      key: 'providerName',
      header: 'PASSERELLE & MÉTHODE',
      render: (p: AdminPayment) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] px-2 py-0.5 rounded font-semibold w-fit uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            {p.providerName}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
            {p.paymentMethodType || 'Standard'}
          </span>
        </div>
      ),
    },
    {
      key: 'providerTransactionId',
      header: 'TXID PROCESSEUR',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px] inline-block">
          {p.providerTransactionId || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT CAPTURÉ',
      align: 'right' as const,
      render: (p: AdminPayment) => (
        <div className="flex flex-col items-end">
          <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-slate-100">
            {Number(p.amount).toFixed(2)} {p.currency}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Débit Net
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'HORODATAGE',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {new Date(p.createdAt).toLocaleDateString('fr-FR', {
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
      render: (p: AdminPayment) => (
        <div className="flex flex-col gap-1 items-start">
          <AdminBadge variant={getStatusBadgeVariant(p.status)} size="sm">
            {p.status}
          </AdminBadge>
          {p.errorMessage && (
            <span className="text-[10px] text-rose-500 font-semibold truncate max-w-[130px]" title={p.errorMessage}>
              <i className="fas fa-exclamation-triangle mr-1" />
              {p.errorMessage}
            </span>
          )}
        </div>
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
          className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
        >
          <i className="fas fa-receipt text-[10px] mr-1" />
          <span>Ticket</span>
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Paiements &amp; Grand Livre
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit exhaustif des flux de trésorerie, règlements passerelles et traçabilité des processeurs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredPayments.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <i className="fas fa-file-csv text-[11px]" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 transition-colors shadow-2xs"
          >
            <i className={`fas fa-sync text-[11px] ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par référence, TXID, dossier ou passerelle..."
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            },
            options: [
              { value: 'ALL', label: 'Tous les statuts' },
              { value: 'COMPLETED', label: 'Confirmé / Réussi' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'FAILED', label: 'Échoué' },
            ],
          },
          {
            key: 'provider',
            label: 'Passerelle',
            value: providerFilter,
            onChange: (v) => {
              setProviderFilter(v);
              setCurrentPage(1);
            },
            options: [
              { value: 'ALL', label: 'Toutes les passerelles' },
              { value: 'PAYPAL', label: 'PayPal Gateway' },
              { value: 'MOCK', label: 'Sandbox / Mock' },
              { value: 'STRIPE', label: 'Stripe' },
            ],
          },
        ]}
      />

      {/* Payments Table inside Reference-style Rounded-2xl Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <AdminTable
          columns={columns}
          data={paginatedPayments}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          onRowClick={(p) => setSelectedPayment(p)}
          emptyMessage="Aucune transaction de paiement ne correspond à ces critères."
          footer={
            totalItems > 0 ? (
              <AdminPagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            ) : null
          }
        />
      </div>

      {/* Payment Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment ? selectedPayment.paymentReference : ''}
        subtitle="Récépissé de transaction bancaire"
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
          <div className="space-y-4">
            {/* Amount Banner */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Montant Net Traité
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 admin-mono-tabular mt-1">
                {Number(selectedPayment.amount).toFixed(2)} {selectedPayment.currency}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Passerelle : <strong className="text-slate-800 dark:text-slate-200">{selectedPayment.providerName}</strong>
              </div>
            </div>

            {/* Processor Details Grid */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 m-0">
                Détails du Processeur
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">TXID Processeur</span>
                  <span className="admin-mono-tabular font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {selectedPayment.providerTransactionId || 'N/A'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Mode de Paiement</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {selectedPayment.paymentMethodType || 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Link to Booking */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 text-[11px]">Dossier Voyage Rattaché</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block admin-mono-tabular">
                    {getBookingRef(selectedPayment.bookingId)}
                  </span>
                </div>
                <Link
                  href={`/admin/bookings?search=${encodeURIComponent(selectedPayment.bookingId)}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40 hover:underline no-underline"
                >
                  Ouvrir le dossier →
                </Link>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
