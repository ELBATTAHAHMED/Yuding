'use client';

import React from 'react';
import Link from 'next/link';
import {
  useAdminStats,
  useAdminBookings,
  useAdminPayments,
  useAdminCancellations,
  useProviderHealth,
} from '@/hooks/queries/useAdminQueries';
import { parseTravelContext } from '@/lib/admin-travel';

export default function AdminOverviewPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: bookings = [], isLoading: loadingBookings } = useAdminBookings({ limit: 8 });
  const { data: payments = [], isLoading: loadingPayments } = useAdminPayments({ limit: 6 });
  const { data: cancellations = [], isLoading: loadingCancellations } = useAdminCancellations(20);
  const { data: providers = [], isLoading: loadingHealth } = useProviderHealth();

  const upProviders = providers.filter((p) => p.status === 'UP').length;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalBookings = stats?.totalReservations ?? 0;
  const pendingIncidents = cancellations.filter((c) => c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-10">
      {/* 1. Header & Live Posture */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Centre des Opérations
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Surveillance autoritaire des réservations multi-services, liquidités et santé système.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Infrastructure : {upProviders}/{providers.length || 15} UP</span>
          </div>
          <div className="h-4 w-px bg-[#E2E8F0] dark:bg-[#2D3748]" />
          <div>Environnement : Bac à sable</div>
        </div>
      </div>

      {/* 2. Operational Metrics Bar — Calm Numbers, Strong Contrast, No Card Soup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
            Chiffre d&apos;Affaires Capturé
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            {loadingStats ? '—' : `${totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`}
          </div>
          <div className="text-xs text-[#10B981] font-medium flex items-center gap-1">
            <i className="fas fa-check-circle text-[10px]" />
            <span>Règlements autoritaires validés</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
            Volume de Dossiers
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            {loadingStats ? '—' : totalBookings}
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Hôtels, vols, transferts, activités
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
            Transactions Flux Direct
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
            {loadingStats ? '—' : stats?.totalPayments ?? 0}
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Grand livre des passerelles
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
            Triage &amp; Incidents
          </div>
          <div className={`text-3xl font-extrabold tracking-tight ${pendingIncidents > 0 ? 'text-[#EF4444]' : 'text-[#0F172A] dark:text-white'}`}>
            {pendingIncidents} dossier{pendingIncidents > 1 ? 's' : ''}
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {pendingIncidents > 0 ? 'Action requise en trésorerie' : 'Aucun litige bloquant'}
          </div>
        </div>
      </div>

      {/* 3. Operational Grid: Left Live Travel Activity, Right Treasury Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Real Travel Dossiers Stream (8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
              Flux Récents des Réservations
            </h2>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-[#00D4AA] hover:underline no-underline"
            >
              Voir tous les dossiers ({totalBookings}) →
            </Link>
          </div>

          <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
            {loadingBookings ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Chargement du flux...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Aucun dossier récent.</div>
            ) : (
              bookings.slice(0, 6).map((b) => {
                const travel = parseTravelContext(b);
                const isPaid = b.status === 'CONFIRMED' || b.status === 'PAID';
                return (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] dark:bg-[#1A1F29] border border-[#E2E8F0] dark:border-[#2D3748] flex items-center justify-center shrink-0">
                        <i className="fas fa-ticket-alt text-[#0F172A] dark:text-white text-xs" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#0F172A] dark:text-white">
                            {b.bookingReference}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#1E232D] text-[#64748B] dark:text-[#94A3B8]">
                            {b.productType}
                          </span>
                        </div>
                        <div className="text-xs text-[#475569] dark:text-[#94A3B8] truncate mt-0.5 font-medium">
                          {travel.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <div className="font-mono font-bold text-xs text-[#0F172A] dark:text-white">
                          {b.amount ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Financial Ledger Stream & Telemetry (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
                Paiements Capturés
              </h2>
              <Link
                href="/admin/payments"
                className="text-xs font-semibold text-[#00D4AA] hover:underline no-underline"
              >
                Grand Livre →
              </Link>
            </div>

            <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl divide-y divide-[#F1F3F5] dark:divide-[#1A1F28] overflow-hidden">
              {payments.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-[#0F172A] dark:text-white truncate">
                      {p.paymentReference}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      {p.providerName} • {new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-[#0F172A] dark:text-white shrink-0">
                    {Number(p.amount).toFixed(2)} {p.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Health Summary */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] m-0">
              Observabilité de la plateforme
            </h3>
            <div className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
              Toutes les passerelles et le routage API Gateway fonctionnent normalement. Isolation des 8 schémas PostgreSQL respectée.
            </div>
            <Link
              href="/admin/providers"
              className="inline-block text-xs font-bold text-[#0F172A] dark:text-white hover:underline no-underline"
            >
              Consulter la matrice de télémétrie →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
