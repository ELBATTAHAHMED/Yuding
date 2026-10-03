'use client';

import React, { useState } from 'react';
import { useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminBooking } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminBookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: bookings = [], isLoading, refetch, isRefetching } = useAdminBookings({
    limit: 100,
    status: statusFilter,
    productType: productFilter,
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.userId.toLowerCase().includes(term) ||
      (b.provider && b.provider.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      key: 'bookingReference',
      header: 'RÉFÉRENCE',
      render: (b: AdminBooking) => (
        <div className="flex items-center gap-1.5">
          <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
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
      ),
    },
    {
      key: 'productType',
      header: 'VERTICALE',
      render: (b: AdminBooking) => {
        const iconMap: Record<string, string> = {
          FLIGHT: 'fas fa-plane',
          HOTEL: 'fas fa-hotel',
          ACTIVITY: 'fas fa-hiking',
          TRANSFER: 'fas fa-car-side',
        };
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <i className={`${iconMap[b.productType] || 'fas fa-ticket-alt'} text-xs`} style={{ color: 'var(--admin-text-muted)' }} />
            <span>{b.productType}</span>
          </div>
        );
      },
    },
    {
      key: 'userId',
      header: 'CLIENT (UUID)',
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {b.userId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'FOURNISSEUR',
      render: (b: AdminBooking) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          {b.provider || 'DIRECT'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {b.amount != null ? `${Number(b.amount).toFixed(2)} ${b.currency || 'EUR'}` : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'DATE CRÉATION',
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(b.createdAt).toLocaleDateString('fr-FR', {
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
      onChange: setProductFilter,
      options: [
        { label: 'Toutes les verticales', value: 'ALL' },
        { label: 'Vols (FLIGHT)', value: 'FLIGHT' },
        { label: 'Hôtels (HOTEL)', value: 'HOTEL' },
        { label: 'Activités (ACTIVITY)', value: 'ACTIVITY' },
        { label: 'Transferts (TRANSFER)', value: 'TRANSFER' },
      ],
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setProductFilter('ALL');
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'ALL' || productFilter !== 'ALL');

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Gestion des Réservations
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Cycle de vie autoritaire des réservations hébergées dans le schéma booking.bookings
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filtrer par réf YUD-XXXX, UUID client, fournisseur..."
        filters={filterSelects}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={bookings.length}
        filteredCount={filteredBookings.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Bookings Table */}
      <AdminTable
        columns={columns}
        data={filteredBookings}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        onRowClick={(b) => setSelectedBooking(b)}
        emptyMessage="Aucune réservation trouvée"
        emptySubtext="Modifiez vos critères de recherche ou réinitialisez les filtres."
      />

      {/* Slide-over Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? selectedBooking.bookingReference : ''}
        subtitle="Détail complet de la réservation"
        badge={
          selectedBooking && (
            <AdminBadge variant={getStatusBadgeVariant(selectedBooking.status)} size="sm">
              {selectedBooking.status}
            </AdminBadge>
          )
        }
        rawJson={selectedBooking}
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Financial & General Specs */}
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Informations Clés
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Verticale
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedBooking.productType}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Fournisseur Source
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedBooking.provider || 'Direct'}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Montant Enregistré
                  </span>
                  <span className="font-extrabold admin-mono-tabular" style={{ color: 'var(--admin-accent)' }}>
                    {selectedBooking.amount != null
                      ? `${Number(selectedBooking.amount).toFixed(2)} ${selectedBooking.currency || 'EUR'}`
                      : 'Non spécifié'}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Identifiant Client (UUID)
                  </span>
                  <span className="admin-mono-tabular truncate block" style={{ color: 'var(--admin-text-secondary)' }}>
                    {selectedBooking.userId}
                  </span>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Chronologie d&apos;Événements
              </div>
              <div className="space-y-2 border-l-2 ml-2 pl-4" style={{ borderColor: 'var(--admin-accent-border)' }}>
                <div className="text-xs">
                  <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    Création de la réservation
                  </div>
                  <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(selectedBooking.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                <div className="text-xs mt-3">
                  <div className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    Dernière modification de statut
                  </div>
                  <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(selectedBooking.statusChangedAt || selectedBooking.updatedAt).toLocaleString('fr-FR')}
                  </div>
                </div>

                {selectedBooking.expiresAt && (
                  <div className="text-xs mt-3">
                    <div className="font-bold" style={{ color: '#F59E0B' }}>
                      Date d&apos;expiration du blocage
                    </div>
                    <div className="admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(selectedBooking.expiresAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* External Reference */}
            {selectedBooking.providerOfferId && (
              <div
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                }}
              >
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  ID Offre Partenaire (Provider Snapshot)
                </span>
                <span className="admin-mono-tabular font-medium break-all" style={{ color: 'var(--admin-text-primary)' }}>
                  {selectedBooking.providerOfferId}
                </span>
              </div>
            )}
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
