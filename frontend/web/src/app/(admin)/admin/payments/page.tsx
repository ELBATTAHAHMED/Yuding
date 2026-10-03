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
      header: 'RÉFÉRENCE PAIEMENT',
      render: (p: AdminPayment) => (
        <div className="flex items-center gap-1.5 py-1">
          <span className="admin-mono-tabular font-extrabold text-xs" style={{ color: '#38BDF8' }}>
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
            <i className={`fas ${copiedId === p.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-[0.65rem]`} />
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
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/admin/bookings?search=${encodeURIComponent(p.bookingId)}`}
              className="admin-mono-tabular font-bold text-xs no-underline hover:underline flex items-center gap-1.5"
              style={{ color: 'var(--admin-accent)' }}
            >
              <span>{bRef}</span>
              <i className="fas fa-external-link-alt text-[0.6rem] opacity-60" />
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
          <span
            className="text-xs px-2 py-0.5 rounded font-semibold w-fit uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--admin-surface-muted)',
              color: 'var(--admin-text-secondary)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {p.providerName}
          </span>
          <span className="text-[0.65rem] truncate max-w-[140px]" style={{ color: 'var(--admin-text-muted)' }}>
            {p.paymentMethodType || 'Standard'}
          </span>
        </div>
      ),
    },
    {
      key: 'providerTransactionId',
      header: 'TXID FOURNISSEUR',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular text-xs truncate max-w-[150px] inline-block" style={{ color: 'var(--admin-text-muted)' }}>
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
          <span className="admin-mono-tabular font-black text-xs" style={{ color: 'var(--admin-text-primary)' }}>
            {Number(p.amount).toFixed(2)} {p.currency}
          </span>
          <span className="text-[0.625rem]" style={{ color: 'var(--admin-text-muted)' }}>
            Débit Net
          </span>
        </div>
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
        <div className="flex flex-col gap-1 items-start">
          <AdminBadge variant={getStatusBadgeVariant(p.status)} size="sm">
            {p.status}
          </AdminBadge>
          {p.errorMessage && (
            <span className="text-[0.625rem] text-red-500 font-semibold truncate max-w-[130px]" title={p.errorMessage}>
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
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded font-bold shadow-2xs"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-receipt text-[0.65rem] mr-1" />
          <span>Ticket</span>
        </button>
      ),
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
      options: [
        { label: 'Tous les statuts', value: 'ALL' },
        { label: 'COMPLETED / PAID', value: 'COMPLETED' },
        { label: 'PENDING', value: 'PENDING' },
        { label: 'FAILED', value: 'FAILED' },
      ],
    },
    {
      key: 'provider',
      label: 'Passerelle',
      value: providerFilter,
      onChange: (val: string) => {
        setProviderFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Toutes les passerelles', value: 'ALL' },
        { label: 'PAYPAL', value: 'PAYPAL' },
        { label: 'MOCK', value: 'MOCK' },
        { label: 'STRIPE', value: 'STRIPE' },
      ],
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setProviderFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'ALL' || providerFilter !== 'ALL');
  const associatedBooking = selectedPayment ? bookings.find((b) => b.id === selectedPayment.bookingId) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Grand Livre des Paiements &amp; Ledger
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Traçabilité immuable des flux d&apos;encaissement (payment.payments) connectés aux passerelles autoritaires
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredPayments.length === 0}
            className="admin-btn text-xs py-2 px-3.5 rounded-lg border font-semibold"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <i className="fas fa-file-csv text-xs mr-1 text-emerald-500" />
            <span>Exporter CSV ({filteredPayments.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Rechercher PAY-XXXX, réservation YUD-XXXX, passerelle, motif d'échec..."
        filters={filterSelects}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={payments.length}
        filteredCount={filteredPayments.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Table with Pagination */}
      <AdminTable
        columns={columns}
        data={paginatedPayments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        onRowClick={(p) => setSelectedPayment(p)}
        emptyMessage="Aucun paiement trouvé"
        emptySubtext="Aucune transaction ne correspond aux filtres appliqués."
        footer={
          filteredPayments.length > 0 ? (
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

      {/* Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment ? selectedPayment.paymentReference : ''}
        subtitle="Récépissé de transaction financière"
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
              className="p-4 rounded-xl border space-y-3"
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

            {/* Cross Link to Associated Booking */}
            <div
              className="p-4 rounded-xl border space-y-2 text-xs"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Dossier Réservation Associé
                </span>
                <Link
                  href={`/admin/bookings?search=${encodeURIComponent(selectedPayment.bookingId)}`}
                  className="font-bold no-underline hover:underline flex items-center gap-1"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  <span>Ouvrir dans Réservations →</span>
                </Link>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="admin-mono-tabular font-bold text-sm" style={{ color: 'var(--admin-accent)' }}>
                  {associatedBooking ? associatedBooking.bookingReference : selectedPayment.bookingId}
                </span>
                {associatedBooking && (
                  <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                    {associatedBooking.productType}
                  </span>
                )}
              </div>
            </div>

            {/* Error Message if failed */}
            {selectedPayment.errorMessage && (
              <div
                className="p-4 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                }}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1 text-red-500">
                  <i className="fas fa-exclamation-triangle" />
                  <span>Raison de l&apos;échec enregistrée :</span>
                </div>
                <div className="admin-mono-tabular font-semibold">{selectedPayment.errorMessage}</div>
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
