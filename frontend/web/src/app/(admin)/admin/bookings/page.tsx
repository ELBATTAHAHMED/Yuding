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

  const getUserLabel = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return userId.substring(0, 8) + '...';
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  };

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

  const columns = [
    {
      key: 'bookingReference',
      header: 'RÉFÉRENCE & VOYAGE',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex items-center gap-3 py-1">
            {/* Real Thumbnail or Route/Icon badge */}
            {travel.imageUrl ? (
              <img
                src={travel.imageUrl}
                alt={travel.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border shadow-2xs"
                style={{ borderColor: 'var(--admin-border)' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border font-black text-xs shadow-2xs"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                  color: travel.badgeColor,
                }}
              >
                <i
                  className={
                    b.productType === 'FLIGHT'
                      ? 'fas fa-plane'
                      : b.productType === 'HOTEL'
                      ? 'fas fa-hotel'
                      : b.productType === 'ACTIVITY'
                      ? 'fas fa-hiking'
                      : b.productType === 'TRANSFER'
                      ? 'fas fa-car-side'
                      : 'fas fa-train'
                  }
                />
                <span className="text-[0.6rem] font-bold mt-0.5">{travel.badge}</span>
              </div>
            )}

            {/* Travel Details */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="admin-mono-tabular font-extrabold text-xs" style={{ color: 'var(--admin-accent)' }}>
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
                  <i className={`fas ${copiedId === b.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-[0.65rem]`} />
                </button>
              </div>
              <div className="font-bold text-xs truncate max-w-xs sm:max-w-md" style={{ color: 'var(--admin-text-primary)' }}>
                {travel.title}
              </div>
              <div className="text-[0.6875rem] truncate max-w-xs sm:max-w-md" style={{ color: 'var(--admin-text-muted)' }}>
                {travel.subtitle}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'productType',
      header: 'CALENDRIER',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
              {travel.dates}
            </span>
            <span className="text-[0.65rem] admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
              Créé le {new Date(b.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'userId',
      header: 'VOYAGEUR (CLIENT)',
      render: (b: AdminBooking) => {
        const user = users.find((u) => u.id === b.userId);
        return (
          <div className="flex flex-col min-w-0">
            <Link
              href={`/admin/users?search=${encodeURIComponent(b.userId)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold no-underline hover:underline truncate"
              style={{ color: 'var(--admin-text-primary)' }}
            >
              {getUserLabel(b.userId)}
            </Link>
            {user?.email && (
              <span className="text-[0.6875rem] truncate" style={{ color: 'var(--admin-text-muted)' }}>
                {user.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'provider',
      header: 'FOURNISSEUR',
      render: (b: AdminBooking) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {b.provider || 'DIRECT'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'TARIF SERVEUR',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <div className="flex flex-col items-end">
          <span className="admin-mono-tabular font-black text-xs" style={{ color: 'var(--admin-text-primary)' }}>
            {b.amount != null ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
          </span>
          <span className="text-[0.625rem]" style={{ color: 'var(--admin-text-muted)' }}>
            TTC Garanti
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
      header: 'ACTIONS',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBooking(b);
          }}
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded font-bold shadow-2xs"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            border: '1px solid var(--admin-accent-border)',
            color: 'var(--admin-accent)',
          }}
        >
          <i className="fas fa-search-plus text-[0.65rem] mr-1" />
          <span>Examiner</span>
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
        { label: 'CONFIRMED', value: 'CONFIRMED' },
        { label: 'PENDING_PAYMENT', value: 'PENDING_PAYMENT' },
        { label: 'CANCELLED', value: 'CANCELLED' },
        { label: 'EXPIRED', value: 'EXPIRED' },
      ],
    },
    {
      key: 'productType',
      label: 'Verticale',
      value: productFilter,
      onChange: (val: string) => {
        setProductFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Toutes les verticales', value: 'ALL' },
        { label: 'Hôtels (HOTEL)', value: 'HOTEL' },
        { label: 'Vols (FLIGHT)', value: 'FLIGHT' },
        { label: 'Activités (ACTIVITY)', value: 'ACTIVITY' },
        { label: 'Transferts (TRANSFER)', value: 'TRANSFER' },
        { label: 'Trains ONCF (TRAIN)', value: 'TRAIN' },
      ],
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setProductFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'ALL' || productFilter !== 'ALL');
  const selectedTravel = selectedBooking ? parseTravelContext(selectedBooking) : null;
  const selectedUser = selectedBooking ? users.find((u) => u.id === selectedBooking.userId) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Réservations & Dossiers Voyage
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Supervision autoritaire des 5 verticales Yuding : Hôtels, Vols, Activités, Transferts et Trains
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredBookings.length === 0}
            className="admin-btn text-xs py-2 px-3.5 rounded-lg border font-semibold"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <i className="fas fa-file-csv text-xs mr-1 text-emerald-500" />
            <span>Exporter CSV ({filteredBookings.length})</span>
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
        searchPlaceholder="Rechercher par référence YUD-XXXX, hôtel, vol, client..."
        filters={filterSelects}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={bookings.length}
        filteredCount={filteredBookings.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Bookings Table with Pagination */}
      <AdminTable
        columns={columns}
        data={paginatedBookings}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        onRowClick={(b) => setSelectedBooking(b)}
        emptyMessage="Aucune réservation trouvée"
        emptySubtext="Modifiez vos critères de recherche ou réinitialisez les filtres."
        footer={
          filteredBookings.length > 0 ? (
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
          <div className="space-y-6">
            {/* Travel Header Card with Real Image / Route */}
            <div
              className="rounded-xl border overflow-hidden shadow-xs"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
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
                      className="text-[0.65rem] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider"
                      style={{ backgroundColor: selectedTravel.badgeColor }}
                    >
                      {selectedTravel.badge}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1 leading-tight drop-shadow-xs">
                      {selectedTravel.title}
                    </h3>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-3">
                {!selectedTravel.imageUrl && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm"
                      style={{
                        backgroundColor: 'var(--admin-accent-subtle)',
                        color: selectedTravel.badgeColor,
                      }}
                    >
                      <i
                        className={
                          selectedBooking.productType === 'FLIGHT'
                            ? 'fas fa-plane'
                            : selectedBooking.productType === 'HOTEL'
                            ? 'fas fa-hotel'
                            : selectedBooking.productType === 'ACTIVITY'
                            ? 'fas fa-hiking'
                            : selectedBooking.productType === 'TRANSFER'
                            ? 'fas fa-car-side'
                            : 'fas fa-train'
                        }
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold m-0" style={{ color: 'var(--admin-text-primary)' }}>
                        {selectedTravel.title}
                      </h3>
                      <p className="text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>
                        {selectedTravel.subtitle}
                      </p>
                    </div>
                  </div>
                )}

                {/* Travel Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {selectedTravel.details.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--admin-surface-muted)',
                        borderColor: 'var(--admin-border)',
                      }}
                    >
                      <span className="block text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                        {item.label}
                      </span>
                      <span className="font-bold block mt-0.5 truncate" style={{ color: 'var(--admin-text-primary)' }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Card & Cross Links */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Facturation & Règlement
                </span>
                <Link
                  href={`/admin/payments?search=${encodeURIComponent(selectedBooking.id)}`}
                  className="text-xs font-bold no-underline hover:underline flex items-center gap-1"
                  style={{ color: '#38BDF8' }}
                >
                  <i className="fas fa-credit-card text-[0.65rem]" />
                  <span>Voir Paiement Associé →</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Montant Autoritaire
                  </span>
                  <span className="font-black text-sm admin-mono-tabular" style={{ color: 'var(--admin-accent)' }}>
                    {selectedBooking.amount != null
                      ? `${Number(selectedBooking.amount).toFixed(2)} ${selectedBooking.currency || 'MAD'}`
                      : '0.00 MAD'}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Fournisseur & Adapter
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedBooking.provider || 'DIRECT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Profile Mini Card */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Voyageur Principal
                </span>
                <Link
                  href={`/admin/users?search=${encodeURIComponent(selectedBooking.userId)}`}
                  className="text-xs font-bold no-underline hover:underline flex items-center gap-1"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  <i className="fas fa-user text-[0.65rem]" />
                  <span>Fiche Client →</span>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{
                    backgroundColor: 'var(--admin-accent-subtle)',
                    color: 'var(--admin-accent)',
                  }}
                >
                  {selectedUser?.firstName ? selectedUser.firstName[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Compte Utilisateur'}
                  </div>
                  <div className="text-[0.6875rem] truncate" style={{ color: 'var(--admin-text-muted)' }}>
                    {selectedUser?.email || selectedBooking.userId}
                  </div>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Chronologie d&apos;Événements
              </span>
              <div className="space-y-3 border-l-2 ml-2 pl-4" style={{ borderColor: 'var(--admin-accent-border)' }}>
                <div className="text-xs">
                  <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    Création du dossier
                  </div>
                  <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(selectedBooking.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                <div className="text-xs">
                  <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    Dernière modification de statut
                  </div>
                  <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(selectedBooking.statusChangedAt || selectedBooking.updatedAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                {selectedBooking.expiresAt && (
                  <div className="text-xs">
                    <div className="font-bold text-amber-500">
                      Échéance du blocage d&apos;inventaire
                    </div>
                    <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(selectedBooking.expiresAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
