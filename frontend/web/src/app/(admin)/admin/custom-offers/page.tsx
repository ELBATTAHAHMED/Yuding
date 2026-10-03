'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminBooking } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminCustomOffersPage() {
  const { data: bookings = [], isLoading, refetch, isRefetching } = useAdminBookings({ limit: 100 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<AdminBooking | null>(null);

  // Filter bookings that contain provider offer snapshots
  const offersWithSnapshots = bookings.filter((b) => b.amount != null && b.provider != null);

  const filtered = offersWithSnapshots.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      (b.provider && b.provider.toLowerCase().includes(term)) ||
      (b.providerOfferId && b.providerOfferId.toLowerCase().includes(term)) ||
      b.productType.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      key: 'bookingReference',
      header: 'RÉFÉRENCE RÉSERVATION',
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
          {b.bookingReference}
        </span>
      ),
    },
    {
      key: 'productType',
      header: 'VERTICALE',
      render: (b: AdminBooking) => (
        <AdminBadge variant="info" size="sm" dot={false}>
          {b.productType}
        </AdminBadge>
      ),
    },
    {
      key: 'provider',
      header: 'FOURNISSEUR SOURCE',
      render: (b: AdminBooking) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-mono font-medium"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          {b.provider}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'PRIX CAPTURÉ',
      align: 'right' as const,
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {Number(b.amount).toFixed(2)} {b.currency || 'EUR'}
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
            setSelectedOffer(b);
          }}
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-eye text-[0.65rem]" />
          <span>Snapshot</span>
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Offres Capturées &amp; Snapshots Partenaires
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Instantanés immuables des sélections utilisateurs et offres tarifaires (booking.offer_snapshots)
          </p>
        </div>

        <Link
          href="/admin/bookings"
          className="admin-btn text-xs py-2 px-3.5 no-underline"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <span>Voir Réservations Associées</span>
          <i className="fas fa-arrow-right text-[0.65rem]" />
        </Link>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par référence, fournisseur ou verticale..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={offersWithSnapshots.length}
        filteredCount={filtered.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        onRowClick={(b) => setSelectedOffer(b)}
        emptyMessage="Aucun snapshot d'offre disponible"
      />

      {/* Snapshot Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedOffer)}
        onClose={() => setSelectedOffer(null)}
        title={selectedOffer?.bookingReference || 'Snapshot Offre'}
        subtitle="Contenu capturé de l'offre partenaire"
        badge={
          selectedOffer && (
            <AdminBadge variant={getStatusBadgeVariant(selectedOffer.status)} size="sm">
              {selectedOffer.status}
            </AdminBadge>
          )
        }
        rawJson={selectedOffer}
      >
        {selectedOffer && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="font-bold uppercase tracking-wider text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                Détail de l&apos;Offre Capturée
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Fournisseur Source
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedOffer.provider}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Verticale Produit
                  </span>
                  <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    {selectedOffer.productType}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Prix Enregistré
                  </span>
                  <span className="font-extrabold admin-mono-tabular" style={{ color: 'var(--admin-accent)' }}>
                    {Number(selectedOffer.amount).toFixed(2)} {selectedOffer.currency || 'EUR'}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                    Identifiant Offre Provider
                  </span>
                  <span className="font-mono text-[0.6875rem] truncate block" style={{ color: 'var(--admin-text-secondary)' }}>
                    {selectedOffer.providerOfferId || 'Non fourni'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
