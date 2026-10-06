'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminBookings, useAdminUsers } from '@/hooks/queries/useAdminQueries';
import { parseTravelContext } from '@/lib/admin-travel';
import { AdminBooking } from '@/types/admin.types';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { BookingVisual } from '@/components/admin/BookingVisual';

export default function AdminBookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  const { data: bookings = [], isLoading, refetch, isFetching } = useAdminBookings({ limit: 100 });
  const { data: users = [] } = useAdminUsers();

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && b.productType !== typeFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const travel = parseTravelContext(b);
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.userId.toLowerCase().includes(term) ||
      travel.title.toLowerCase().includes(term) ||
      travel.subtitle.toLowerCase().includes(term)
    );
  });

  const selectedTravel = selectedBooking ? parseTravelContext(selectedBooking) : null;
  const selectedUser = selectedBooking ? users.find((u) => u.id === selectedBooking.userId) : null;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Dossiers de Voyage &amp; Réservations
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Registre autoritaire des séjours, vols, activités et transferts réservés sur Yuding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#14171E] border border-[#E2E8F0] dark:border-[#1E2430] text-[#0F172A] dark:text-white admin-mono-tabular">
            {bookings.length} dossiers au registre
          </div>
        </div>
      </div>

      {/* 2. Standardized Compact Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par référence (ex: YUD-...), hôtel, vol, client..."
        totalCount={bookings.length}
        filteredCount={filtered.length}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        hasActiveFilters={statusFilter !== 'ALL' || typeFilter !== 'ALL' || Boolean(searchTerm)}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
          setTypeFilter('ALL');
        }}
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: statusFilter,
            options: [
              { label: 'Tous les statuts', value: 'ALL' },
              { label: 'Confirmé / Payé', value: 'CONFIRMED' },
              { label: 'En attente', value: 'PENDING' },
              { label: 'Annulé', value: 'CANCELLED' },
            ],
            onChange: setStatusFilter,
          },
          {
            key: 'type',
            label: 'Produit',
            value: typeFilter,
            options: [
              { label: 'Tous les types', value: 'ALL' },
              { label: 'Hôtels', value: 'HOTEL' },
              { label: 'Vols', value: 'FLIGHT' },
              { label: 'Activités', value: 'ACTIVITY' },
              { label: 'Transferts', value: 'TRANSFER' },
            ],
            onChange: setTypeFilter,
          },
        ]}
      />

      {/* 3. Split Workspace: Master Dossier Table & Right Contextual Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Master Registry Table */}
        <div className={`${selectedBooking ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto admin-custom-scrollbar">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Dossier</th>
                    <th>Prestation Voyage</th>
                    <th>Dates</th>
                    <th className="text-right">Montant</th>
                    <th className="text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-4">
                          <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8] text-xs">
                        Aucun dossier ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => {
                      const travel = parseTravelContext(b);
                      const isSelected = selectedBooking?.id === b.id;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBooking(isSelected ? null : b)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#F1F5F9] dark:bg-[#1E2430]'
                              : 'hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28]'
                          }`}
                        >
                          <td className="font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                            {b.bookingReference}
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <BookingVisual booking={b} size="sm" />
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-[#0F172A] dark:text-white truncate max-w-[200px]">
                                  {travel.title}
                                </div>
                                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[200px]">
                                  {travel.subtitle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-xs text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                            {travel.dates}
                          </td>
                          <td className="text-right font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                            {b.amount ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
                          </td>
                          <td className="text-center whitespace-nowrap">
                            <AdminBadge variant={getStatusBadgeVariant(b.status)} size="sm">
                              {b.status}
                            </AdminBadge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Operational Travel Dossier Inspector */}
        {selectedBooking && selectedTravel && (
          <div className="lg:col-span-5 admin-card p-6 space-y-6 sticky top-24 shadow-sm animate-fade-in">
            {/* Dossier Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="flex items-center gap-3">
                <BookingVisual booking={selectedBooking} size="md" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                    Dossier Opérateur #{selectedBooking.productType}
                  </span>
                  <h3 className="text-lg font-extrabold font-mono text-[#0F172A] dark:text-white m-0">
                    {selectedBooking.bookingReference}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E2430]"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Travel Context Details */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Prestation Réservée
              </span>
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] space-y-3">
                <div className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {selectedTravel.title}
                </div>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {selectedTravel.subtitle}
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#2D3748] flex items-center justify-between text-xs text-[#0F172A] dark:text-white font-medium">
                  <span>Période : {selectedTravel.dates}</span>
                  <AdminBadge variant={getStatusBadgeVariant(selectedBooking.status)} size="sm">
                    {selectedBooking.status}
                  </AdminBadge>
                </div>

                {/* Structured details from selectedDetails */}
                {selectedTravel.details && selectedTravel.details.length > 0 && (
                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2D3748] grid grid-cols-2 gap-2 text-xs">
                    {selectedTravel.details.map((detail, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-semibold uppercase text-[#94A3B8] block">{detail.label}</span>
                        <span className="font-medium text-[#0F172A] dark:text-white truncate block">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedBooking.provider && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#2D3748] flex justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>Fournisseur partenaire : <strong className="text-[#0F172A] dark:text-white">{selectedBooking.provider}</strong></span>
                    {selectedBooking.providerOfferId && (
                      <span className="font-mono">Réf: {selectedBooking.providerOfferId.slice(0, 14)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Ledger Binding */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Règlement &amp; Trésorerie
              </span>
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold text-[#94A3B8] uppercase">
                      Montant du Séjour
                    </div>
                    <div className="text-lg font-extrabold font-mono text-[#0F172A] dark:text-white">
                      {selectedBooking.amount ? `${Number(selectedBooking.amount).toFixed(2)} ${selectedBooking.currency || 'MAD'}` : '—'}
                    </div>
                  </div>

                  <Link
                    href={`/admin/payments?search=${encodeURIComponent(selectedBooking.bookingReference)}`}
                    className="admin-btn bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A] no-underline text-xs"
                  >
                    <i className="fas fa-wallet text-xs" />
                    <span>Grand Livre →</span>
                  </Link>
                </div>

                <div className="flex gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#2D3748]">
                  <Link
                    href={`/admin/refunds?search=${encodeURIComponent(selectedBooking.id)}`}
                    className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
                  >
                    Vérifier les remboursements / annulations →
                  </Link>
                </div>
              </div>
            </div>

            {/* Traveler Profile */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Client Associé
              </span>
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] space-y-2">
                <div className="font-bold text-xs text-[#0F172A] dark:text-white">
                  {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : selectedBooking.userId}
                </div>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {selectedUser?.email || 'Email non renseigné'}
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <Link
                    href={`/admin/users?search=${encodeURIComponent(selectedBooking.userId)}`}
                    className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
                  >
                    Fiche voyageur complète →
                  </Link>
                  <Link
                    href={`/admin/audit?search=${encodeURIComponent(selectedBooking.bookingReference)}`}
                    className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:underline no-underline"
                  >
                    Piste d&apos;audit →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
