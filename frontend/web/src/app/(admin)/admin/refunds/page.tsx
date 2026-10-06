'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useAdminRefunds,
  useAdminCancellations,
  useRetryRefundMutation,
  useAdminBookings,
} from '@/hooks/queries/useAdminQueries';
import { useAuth } from '@/features/auth/useAuth';
import { AdminBadge, getStatusBadgeVariant } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminRefundsPage() {
  const { isAdmin } = useAuth();
  const [selectedItem, setSelectedItem] = useState<{ type: 'REFUND' | 'CANCELLATION'; data: any } | null>(null);
  const [retrySuccessMsg, setRetrySuccessMsg] = useState<string | null>(null);
  const [retryErrorMsg, setRetryErrorMsg] = useState<string | null>(null);

  const { data: refunds = [], isLoading: loadingRefunds, refetch: refetchRefunds } = useAdminRefunds(50);
  const { data: cancellations = [], isLoading: loadingCancellations, refetch: refetchCancellations } = useAdminCancellations(50);
  const { data: bookings = [] } = useAdminBookings({ limit: 100 });
  const retryMutation = useRetryRefundMutation();

  const totalRefunded = refunds
    .filter((r) => r.status === 'SUCCEEDED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const pendingRefunds = cancellations.filter(
    (c) => c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED' || c.status === 'PENDING'
  ).length;

  const handleRetryRefund = async (cancellationId: string) => {
    setRetrySuccessMsg(null);
    setRetryErrorMsg(null);
    try {
      const res = await retryMutation.mutateAsync(cancellationId);
      setRetrySuccessMsg('Remboursement relancé avec succès.');
      await Promise.all([refetchRefunds(), refetchCancellations()]);
      if (selectedItem && selectedItem.type === 'CANCELLATION') {
        setSelectedItem({
          type: 'CANCELLATION',
          data: { ...selectedItem.data, refundStatus: 'REFUNDED', status: 'REFUNDED' },
        });
      }
    } catch (err: any) {
      setRetryErrorMsg(err.message || 'Impossible de relancer le remboursement.');
    }
  };

  const getBookingRef = (bookingId: string) => {
    const found = bookings.find((b) => b.id === bookingId);
    return found ? found.bookingReference : bookingId.slice(0, 8);
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Annulations &amp; Remboursements
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Cycle de vie autoritaire des annulations, application des politiques tarifaires et exécution PSP.
          </p>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Total Restitué aux Voyageurs
            </div>
            <div className="text-xl font-mono font-extrabold text-[#0F172A] dark:text-white">
              {totalRefunded.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </div>
          </div>
          {pendingRefunds > 0 && (
            <div className="pl-6 border-l border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-500">
                Arbitrages en Attente
              </div>
              <div className="text-xl font-mono font-extrabold text-rose-600 dark:text-rose-400">
                {pendingRefunds}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Visual Lifecycle Explainer */}
      <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#0F172A] dark:text-white font-bold">
          <i className="fas fa-sync-alt text-[#0D9488] dark:text-[#00D4AA]" />
          <span>Workflow de Régularisation Financière :</span>
        </div>
        <div className="flex items-center gap-2 font-medium text-[#64748B] dark:text-[#94A3B8]">
          <span className="px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#0F172A] dark:text-white font-bold">1. Demande d&apos;Annulation</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#0F172A] dark:text-white font-bold">2. Frais &amp; Barème</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399] font-bold">3. Virement PSP</span>
        </div>
      </div>

      {/* 3. Section: Pending Cancellation Demands (Triage Table) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
            Demandes d&apos;Annulation ({cancellations.length})
          </h2>
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            File d&apos;attente des dossiers résiliés et arbitrages de remboursement
          </span>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Dossier</th>
                  <th>Motif Déclaré</th>
                  <th>Date de Demande</th>
                  <th className="text-right">Remboursement Prévu</th>
                  <th className="text-center">État</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingCancellations ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-4">
                        <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : cancellations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#94A3B8] text-xs">
                      Aucune demande d&apos;annulation enregistrée.
                    </td>
                  </tr>
                ) : (
                  cancellations.map((c) => {
                    const isFailed = c.status === 'REFUND_FAILED' || c.refundStatus === 'REFUND_FAILED';
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedItem({ type: 'CANCELLATION', data: c })}
                        className={`cursor-pointer transition-colors ${
                          isFailed ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28]'
                        }`}
                      >
                        <td className="font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                          {getBookingRef(c.bookingId)}
                        </td>
                        <td className="text-xs text-[#475569] dark:text-[#94A3B8] truncate max-w-xs">
                          {c.reason || 'Demande voyageur standard'}
                        </td>
                        <td className="text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {new Date(c.requestedAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="text-right font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                          {c.refundAmount ? `${Number(c.refundAmount).toFixed(2)} MAD` : '—'}
                        </td>
                        <td className="text-center whitespace-nowrap">
                          <AdminBadge variant={isFailed ? 'danger' : getStatusBadgeVariant(c.status)} size="sm">
                            {c.refundStatus || c.status}
                          </AdminBadge>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button
                            type="button"
                            className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                          >
                            Examiner →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Section: Executed Refunds History Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white m-0">
            Historique des Remboursements Exécutés ({refunds.length})
          </h2>
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Virements bancaires et transactions PSP validées
          </span>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto admin-custom-scrollbar">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Réf. Remboursement</th>
                  <th>Dossier Lié</th>
                  <th>Date d&apos;Exécution</th>
                  <th className="text-right">Montant Restitué</th>
                  <th className="text-center">Statut PSP</th>
                  <th className="text-right">Détails</th>
                </tr>
              </thead>
              <tbody>
                {loadingRefunds ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-4">
                        <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#94A3B8] text-xs">
                      Aucun remboursement archivé.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedItem({ type: 'REFUND', data: r })}
                      className="cursor-pointer hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors"
                    >
                      <td className="font-mono font-bold text-xs text-[#0F172A] dark:text-white whitespace-nowrap">
                        {r.refundReference}
                      </td>
                      <td className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {getBookingRef(r.bookingId)}
                      </td>
                      <td className="text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="text-right font-mono font-bold text-xs text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        -{Number(r.amount).toFixed(2)} {r.currency}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        <AdminBadge variant={getStatusBadgeVariant(r.status)} size="sm">
                          {r.status}
                        </AdminBadge>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                        >
                          Fiche →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. Detail Inspector Drawer with Retry-Refund Action */}
      <AdminDrawer
        isOpen={Boolean(selectedItem)}
        onClose={() => {
          setSelectedItem(null);
          setRetrySuccessMsg(null);
          setRetryErrorMsg(null);
        }}
        title={
          selectedItem?.type === 'REFUND'
            ? selectedItem.data.refundReference
            : `Annulation Dossier ${getBookingRef(selectedItem?.data.bookingId)}`
        }
        subtitle="Dossier de régularisation trésorerie"
        badge={
          selectedItem ? (
            <AdminBadge variant={getStatusBadgeVariant(selectedItem.data.status || selectedItem.data.refundStatus)} size="sm">
              {selectedItem.data.status || selectedItem.data.refundStatus}
            </AdminBadge>
          ) : undefined
        }
        rawJson={selectedItem?.data}
      >
        {selectedItem && (
          <div className="space-y-6">
            {retrySuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <i className="fas fa-check-circle text-emerald-600" />
                <span>{retrySuccessMsg}</span>
              </div>
            )}

            {retryErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-rose-600" />
                <span>{retryErrorMsg}</span>
              </div>
            )}

            {/* Refund Math / Fee Breakdown */}
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Décompte Financier
              </div>
              <div className="text-2xl font-black font-mono text-[#0F172A] dark:text-white">
                {selectedItem.type === 'REFUND'
                  ? `${Number(selectedItem.data.amount).toFixed(2)} ${selectedItem.data.currency}`
                  : `${Number(selectedItem.data.refundAmount || 0).toFixed(2)} MAD`}
              </div>
              {selectedItem.type === 'CANCELLATION' && selectedItem.data.cancellationFee != null && (
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8] pt-2 border-t border-[#E2E8F0] dark:border-[#2D3748] flex justify-between">
                  <span>Frais d&apos;annulation retenus :</span>
                  <span className="font-mono font-bold text-[#0F172A] dark:text-white">
                    {Number(selectedItem.data.cancellationFee).toFixed(2)} MAD
                  </span>
                </div>
              )}
            </div>

            {/* Retry Refund Action Button (Strictly when eligible: REFUND_FAILED) */}
            {selectedItem.type === 'CANCELLATION' &&
              (selectedItem.data.status === 'REFUND_FAILED' || selectedItem.data.refundStatus === 'REFUND_FAILED') &&
              isAdmin && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-3">
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-rose-600" />
                    <span>Échec de virement PSP détecté</span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-400 m-0">
                    L&apos;exécution automatique a rencontré une anomalie. Vous pouvez relancer le virement de manière sécurisée et idempotente.
                  </p>
                  <button
                    type="button"
                    disabled={retryMutation.isPending}
                    onClick={() => handleRetryRefund(selectedItem.data.id)}
                    className="admin-btn bg-rose-600 hover:bg-rose-700 text-white text-xs w-full py-2.5 flex items-center justify-center gap-2"
                  >
                    <i className={`fas fa-redo-alt ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>{retryMutation.isPending ? 'Exécution en cours...' : 'Réessayer le remboursement'}</span>
                  </button>
                </div>
              )}

            <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430]">
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Motif Déclaré</span>
                <span className="text-[#0F172A] dark:text-white font-medium text-right max-w-xs">
                  {selectedItem.data.reason || 'Conforme aux conditions générales de vente'}
                </span>
              </div>
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Dossier Voyage Lié</span>
                <Link
                  href={`/admin/bookings?search=${encodeURIComponent(getBookingRef(selectedItem.data.bookingId))}`}
                  className="font-mono text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                >
                  {getBookingRef(selectedItem.data.bookingId)} →
                </Link>
              </div>
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Date d&apos;enregistrement</span>
                <span className="text-[#0F172A] dark:text-white font-medium">
                  {new Date(selectedItem.data.createdAt || selectedItem.data.requestedAt).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Context Navigation Link */}
            <div className="pt-2">
              <Link
                href={`/admin/payments?search=${encodeURIComponent(getBookingRef(selectedItem.data.bookingId))}`}
                className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
              >
                Inspecter le paiement initial au Grand Livre →
              </Link>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
