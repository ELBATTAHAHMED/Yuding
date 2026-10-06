'use client';

import React from 'react';
import { useAdminRefunds, useAdminCancellations } from '@/hooks/queries/useAdminQueries';

export default function AdminRefundsPage() {
  const { data: refunds = [], isLoading: loadingRefunds } = useAdminRefunds(50);
  const { data: cancellations = [], isLoading: loadingCancellations } = useAdminCancellations(50);

  const totalRefunded = refunds
    .filter((r) => r.status === 'SUCCEEDED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Remboursements &amp; Annulations
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Cycle de vie autoritaire des annulations, déduction des frais de barème et exécution PSP.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
            Total Restitué aux Clients
          </div>
          <div className="text-xl font-mono font-extrabold text-[#0F172A] dark:text-white">
            {totalRefunded.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
          </div>
        </div>
      </div>

      {/* 2. Dual Ledger: Pending Cancellations (Triage) & Processed Refunds */}
      <div className="space-y-8">
        {/* Triage: Cancellations needing settlement */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-white m-0">
            Demandes d&apos;Annulation ({cancellations.length})
          </h2>

          <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4">Dossier</th>
                  <th className="py-3 px-4">Motif</th>
                  <th className="py-3 px-4">Date Demande</th>
                  <th className="py-3 px-4 text-right">Remboursement Dû</th>
                  <th className="py-3 px-4 text-center">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
                {loadingCancellations ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      Chargement des annulations...
                    </td>
                  </tr>
                ) : cancellations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      Aucune annulation en attente.
                    </td>
                  </tr>
                ) : (
                  cancellations.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] dark:text-white">
                        {c.bookingId.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-[#475569] dark:text-[#94A3B8]">
                        {c.reason || 'Demande voyageur standard'}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">
                        {new Date(c.requestedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A] dark:text-white">
                        {c.refundAmount ? `${Number(c.refundAmount).toFixed(2)} MAD` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Processed Refunds Ledger */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] dark:text-white m-0">
            Historique des Remboursements Exécutés ({refunds.length})
          </h2>

          <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Dossier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Montant Restitué</th>
                  <th className="py-3 px-4 text-center">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
                {loadingRefunds ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      Chargement des remboursements...
                    </td>
                  </tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#94A3B8]">
                      Aucun remboursement archivé.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] dark:text-white">
                        {r.refundReference}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">
                        {r.bookingId.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A] dark:text-white">
                        {Number(r.amount).toFixed(2)} {r.currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
