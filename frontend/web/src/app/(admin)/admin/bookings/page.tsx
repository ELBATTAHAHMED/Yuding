'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminBookings, useAdminUsers } from '@/hooks/queries/useAdminQueries';
import { parseTravelContext } from '@/lib/admin-travel';
import { AdminBooking } from '@/types/admin.types';

export default function AdminBookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

  const { data: bookings = [], isLoading } = useAdminBookings({ limit: 100 });
  const { data: users = [] } = useAdminUsers();

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const travel = parseTravelContext(b);
    return (
      b.bookingReference.toLowerCase().includes(term) ||
      b.userId.toLowerCase().includes(term) ||
      travel.title.toLowerCase().includes(term)
    );
  });

  const selectedTravel = selectedBooking ? parseTravelContext(selectedBooking) : null;
  const selectedUser = selectedBooking ? users.find((u) => u.id === selectedBooking.userId) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Dossiers de Réservation
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Supervision opérationnelle des réservations de séjours, vols, transports et excursions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrer par référence ou destination..."
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none font-semibold cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="CONFIRMED">Confirmé / Payé</option>
            <option value="PENDING">En attente</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>
      </div>

      {/* 2. Split Workspace Layout: Master Table on Left, Live Dossier Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Master Booking Registry Table (7 or 12 cols depending on selection) */}
        <div className={`${selectedBooking ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4">Dossier</th>
                  <th className="py-3 px-4">Prestation</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-right">Tarif</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                      Chargement des réservations...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                      Aucune réservation trouvée.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const travel = parseTravelContext(b);
                    const isSelected = selectedBooking?.id === b.id;
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBooking(isSelected ? null : b)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#F1F5F9] dark:bg-[#1E232D]'
                            : 'hover:bg-[#FAFAFB] dark:hover:bg-[#161B22]'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A] dark:text-white">
                          {b.bookingReference}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#0F172A] dark:text-white truncate max-w-[200px]">
                            {travel.title}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] truncate max-w-[200px]">
                            {travel.subtitle}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                          {travel.dates}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          {b.amount ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              b.status === 'CONFIRMED' || b.status === 'PAID'
                                ? 'bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]'
                                : 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]'
                            }`}
                          >
                            {b.status}
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

        {/* Right: Rich Contextual Travel Dossier Inspector (5 cols) */}
        {selectedBooking && selectedTravel && (
          <div className="lg:col-span-5 bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl p-6 space-y-6 sticky top-24 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#1A1F28]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Dossier Opérateur
                </span>
                <h3 className="text-lg font-bold font-mono text-[#0F172A] dark:text-white m-0 mt-0.5">
                  {selectedBooking.bookingReference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white p-1"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Travel Experience Context */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Prestation Voyage
              </div>
              <div className="p-4 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D] space-y-1">
                <div className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {selectedTravel.title}
                </div>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {selectedTravel.subtitle}
                </div>
                <div className="text-xs text-[#0F172A] dark:text-white font-medium pt-1">
                  Période : {selectedTravel.dates}
                </div>
              </div>
            </div>

            {/* Financial Ledger Binding */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Règlement Financier
              </div>
              <div className="p-4 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#94A3B8]">Total Débité</div>
                  <div className="text-base font-extrabold font-mono text-[#0F172A] dark:text-white">
                    {selectedBooking.amount ? `${Number(selectedBooking.amount).toFixed(2)} ${selectedBooking.currency || 'MAD'}` : '—'}
                  </div>
                </div>
                <Link
                  href={`/admin/payments?search=${encodeURIComponent(selectedBooking.bookingReference)}`}
                  className="text-xs font-bold text-[#00D4AA] hover:underline no-underline"
                >
                  Voir dans le Grand Livre →
                </Link>
              </div>
            </div>

            {/* Traveler Profile */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Client Voyageur
              </div>
              <div className="p-4 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D] space-y-1">
                <div className="font-bold text-xs text-[#0F172A] dark:text-white">
                  {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : selectedBooking.userId}
                </div>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {selectedUser?.email || 'Email non renseigné'}
                </div>
                <Link
                  href={`/admin/users?search=${encodeURIComponent(selectedBooking.userId)}`}
                  className="text-xs font-semibold text-[#00D4AA] hover:underline no-underline inline-block pt-1"
                >
                  Fiche identité complète →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
