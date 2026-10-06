'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminPayments, useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPayment } from '@/types/admin.types';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);

  const { data: payments = [], isLoading, refetch, isFetching } = useAdminPayments({ limit: 100 });
  const { data: bookings = [] } = useAdminBookings({ limit: 200 });

  const getBookingRef = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    return booking ? booking.bookingReference : bookingId.substring(0, 8);
  };

  const filtered = payments.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (providerFilter !== 'ALL' && p.providerName !== providerFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const bRef = getBookingRef(p.bookingId).toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(term) ||
      bRef.includes(term) ||
      p.providerName.toLowerCase().includes(term)
    );
  });

  const totalCaptured = payments
    .filter((p) => p.status === 'SUCCEEDED' || p.status === 'CAPTURED')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const failedCount = payments.filter((p) => p.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Grand Livre des Flux Financiers
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Traçabilité des transactions passerelles, devises de règlement et encaissements autoritaires.
          </p>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Volume Total Capturé
            </div>
            <div className="text-xl font-mono font-extrabold text-[#0F172A] dark:text-white">
              {totalCaptured.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </div>
          </div>
          {failedCount > 0 && (
            <div className="pl-6 border-l border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-500">
                Échecs Passerelle
              </div>
              <div className="text-xl font-mono font-extrabold text-rose-600 dark:text-rose-400">
                {failedCount}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Compact Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par référence (PAY-...), dossier..."
        totalCount={payments.length}
        filteredCount={filtered.length}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        hasActiveFilters={statusFilter !== 'ALL' || providerFilter !== 'ALL' || Boolean(searchTerm)}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
          setProviderFilter('ALL');
        }}
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: statusFilter,
            options: [
              { label: 'Tous les états', value: 'ALL' },
              { label: 'Réussi (SUCCEEDED)', value: 'SUCCEEDED' },
              { label: 'Échoué (FAILED)', value: 'FAILED' },
              { label: 'Remboursé (REFUNDED)', value: 'REFUNDED' },
            ],
            onChange: setStatusFilter,
          },
          {
            key: 'provider',
            label: 'Passerelle',
            value: providerFilter,
            options: [
              { label: 'Toutes les passerelles', value: 'ALL' },
              { label: 'Mock Gateway', value: 'mock' },
              { label: 'CMI (Maroc)', value: 'cmi' },
              { label: 'Stripe Global', value: 'stripe' },
            ],
            onChange: setProviderFilter,
          },
        ]}
      />

      {/* 3. Financial Ledger Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto admin-custom-scrollbar">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Référence Transaction</th>
                <th>Dossier Associé</th>
                <th>Passerelle</th>
                <th>Date &amp; Heure</th>
                <th className="text-right">Montant</th>
                <th className="text-center">État</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4">
                      <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8] text-xs">
                    Aucune transaction ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const bRef = getBookingRef(p.bookingId);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="cursor-pointer hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors"
                    >
                      <td className="font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                        {p.paymentReference}
                      </td>
                      <td className="font-mono text-xs text-[#0D9488] dark:text-[#00D4AA] font-bold whitespace-nowrap">
                        {bRef}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#64748B] dark:text-[#94A3B8] uppercase">
                          {p.providerName}
                        </span>
                      </td>
                      <td className="text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="text-right font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                        {Number(p.amount).toFixed(2)} {p.currency}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <AdminBadge variant={getStatusBadgeVariant(p.status)} size="sm">
                          {p.status}
                        </AdminBadge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(p);
                          }}
                          className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                        >
                          Détails →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Payment Inspector Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment?.paymentReference || 'Détails du Paiement'}
        subtitle="Règlement financier autoritaire"
        badge={
          selectedPayment ? (
            <AdminBadge variant={getStatusBadgeVariant(selectedPayment.status)} size="sm">
              {selectedPayment.status}
            </AdminBadge>
          ) : undefined
        }
        rawJson={selectedPayment}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Montant de la Transaction
                </span>
                <span className="text-2xl font-black font-mono text-[#0F172A] dark:text-white">
                  {Number(selectedPayment.amount).toFixed(2)} {selectedPayment.currency}
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]">
                {selectedPayment.providerName.toUpperCase()}
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Informations du Grand Livre
              </span>
              <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430]">
                <div className="p-3.5 flex justify-between text-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Identifiant Externe PSP</span>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-white">
                    {selectedPayment.providerTransactionId || selectedPayment.providerOrderId || '—'}
                  </span>
                </div>
                <div className="p-3.5 flex justify-between text-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Dossier Voyage Lié</span>
                  <Link
                    href={`/admin/bookings?search=${encodeURIComponent(getBookingRef(selectedPayment.bookingId))}`}
                    className="font-mono font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                  >
                    {getBookingRef(selectedPayment.bookingId)}
                  </Link>
                </div>
                <div className="p-3.5 flex justify-between text-xs">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Date d&apos;enregistrement</span>
                  <span className="text-[#0F172A] dark:text-white font-medium">
                    {new Date(selectedPayment.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                {selectedPayment.errorMessage && (
                  <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                    <span className="font-bold block">Message d&apos;erreur retourné par la passerelle :</span>
                    <span className="font-mono text-[11px] block">{selectedPayment.errorMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cross Links */}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href={`/admin/refunds?search=${encodeURIComponent(selectedPayment.bookingId)}`}
                className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
              >
                Vérifier les remboursements associés à ce dossier →
              </Link>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
