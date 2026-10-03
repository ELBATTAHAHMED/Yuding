'use client';

import React from 'react';
import Link from 'next/link';
import {
  useAdminStats,
  useAdminBookings,
  useAdminPayments,
  useProviderHealth,
} from '@/hooks/queries/useAdminQueries';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminBooking, AdminPayment } from '@/types/admin.types';

export default function AdminOverviewPage() {
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useAdminStats();
  const { data: recentBookings = [], isLoading: loadingBookings, refetch: refetchBookings } = useAdminBookings({ limit: 6 });
  const { data: recentPayments = [], isLoading: loadingPayments, refetch: refetchPayments } = useAdminPayments({ limit: 6 });
  const { data: providerHealth = [], isLoading: loadingHealth, refetch: refetchHealth } = useProviderHealth();

  const upProviders = providerHealth.filter((p) => p.status === 'UP').length;
  const totalProviders = providerHealth.length;

  const handleRefreshAll = () => {
    refetchStats();
    refetchBookings();
    refetchPayments();
    refetchHealth();
  };

  const bookingColumns = [
    {
      key: 'bookingReference',
      header: 'RÉFÉRENCE',
      render: (b: AdminBooking) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
          {b.bookingReference}
        </span>
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
      key: 'status',
      header: 'STATUT',
      render: (b: AdminBooking) => (
        <AdminBadge variant={getStatusBadgeVariant(b.status)} size="sm">
          {b.status}
        </AdminBadge>
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
  ];

  const paymentColumns = [
    {
      key: 'paymentReference',
      header: 'RÉFÉRENCE',
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: '#38BDF8' }}>
          {p.paymentReference}
        </span>
      ),
    },
    {
      key: 'providerName',
      header: 'PASSERELLE',
      render: (p: AdminPayment) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--admin-surface-muted)', color: 'var(--admin-text-secondary)' }}>
          {p.providerName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUT',
      render: (p: AdminPayment) => (
        <AdminBadge variant={getStatusBadgeVariant(p.status)} size="sm">
          {p.status}
        </AdminBadge>
      ),
    },
    {
      key: 'amount',
      header: 'MONTANT',
      align: 'right' as const,
      render: (p: AdminPayment) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {Number(p.amount).toFixed(2)} {p.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title & Top Action Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Console des Opérations
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Supervision consolidée en temps réel des transactions, réservations et de l&apos;infrastructure Yuding
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: upProviders === totalProviders ? '#10B981' : '#F59E0B',
              }}
            />
            <span>
              {loadingHealth ? 'Vérification...' : `${upProviders}/${totalProviders} Systèmes UP`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="admin-btn text-xs py-2 px-3.5"
            style={{
              backgroundColor: 'var(--admin-accent-subtle)',
              border: '1px solid var(--admin-accent-border)',
              color: 'var(--admin-accent)',
            }}
          >
            <i className="fas fa-sync text-xs" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Réservations Totales"
          value={stats?.totalReservations ?? 0}
          subtext="Schéma booking.bookings"
          icon="fas fa-ticket-alt"
          variant="accent"
          isLoading={loadingStats}
        />
        <AdminStatCard
          label="Transactions Enregistrées"
          value={stats?.totalPayments ?? 0}
          subtext="Passerelles PayPal & Sandbox"
          icon="fas fa-credit-card"
          variant="info"
          isLoading={loadingStats}
        />
        <AdminStatCard
          label="Volume Transactionnel"
          value={
            stats?.totalRevenue
              ? `${stats.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
              : '0.00 €'
          }
          subtext="Paiements capturés avec succès"
          icon="fas fa-coins"
          variant="accent"
          isLoading={loadingStats}
        />
        <AdminStatCard
          label="Remboursements & Annulations"
          value={`${stats?.totalRefunds ?? 0} / ${stats?.totalCancellations ?? 0}`}
          subtext={
            stats?.totalRefundedAmount
              ? `${stats.totalRefundedAmount.toFixed(2)} € exécutés`
              : 'Flux Phase 51 vérifié'
          }
          icon="fas fa-undo-alt"
          variant="warning"
          isLoading={loadingStats}
        />
      </div>

      {/* Breakdown Strip (Distribution by Status & Vertical) */}
      {stats && (stats.bookingsByStatus || stats.bookingsByProduct) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Breakdown */}
          <div
            className="admin-card p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Répartition des Réservations par Statut
              </span>
              <span className="text-xs admin-mono-tabular font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Total: {stats.totalReservations}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(stats.bookingsByStatus || {}).map(([statusKey, count]) => (
                <div
                  key={statusKey}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--admin-surface-muted)',
                    borderColor: 'var(--admin-border)',
                  }}
                >
                  <span className="font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                    {statusKey}
                  </span>
                  <span className="admin-mono-tabular font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[0.6875rem]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Breakdown */}
          <div
            className="admin-card p-4 space-y-3"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Distribution par Verticale Produit
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                4 Verticales Actives
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(stats.bookingsByProduct || {}).map(([prodKey, count]) => (
                <div
                  key={prodKey}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--admin-surface-muted)',
                    borderColor: 'var(--admin-border)',
                  }}
                >
                  <span className="font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                    {prodKey}
                  </span>
                  <span className="admin-mono-tabular font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[0.6875rem]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dual Activity Tables (Recent Bookings & Recent Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-ticket-alt text-xs" style={{ color: 'var(--admin-accent)' }} />
              <h2 className="text-sm font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
                Dernières Réservations
              </h2>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-bold no-underline hover:underline flex items-center gap-1"
              style={{ color: 'var(--admin-accent)' }}
            >
              <span>Voir tout</span>
              <i className="fas fa-arrow-right text-[0.65rem]" />
            </Link>
          </div>

          <AdminTable
            columns={bookingColumns}
            data={recentBookings}
            keyExtractor={(b) => b.id}
            isLoading={loadingBookings}
            emptyMessage="Aucune réservation récente"
          />
        </div>

        {/* Recent Payments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-credit-card text-xs" style={{ color: '#38BDF8' }} />
              <h2 className="text-sm font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
                Transactions Récentes
              </h2>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-bold no-underline hover:underline flex items-center gap-1"
              style={{ color: '#38BDF8' }}
            >
              <span>Grand Livre</span>
              <i className="fas fa-arrow-right text-[0.65rem]" />
            </Link>
          </div>

          <AdminTable
            columns={paymentColumns}
            data={recentPayments}
            keyExtractor={(p) => p.id}
            isLoading={loadingPayments}
            emptyMessage="Aucune transaction récente"
          />
        </div>
      </div>

      {/* Infrastructure Topology Card */}
      <div
        className="admin-card p-5"
        style={{
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-server text-xs" style={{ color: 'var(--admin-accent)' }} />
            <h2 className="text-sm font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
              Topologie de l&apos;Écosystème Yuding V2
            </h2>
          </div>
          <Link
            href="/admin/providers"
            className="text-xs font-bold no-underline hover:underline"
            style={{ color: 'var(--admin-accent)' }}
          >
            Détails des Fournisseurs →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {providerHealth.slice(0, 6).map((prov) => (
            <div
              key={prov.name}
              className="p-3 rounded-lg border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[0.6875rem] font-bold truncate" style={{ color: 'var(--admin-text-primary)' }}>
                  {prov.name}
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: prov.status === 'UP' ? '#10B981' : '#F59E0B',
                  }}
                />
              </div>
              <div className="mt-2 text-[0.65rem] admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
                {prov.port ? `Port :${prov.port}` : 'API Externe'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
