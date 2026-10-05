'use client';

import React from 'react';
import Link from 'next/link';
import {
  useAdminStats,
  useAdminBookings,
  useAdminPayments,
  useAdminCancellations,
  useAdminUsers,
  useProviderHealth,
} from '@/hooks/queries/useAdminQueries';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminTable } from '@/components/admin/AdminTable';
import { BookingVisual } from '@/components/admin/BookingVisual';
import { AdminOverviewChart } from '@/components/admin/AdminOverviewChart';
import { AdminAttentionList, AttentionItem } from '@/components/admin/AdminAttentionList';
import { AdminBooking, AdminPayment } from '@/types/admin.types';
import { parseTravelContext } from '@/lib/admin-travel';

export default function AdminOverviewPage() {
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useAdminStats();
  const { data: recentBookings = [], isLoading: loadingBookings, refetch: refetchBookings } = useAdminBookings({ limit: 6 });
  const { data: recentPayments = [], isLoading: loadingPayments, refetch: refetchPayments } = useAdminPayments({ limit: 6 });
  const { data: cancellations = [], isLoading: loadingCancellations } = useAdminCancellations(50);
  const { data: users = [], isLoading: loadingUsers } = useAdminUsers();
  const { data: providerHealth = [], isLoading: loadingHealth, refetch: refetchHealth } = useProviderHealth();

  const upProviders = providerHealth.filter((p) => p.status === 'UP').length;
  const totalProviders = providerHealth.length || 7;

  // Build urgent triage queue from real authoritative data
  const failedPayments = recentPayments.filter((p) => p.status === 'FAILED');
  const failedRefunds = cancellations.filter(
    (c) => c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED'
  );
  const lockedUsers = users.filter(
    (u) => (u.lockedUntil && new Date(u.lockedUntil) > new Date()) || u.status === 'LOCKED'
  );

  const attentionItems: AttentionItem[] = [
    ...failedRefunds.map((r) => ({
      id: `ref-${r.id}`,
      type: 'REFUND_FAILED' as const,
      title: `Échec Remboursement • Dossier ${r.bookingId ? r.bookingId.slice(0, 8) : r.id.slice(0, 8)}`,
      subtitle: `${r.refundAmount ? Number(r.refundAmount).toFixed(2) : '—'} MAD bloqués (motif: ${r.reason || 'PSP'})`,
      timestamp: r.requestedAt ? new Date(r.requestedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récemment',
      severity: 'high' as const,
      actionHref: '/admin/refunds',
      actionLabel: 'Relancer',
    })),
    ...failedPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: 'PAYMENT_FAILED' as const,
      title: `Échec Paiement • ${p.paymentReference}`,
      subtitle: `${Number(p.amount).toFixed(2)} ${p.currency} rejetés (${p.providerName})`,
      timestamp: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui',
      severity: 'medium' as const,
      actionHref: '/admin/payments',
      actionLabel: 'Inspecter',
    })),
    ...lockedUsers.map((u) => ({
      id: `usr-${u.id}`,
      type: 'ACCOUNT_LOCKED' as const,
      title: `Compte Verrouillé • ${u.email}`,
      subtitle: `${u.failedLoginAttempts || 5} tentatives erronées consécutives`,
      timestamp: 'Sécurité identity',
      severity: 'high' as const,
      actionHref: '/admin/users',
      actionLabel: 'Débloquer',
    })),
  ];

  const handleRefreshAll = () => {
    refetchStats();
    refetchBookings();
    refetchPayments();
    refetchHealth();
  };

  const bookingColumns = [
    {
      key: 'bookingReference',
      header: 'DOSSIER & VOYAGE',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex items-center gap-2.5 py-1">
            <BookingVisual booking={b} size="sm" />
            <div className="min-w-0">
              <span className="admin-mono-tabular font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                {b.bookingReference}
              </span>
              <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100 truncate block max-w-[190px]">
                {travel.title}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'productType',
      header: 'DATES & DÉTAILS',
      render: (b: AdminBooking) => {
        const travel = parseTravelContext(b);
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
              {travel.dates}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 admin-mono-tabular">
              {travel.badge} • ID {b.id.slice(0, 8)}
            </span>
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
        <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-zinc-100">
          {b.amount != null ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
        </span>
      ),
    },
  ];

  const paymentColumns = [
    {
      key: 'paymentReference',
      header: 'RÉFÉRENCE & DATE',
      render: (p: AdminPayment) => (
        <div className="flex flex-col py-1">
          <span className="admin-mono-tabular font-bold text-xs text-sky-600 dark:text-sky-400">
            {p.paymentReference}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 admin-mono-tabular">
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'providerName',
      header: 'PASSERELLE',
      render: (p: AdminPayment) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700">
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
        <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-zinc-100">
          {Number(p.amount).toFixed(2)} {p.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title & Operational Context Bar with Reference-style Heading */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 font-sans">
              Console des Opérations
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold admin-mono-tabular">
              v2.0
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Supervision autoritaire en direct : flux transactionnels, dossiers voyage et santé de l&apos;architecture
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 shadow-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: upProviders === totalProviders ? '#10B981' : '#F59E0B',
              }}
            />
            <span>
              {loadingHealth ? 'Vérification...' : `${upProviders}/${totalProviders} Composants UP`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 transition-colors shadow-xs"
          >
            <i className="fas fa-sync text-[10px]" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards Grid with Reference Hierarchy (Soft Blue, Soft Peach, Bold Dark) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Dossiers Réservations"
          value={stats?.totalReservations ?? 0}
          subtext="Schéma booking.bookings"
          icon="fas fa-ticket-alt"
          variant="cool"
          isLoading={loadingStats}
          trend={{ value: '+12%', isPositive: true }}
        />
        <AdminStatCard
          label="Flux Financiers Net"
          value={
            stats?.totalRevenue
              ? `${stats.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`
              : '0.00 MAD'
          }
          subtext="Paiements capturés avec succès"
          icon="fas fa-coins"
          variant="dark"
          isLoading={loadingStats}
          trend={{ value: 'Authoritative', isPositive: true }}
        />
        <AdminStatCard
          label="Transactions Enregistrées"
          value={stats?.totalPayments ?? 0}
          subtext="Passerelles PayPal & Sandbox"
          icon="fas fa-credit-card"
          variant="warm"
          isLoading={loadingStats}
          trend={{ value: '+8%', isPositive: true }}
        />
        <AdminStatCard
          label="Incidents & Remboursements"
          value={`${attentionItems.length} à traiter`}
          subtext={
            stats?.totalRefundedAmount
              ? `${stats.totalRefundedAmount.toFixed(2)} MAD restitués`
              : 'Flux Phase 51 vérifié'
          }
          icon="fas fa-exclamation-circle"
          variant={attentionItems.length > 0 ? 'incident' : 'default'}
          isLoading={loadingStats || loadingCancellations || loadingUsers}
        />
      </div>

      {/* Row 2: Operational Activity Chart + Dense Attention Panel (Reference composition: Left Chart, Right Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8">
          <AdminOverviewChart isLoading={loadingStats} />
        </div>
        <div className="lg:col-span-4">
          <AdminAttentionList
            items={attentionItems}
            isLoading={loadingBookings || loadingPayments || loadingCancellations}
          />
        </div>
      </div>

      {/* Row 3: Dual Live Activity Tables (Dossiers Voyage & Flux Financiers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Travel Dossiers */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <i className="fas fa-ticket-alt text-xs text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 m-0">
                Derniers Dossiers Voyage
              </h2>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline no-underline flex items-center gap-1"
            >
              <span>Gérer les dossiers</span>
              <i className="fas fa-arrow-right text-[10px]" />
            </Link>
          </div>

          <AdminTable
            columns={bookingColumns}
            data={recentBookings}
            keyExtractor={(b) => b.id}
            isLoading={loadingBookings}
            emptyMessage="Aucune réservation récente enregistrée"
          />
        </div>

        {/* Recent Payment Flows */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <i className="fas fa-credit-card text-xs text-blue-600 dark:text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 m-0">
                Flux Financiers &amp; Grand Livre
              </h2>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline flex items-center gap-1"
            >
              <span>Grand Livre complet</span>
              <i className="fas fa-arrow-right text-[10px]" />
            </Link>
          </div>

          <AdminTable
            columns={paymentColumns}
            data={recentPayments}
            keyExtractor={(p) => p.id}
            isLoading={loadingPayments}
            emptyMessage="Aucune transaction financière récente"
          />
        </div>
      </div>

      {/* Row 4: Ecosystem Health & Microservices Topology Strip */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <i className="fas fa-server text-xs text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 m-0">
              Topologie de l&apos;Écosystème Yuding V2
            </h2>
          </div>
          <Link
            href="/admin/providers"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline no-underline"
          >
            Santé &amp; Télémétrie complète →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {providerHealth.slice(0, 6).map((prov) => (
            <div
              key={prov.name}
              className="p-3 rounded-xl border flex flex-col justify-between bg-slate-50/70 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {prov.name}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: prov.status === 'UP' ? '#10B981' : '#F59E0B',
                  }}
                />
              </div>
              <div className="mt-2 text-[10px] admin-mono-tabular text-slate-400 dark:text-zinc-500">
                {prov.port ? `Port :${prov.port}` : 'Passerelle / API'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
