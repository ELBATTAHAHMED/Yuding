'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminUsers, useAdminBookings } from '@/hooks/queries/useAdminQueries';
import { AdminUserSummary } from '@/types/admin.types';

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);

  const { data: users = [], isLoading } = useAdminUsers();
  const { data: allBookings = [] } = useAdminBookings({ limit: 500 });

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && !u.roles.includes(roleFilter)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term)
    );
  });

  const userBookings = selectedUser ? allBookings.filter((b) => b.userId === selectedUser.id) : [];
  const userSpend = userBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Gouvernance des Utilisateurs &amp; RBAC
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Contrôle des comptes autoritaires, privilèges de sécurité et historique d&apos;activité client.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email..."
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none w-64"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none font-semibold cursor-pointer"
          >
            <option value="ALL">Tous les rôles</option>
            <option value="ROLE_USER">Voyageur (ROLE_USER)</option>
            <option value="ROLE_ADMIN">Administrateur (ROLE_ADMIN)</option>
            <option value="ROLE_SUPPORT">Support (ROLE_SUPPORT)</option>
          </select>
        </div>
      </div>

      {/* 2. Workspace: User Registry + Direct Identity Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Users Registry Table */}
        <div className={`${selectedUser ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Rôles RBAC</th>
                  <th className="py-3 px-4">Activité</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                      Chargement des utilisateurs...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const fullName = `${u.firstName} ${u.lastName}`.trim() || 'Client';
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(isSelected ? null : u)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#F1F5F9] dark:bg-[#1E232D]'
                            : 'hover:bg-[#FAFAFB] dark:hover:bg-[#161B22]'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#0F172A] dark:text-white">
                            {fullName}
                          </div>
                          <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            {u.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E232D] text-[#475569] dark:text-[#94A3B8] font-semibold"
                              >
                                {r.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#475569] dark:text-[#94A3B8]">
                          {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                              u.status === 'ACTIVE'
                                ? 'bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]'
                                : 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]'
                            }`}
                          >
                            {u.status}
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

        {/* Right: User Dossier & Investigation Pane */}
        {selectedUser && (
          <div className="lg:col-span-5 bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl p-6 space-y-6 sticky top-24 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#1A1F28]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Dossier Identité &amp; Sécurité
                </span>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white m-0 mt-0.5">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {selectedUser.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white p-1"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Account Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D]">
                <div className="text-[10px] text-[#94A3B8]">Total Dépensé</div>
                <div className="text-base font-extrabold font-mono text-[#0F172A] dark:text-white mt-0.5">
                  {userSpend.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D]">
                <div className="text-[10px] text-[#94A3B8]">Réservations</div>
                <div className="text-base font-extrabold font-mono text-[#0F172A] dark:text-white mt-0.5">
                  {userBookings.length} dossier{userBookings.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Travel History Links */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Historique de Voyage
              </div>
              {userBookings.length === 0 ? (
                <div className="text-xs text-[#94A3B8] italic">Aucune réservation passée.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-lg border border-[#F1F3F5] dark:border-[#1E232D] flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-bold text-[#0F172A] dark:text-white">
                        {b.bookingReference}
                      </span>
                      <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
                        {Number(b.amount).toFixed(2)} MAD
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
