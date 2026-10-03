'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminPayments, useAdminCancellations, useAdminUsers } from '@/hooks/queries/useAdminQueries';

export function AdminAttentionBanner() {
  const { data: payments = [] } = useAdminPayments({ limit: 100 });
  const { data: cancellations = [] } = useAdminCancellations(100);
  const { data: users = [] } = useAdminUsers();

  const failedPayments = payments.filter((p) => p.status === 'FAILED');
  const failedRefunds = cancellations.filter(
    (c) => c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED'
  );
  const lockedUsers = users.filter(
    (u) => (u.lockedUntil && new Date(u.lockedUntil) > new Date()) || u.status === 'LOCKED'
  );
  const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED');

  const totalIncidents = failedPayments.length + failedRefunds.length + lockedUsers.length;

  if (totalIncidents === 0 && suspendedUsers.length === 0) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center justify-between transition-all"
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
          >
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
              Tous les flux opérationnels sont nominaux
            </div>
            <div className="text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune anomalie détectée sur les paiements, remboursements ou comptes utilisateurs.
            </div>
          </div>
        </div>
        <div
          className="text-[0.6875rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}
        >
          0 Alerte
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3 shadow-xs transition-all"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
        borderColor: 'rgba(239, 68, 68, 0.28)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs animate-pulse"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.18)', color: '#EF4444' }}
          >
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider m-0" style={{ color: '#EF4444' }}>
              File d&apos;Incidents & Triage Immédiat ({totalIncidents} à traiter)
            </h2>
            <div className="text-[0.6875rem] font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              Attention requise sur les transactions financières ou la gouvernance des comptes
            </div>
          </div>
        </div>
        <span
          className="text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}
        >
          Haute Priorité
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {failedPayments.length > 0 && (
          <Link
            href="/admin/payments"
            className="p-2.5 rounded-lg border flex items-center justify-between no-underline group hover:border-red-400 transition-colors"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <i className="fas fa-credit-card text-xs text-red-500" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {failedPayments.length} Échec(s) de Paiement
                </div>
                <div className="text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Transactions rejetées par passerelle
                </div>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[0.65rem] text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {failedRefunds.length > 0 && (
          <Link
            href="/admin/refunds"
            className="p-2.5 rounded-lg border flex items-center justify-between no-underline group hover:border-amber-400 transition-colors"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <i className="fas fa-undo-alt text-xs text-amber-500" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {failedRefunds.length} Remboursement(s) Échoué(s)
                </div>
                <div className="text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Action requise : Relancer le remboursement
                </div>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[0.65rem] text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {lockedUsers.length > 0 && (
          <Link
            href="/admin/users"
            className="p-2.5 rounded-lg border flex items-center justify-between no-underline group hover:border-sky-400 transition-colors"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'rgba(56, 189, 248, 0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <i className="fas fa-lock text-xs text-sky-500" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {lockedUsers.length} Compte(s) Verrouillé(s)
                </div>
                <div className="text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Échecs de connexion consécutifs
                </div>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[0.65rem] text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {suspendedUsers.length > 0 && (
          <Link
            href="/admin/users"
            className="p-2.5 rounded-lg border flex items-center justify-between no-underline group hover:border-slate-400 transition-colors"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <i className="fas fa-user-slash text-xs text-amber-500" />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {suspendedUsers.length} Compte(s) Suspendu(s)
                </div>
                <div className="text-[0.65rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Accès désactivé par un administrateur
                </div>
              </div>
            </div>
            <i className="fas fa-chevron-right text-[0.65rem] text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  );
}
