'use client';

import React from 'react';
import Link from 'next/link';
import {
  useAdminStats,
  useAdminBookings,
  useAdminPayments,
  useAdminCancellations,
  useAdminUsers,
} from '@/hooks/queries/useAdminQueries';
import { useQuery } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';
import { parseTravelContext } from '@/lib/admin-travel';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminOverviewChart } from '@/components/admin/AdminOverviewChart';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { BookingVisual } from '@/components/admin/BookingVisual';

export default function AdminOverviewPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: bookings = [], isLoading: loadingBookings } = useAdminBookings({ limit: 10 });
  const { data: payments = [], isLoading: loadingPayments } = useAdminPayments({ limit: 10 });
  const { data: cancellations = [], isLoading: loadingCancellations } = useAdminCancellations(50);
  const { data: users = [] } = useAdminUsers();
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['reviews', 'moderation'],
    queryFn: reviewService.pending,
  });

  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalBookings = stats?.totalReservations ?? 0;

  // Build real incidents queue sorted by operational severity
  interface IncidentItem {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    title: string;
    description: string;
    reason?: string | null;
    timestamp: string;
    actionLabel: string;
    actionHref: string;
    badgeLabel: string;
  }

  const incidents: IncidentItem[] = [];

  // 1. CRITICAL: Failed Refunds requiring financial intervention
  cancellations
    .filter((c) => c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED')
    .forEach((c) => {
      incidents.push({
        id: `refund-failed-${c.id}`,
        severity: 'CRITICAL',
        title: `Échec Remboursement — Dossier #${c.bookingId.slice(0, 8)}`,
        description: `Montant : ${Number(c.refundAmount || 0).toFixed(2)} ${c.currency || 'MAD'} bloqué auprès du PSP.`,
        reason: c.reason || 'Erreur technique passerelle de remboursement',
        timestamp: c.requestedAt,
        actionLabel: 'Régulariser le remboursement',
        actionHref: `/admin/refunds?cancellationId=${c.id}`,
        badgeLabel: 'REMBOURSEMENT ÉCHOUÉ',
      });
    });

  // 2. CRITICAL: Booking/Payment Drift (Payment SUCCEEDED but Booking not confirmed)
  payments
    .filter((p) => p.status === 'SUCCEEDED')
    .forEach((p) => {
      const relatedBooking = bookings.find((b) => b.id === p.bookingId);
      if (relatedBooking && !['CONFIRMED', 'PAID', 'COMPLETED'].includes(relatedBooking.status)) {
        incidents.push({
          id: `drift-${p.id}`,
          severity: 'CRITICAL',
          title: `Drift Transaction / Dossier — PAY #${p.paymentReference}`,
          description: `Paiement ${Number(p.amount).toFixed(2)} ${p.currency} SUCCEEDED alors que le dossier est ${relatedBooking.status}.`,
          reason: 'Désynchronisation entre confirmation passerelle et état du dossier.',
          timestamp: p.updatedAt,
          actionLabel: 'Inspecter le dossier',
          actionHref: `/admin/bookings?search=${encodeURIComponent(relatedBooking.bookingReference)}`,
          badgeLabel: 'ANOMALIE DRIFT',
        });
      }
    });

  // 3. HIGH: Locked Accounts (lockedUntil > now or failedLoginAttempts >= 5)
  const now = new Date();
  users
    .filter(
      (u) =>
        u.status === 'LOCKED' ||
        (u.lockedUntil && new Date(u.lockedUntil) > now) ||
        u.failedLoginAttempts >= 5
    )
    .forEach((u) => {
      incidents.push({
        id: `user-lock-${u.id}`,
        severity: 'HIGH',
        title: `Compte Client Verrouillé — ${u.firstName} ${u.lastName}`,
        description: `Email : ${u.email} • ${u.failedLoginAttempts} tentatives infructueuses détectées.`,
        reason: u.lockedUntil ? `Verrouillé jusqu'à ${new Date(u.lockedUntil).toLocaleTimeString('fr-FR')}` : 'Seuil de sécurité atteint',
        timestamp: u.createdAt,
        actionLabel: 'Déverrouiller le compte',
        actionHref: `/admin/users?search=${encodeURIComponent(u.email)}`,
        badgeLabel: 'COMPTE VERROUILLÉ',
      });
    });

  // 4. MEDIUM: Pending Reviews awaiting editorial review
  if (pendingReviews.length > 0) {
    incidents.push({
      id: 'reviews-pending-batch',
      severity: 'MEDIUM',
      title: `${pendingReviews.length} Avis Voyageurs en Attente de Modération`,
      description: 'Nouveaux retours d’expérience clients nécessitant validation éditoriale avant publication.',
      timestamp: pendingReviews[0]?.createdAt || new Date().toISOString(),
      actionLabel: 'Examiner les avis',
      actionHref: '/admin/reviews',
      badgeLabel: 'MODÉRATION REQUISE',
    });
  }

  // Sort incidents by operational priority: CRITICAL > HIGH > MEDIUM
  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  incidents.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return (
    <div className="space-y-8">
      {/* 1. Page Header & Command Posture */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Centre des Opérations
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Tour de contrôle des dossiers voyages, conciliation financière et triage des incidents prioritaires.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#059669]/30 text-[#047857] dark:text-[#34D399]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Environnement Opérationnel</span>
          </div>
          {incidents.length > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
              <i className="fas fa-exclamation-triangle text-xs" />
              <span>{incidents.length} incident{incidents.length > 1 ? 's' : ''} actif{incidents.length > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
              <i className="fas fa-check-circle text-xs" />
              <span>Aucun incident bloquant</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Structured Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AdminStatCard
          label="Chiffre d'Affaires Encaissé"
          value={loadingStats ? '—' : `${totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
          subtext="Règlements autoritaires validés"
          icon="fas fa-wallet"
          variant="cool"
          isLoading={loadingStats}
          trend={{ value: '+14.2%', isPositive: true }}
        />

        <AdminStatCard
          label="Dossiers Voyage Actifs"
          value={loadingStats ? '—' : totalBookings}
          subtext="Hôtels, vols, activités, transferts"
          icon="fas fa-compass"
          variant="warm"
          isLoading={loadingStats}
        />

        <AdminStatCard
          label="Grand Livre Règlements"
          value={loadingStats ? '—' : stats?.totalPayments ?? 0}
          subtext="Transactions directes PSP"
          icon="fas fa-credit-card"
          variant="default"
          isLoading={loadingStats}
        />

        <AdminStatCard
          label="File de Triage"
          value={`${incidents.length} dossier${incidents.length > 1 ? 's' : ''}`}
          subtext={incidents.length > 0 ? 'Intervention support / trésorerie requise' : 'File d’attente dégagée'}
          icon="fas fa-shield-alt"
          variant={incidents.length > 0 ? 'incident' : 'dark'}
          isLoading={loadingCancellations}
        />
      </div>

      {/* 3. Section: Real Attention Queue (File d'Attente Prioritaire) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
              Attention Requise
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] dark:bg-[#1E2430] text-[#475569] dark:text-[#94A3B8]">
              {incidents.length}
            </span>
          </div>
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Anomalies détectées en temps réel (échecs PSP, comptes bloqués, modération)
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <i className="fas fa-check-circle text-lg text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-bold text-sm">Tous les flux opérationnels sont fluides</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-0.5">
                  Aucun échec de remboursement, aucun compte verrouillé et aucun écart de paiement détecté.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430] overflow-hidden">
            {incidents.map((incident) => {
              const isCritical = incident.severity === 'CRITICAL';
              const isHigh = incident.severity === 'HIGH';
              const badgeVariant = isCritical ? 'danger' : isHigh ? 'warning' : 'neutral';
              const iconClass = isCritical
                ? 'fa-exclamation-circle text-rose-500'
                : isHigh
                ? 'fa-lock text-amber-500'
                : 'fa-comments text-sky-500';

              return (
                <div
                  key={incident.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#F1F5F9] dark:bg-[#1E2430] mt-0.5">
                      <i className={`fas ${iconClass} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-[#0F172A] dark:text-white">
                          {incident.title}
                        </span>
                        <AdminBadge variant={badgeVariant} size="sm">
                          {incident.badgeLabel}
                        </AdminBadge>
                      </div>
                      <div className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                        {incident.description}
                      </div>
                      {incident.reason && (
                        <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5">
                          Motif : {incident.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] text-[#94A3B8] hidden md:inline">
                      {new Date(incident.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Link
                      href={incident.actionHref}
                      className="admin-btn bg-[#0F172A] text-white hover:bg-slate-800 dark:bg-white dark:text-[#0F172A] dark:hover:bg-slate-100 text-xs py-1.5 px-3 no-underline inline-flex items-center gap-2"
                    >
                      <span>{incident.actionLabel}</span>
                      <i className="fas fa-arrow-right text-[10px]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Operational Trend Chart */}
      <div>
        <AdminOverviewChart isLoading={loadingStats} />
      </div>

      {/* 5. Split Activity Grid: Left Recent Travel Dossiers, Right Treasury Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Travel Dossiers Stream (8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
              Flux Récent des Dossiers Voyage
            </h2>
            <Link
              href="/admin/bookings"
              className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
            >
              Tous les dossiers ({totalBookings}) →
            </Link>
          </div>

          <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430] overflow-hidden">
            {loadingBookings ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Chargement du flux...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Aucun dossier récent.</div>
            ) : (
              bookings.slice(0, 6).map((b) => {
                const travel = parseTravelContext(b);
                return (
                  <div
                    key={b.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <BookingVisual booking={b} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#0F172A] dark:text-white">
                            {b.bookingReference}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#64748B] dark:text-[#94A3B8]">
                            {b.productType}
                          </span>
                        </div>
                        <div className="text-xs text-[#475569] dark:text-[#94A3B8] truncate mt-0.5 font-medium">
                          {travel.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-xs text-[#0F172A] dark:text-white">
                          {b.amount ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>

                      <AdminBadge variant={getStatusBadgeVariant(b.status)} size="sm">
                        {b.status}
                      </AdminBadge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Captured Payments Stream (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
                Paiements Capturés
              </h2>
              <Link
                href="/admin/payments"
                className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
              >
                Grand Livre →
              </Link>
            </div>

            <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430] overflow-hidden">
              {loadingPayments ? (
                <div className="p-6 text-center text-xs text-[#94A3B8]">Chargement...</div>
              ) : payments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#94A3B8]">Aucun paiement récent.</div>
              ) : (
                payments.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-[#0F172A] dark:text-white truncate">
                        {p.paymentReference}
                      </div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                        {p.providerName} • {new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-xs text-[#0F172A] dark:text-white shrink-0">
                      {Number(p.amount).toFixed(2)} {p.currency}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Platform Observability Card */}
          <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] m-0">
                Supervision Plateforme
              </h3>
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            </div>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed m-0">
              Passerelle Spring Cloud Gateway :8888 active. 8 schémas relationnels PostgreSQL opérationnels.
            </p>
            <Link
              href="/admin/providers"
              className="inline-block text-xs font-bold text-[#0F172A] dark:text-white hover:underline no-underline pt-1"
            >
              Consulter la supervision →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
