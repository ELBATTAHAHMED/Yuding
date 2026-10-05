'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminBookings, useAdminUsers } from '@/hooks/queries/useAdminQueries';
import { AdminBooking } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { BookingVisual } from '@/components/admin/BookingVisual';
import { EntityAvatar } from '@/components/admin/EntityAvatar';
import { parseTravelContext } from '@/lib/admin-travel';
import { exportToCsv } from '@/lib/admin-csv';

export default function AdminBookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: bookings = [], isLoading, refetch, isRefetching } = useAdminBookings({
    limit: 200,
    status: statusFilter,
    productType: productFilter,
  });

  const { data: users = [] } = useAdminUsers();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getUser = (userId: string) => users.find((u) => u.id === userId);

  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const travel = parseTravelContext(b);
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.userId.toLowerCase().includes(term) ||
      (b.provider && b.provider.toLowerCase().includes(term)) ||
      travel.title.toLowerCase().includes(term) ||
      travel.subtitle.toLowerCase().includes(term)
    );
  });

  // Paginated Slice
  const totalItems = filteredBookings.length;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportCsv = () => {
    const rows = filteredBookings.map((b) => {
      const travel = parseTravelContext(b);
      return {
        Reference: b.bookingReference,
        Type: b.productType,
        Title: travel.title,
        Dates: travel.dates,
        Status: b.status,
        Amount: b.amount ?? 0,
        Currency: b.currency || 'MAD',
        Provider: b.provider || 'DIRECT',
        UserId: b.userId,
        CreatedAt: b.createdAt,
      };
    });
    exportToCsv('reservations_yuding', rows);
  };

  const selectedTravel = selectedBooking ? parseTravelContext(selectedBooking) : null;
  const selectedUser = selectedBooking ? getUser(selectedBooking.userId) : null;

  const columns = [
    {
      key: 'bookingReference',
      header: 'DOSSIER & VOYAGE',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex items-center gap-3 py-1">
            <BookingVisual booking={b} size="md" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="admin-mono-tabular font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {b.bookingReference}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(b.bookingReference, b.id);
                  }}
                  className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
                  title="Copier la référence"
                >
                  <i className={`fas ${copiedId === b.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-[10px]`} />
                </button>
              </div>
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                {travel.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                {travel.subtitle}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'productType',
      header: 'DATES / PÉRIODE',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {travel.dates}
            </span>
            <span className="text-[10px] admin-mono-tabular text-slate-400 dark:text-slate-500">
              {new Date(b.createdAt).toLocaleDateString('fr-FR')} • {travel.badge}
            </span>
          </div>
        );
      },
    },
    {
      key: 'userId',
      header: 'CLIENT VOYAGEUR',
      render: (b: AdminBooking) => {
        const user = getUser(b.userId);
        const name = user ? `${user.firstName} ${user.lastName}`.trim() : `Voyageur (${b.userId.slice(0, 6)})`;
        return (
          <div className="flex items-center gap-2 py-0.5">
            <EntityAvatar
              name={name}
              email={user?.email}
              userId={b.userId}
              hasProfilePhoto={true}
              size="sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                {name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                {user?.email || b.userId.slice(0, 8)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'provider',
      header: 'FOURNISSEUR',
      render: (b: AdminBooking) => (
        <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
          {b.provider || 'DIRECT'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT TTC',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <div className="flex flex-col items-end">
          <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-slate-100">
            {b.amount != null ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Tarif serveur
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'STATUT',
      render: (b: AdminBooking) => (
        <AdminBadge variant={getStatusBadgeVariant(b.status)} size="sm">
          {b.status}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: 'DOSSIER',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBooking(b);
          }}
          className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
        >
          <i className="fas fa-search-plus text-[10px] mr-1" />
          <span>Examiner</span>
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Stats Ribbon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Réservations &amp; Dossiers Voyage
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervision autoritaire du cycle de vie des réservations multi-verticales et traçabilité des prestataires
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredBookings.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <i className="fas fa-file-csv text-[11px]" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
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
        searchPlaceholder="Rechercher par référence, client, destination..."
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
              { value: 'CONFIRMED', label: 'Confirmé' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'CANCELLED', label: 'Annulé' },
              { value: 'FAILED', label: 'Échoué' },
            ],
          },
          {
            key: 'product',
            label: 'Prestation',
            value: productFilter,
            onChange: (v) => {
              setProductFilter(v);
              setCurrentPage(1);
            },
            options: [
              { value: 'ALL', label: 'Toutes prestations' },
              { value: 'HOTEL', label: 'Hôtels' },
              { value: 'FLIGHT', label: 'Vols' },
              { value: 'ACTIVITY', label: 'Activités' },
              { value: 'TRANSFER', label: 'Transferts' },
              { value: 'TRAIN', label: 'Trains ONCF' },
            ],
          },
        ]}
      />

      {/* Bookings Table inside Reference-style Rounded-2xl Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <AdminTable
          columns={columns}
          data={paginatedBookings}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          onRowClick={(b) => setSelectedBooking(b)}
          emptyMessage="Aucune réservation ne correspond aux critères sélectionnés."
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

      {/* Slide-over Inspection Drawer with Rich Travel Details */}
      <AdminDrawer
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? selectedBooking.bookingReference : ''}
        subtitle={selectedTravel ? `${selectedTravel.badge} • ${selectedTravel.title}` : 'Dossier voyage'}
        badge={
          selectedBooking && (
            <AdminBadge variant={getStatusBadgeVariant(selectedBooking.status)} size="sm">
              {selectedBooking.status}
            </AdminBadge>
          )
        }
        rawJson={selectedBooking}
      >
        {selectedBooking && selectedTravel && (
          <div className="space-y-5">
            {/* Travel Hero Header with Real Image or Semantic Route */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              {selectedTravel.imageUrl && (
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={selectedTravel.imageUrl}
                    alt={selectedTravel.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: selectedTravel.badgeColor }}
                    >
                      {selectedTravel.badge}
                    </span>
                    <h3 className="text-base font-black text-white mt-1 leading-tight drop-shadow-xs">
                      {selectedTravel.title}
                    </h3>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                {!selectedTravel.imageUrl && (
                  <div className="flex items-center gap-3">
                    <BookingVisual booking={selectedBooking} size="lg" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
                        {selectedTravel.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                        {selectedTravel.subtitle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Specific Travel Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {selectedTravel.details.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs"
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial & Settlement Breakdown */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 m-0 flex items-center gap-2">
                <i className="fas fa-coins text-emerald-600 dark:text-emerald-400 text-xs" />
                <span>Règlement Financier &amp; Facturation</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Tarif Total Garanti</span>
                  <span className="admin-mono-tabular font-black text-base text-slate-900 dark:text-slate-100">
                    {selectedBooking.amount != null ? `${Number(selectedBooking.amount).toFixed(2)} ${selectedBooking.currency || 'MAD'}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Passerelle / Fournisseur</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedBooking.provider || 'Régie Directe Yuding'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Grand Livre des Paiements :</span>
                <Link
                  href={`/admin/payments?search=${encodeURIComponent(selectedBooking.bookingReference)}`}
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 no-underline"
                >
                  <span>Voir la transaction associée</span>
                  <i className="fas fa-arrow-right text-[10px]" />
                </Link>
              </div>
            </div>

            {/* Traveler Profile Card */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 m-0 flex items-center gap-2">
                <i className="fas fa-user-circle text-slate-400 text-xs" />
                <span>Identité du Client</span>
              </h4>

              <div className="flex items-center gap-3">
                <EntityAvatar
                  name={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Client'}
                  email={selectedUser?.email}
                  userId={selectedBooking.userId}
                  hasProfilePhoto={true}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : `Utilisateur #${selectedBooking.userId.slice(0, 8)}`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedUser?.email || selectedBooking.userId}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 admin-mono-tabular">
                    ID autoritaire : {selectedBooking.userId}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Gouvernance du compte :</span>
                <Link
                  href={`/admin/users?search=${encodeURIComponent(selectedBooking.userId)}`}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 no-underline"
                >
                  <span>Gérer l&apos;utilisateur RBAC</span>
                  <i className="fas fa-arrow-right text-[10px]" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
