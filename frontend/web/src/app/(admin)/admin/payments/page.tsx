'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminPayments, useAdminBookings } from '@/hooks/queries/useAdminQueries';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: payments = [], isLoading } = useAdminPayments({ limit: 100 });
  const { data: bookings = [] } = useAdminBookings({ limit: 200 });

  const getBookingRef = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    return booking ? booking.bookingReference : bookingId.substring(0, 8);
  };

  const filtered = payments.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const bRef = getBookingRef(p.bookingId).toLowerCase();
    return (
      p.paymentReference.toLowerCase().includes(term) ||
      bRef.includes(term) ||
      p.providerName.toLowerCase().includes(term)
    );
  });

  const totalCaptured = payments
    .filter((p) => p.status === 'SUCCEEDED' || p.status === 'CAPTURED')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header & Live Ledger Status */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Grand Livre des Flux Financiers
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Traçabilité autoritaire de la trésorerie : règlements passerelles, devises et statuts d&apos;encaissement.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
              Volume Capturé Total
            </div>
            <div className="text-xl font-mono font-extrabold text-[#0F172A] dark:text-white">
              {totalCaptured.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compact Control Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrer par transaction, dossier..."
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none font-semibold cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SUCCEEDED">Réussi (SUCCEEDED)</option>
            <option value="FAILED">Échoué (FAILED)</option>
            <option value="REFUNDED">Remboursé (REFUNDED)</option>
          </select>
        </div>
      </div>

      {/* 3. Streamlined Ledger Table */}
      <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
              <th className="py-3 px-4">Référence</th>
              <th className="py-3 px-4">Dossier Associé</th>
              <th className="py-3 px-4">Passerelle</th>
              <th className="py-3 px-4">Date &amp; Heure</th>
              <th className="py-3 px-4 text-right">Montant</th>
              <th className="py-3 px-4 text-center">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                  Chargement des transactions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                  Aucun mouvement financier trouvé.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const bRef = getBookingRef(p.bookingId);
                const isSuccess = p.status === 'SUCCEEDED' || p.status === 'CAPTURED';
                return (
                  <tr key={p.id} className="hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] dark:text-white">
                      {p.paymentReference}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/bookings?search=${encodeURIComponent(p.bookingId)}`}
                        className="font-mono font-semibold text-[#00D4AA] hover:underline no-underline"
                      >
                        {bRef}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569] dark:text-[#94A3B8]">
                      {p.providerName}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A] dark:text-white">
                      {Number(p.amount).toFixed(2)} {p.currency}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          isSuccess
                            ? 'bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]'
                            : p.status === 'REFUNDED'
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] dark:bg-[#1E3A8A]/40 dark:text-[#60A5FA]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
