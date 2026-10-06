'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useAdminUsers,
  useAdminBookings,
  useUnlockUserMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
  useUpdateUserRolesMutation,
} from '@/hooks/queries/useAdminQueries';
import { useAuth } from '@/features/auth/useAuth';
import { AdminUserSummary } from '@/types/admin.types';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { EntityAvatar } from '@/components/admin/EntityAvatar';

export default function AdminUsersPage() {
  const { user: currentOperator, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);

  // Safety confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'UNLOCK' | 'SUSPEND' | 'REACTIVATE' | 'ROLES' | 'DEACTIVATE';
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: users = [], isLoading, refetch, isFetching } = useAdminUsers();
  const { data: allBookings = [] } = useAdminBookings({ limit: 500 });

  const unlockMutation = useUnlockUserMutation();
  const suspendMutation = useSuspendUserMutation();
  const reactivateMutation = useReactivateUserMutation();
  const updateRolesMutation = useUpdateUserRolesMutation();

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
  const isSelf = selectedUser?.id === currentOperator?.id;

  const handleSelectUser = (u: AdminUserSummary | null) => {
    setSelectedUser(u);
    setActionError(null);
    if (u) {
      setSelectedRoles([...u.roles]);
    }
  };

  const handleExecuteUnlock = async (userId: string) => {
    setActionError(null);
    try {
      await unlockMutation.mutateAsync(userId);
      await refetch();
      setConfirmDialog(null);
    } catch (err: any) {
      setActionError(err.message || 'Impossible de déverrouiller ce compte.');
    }
  };

  const handleExecuteSuspend = async (userId: string) => {
    setActionError(null);
    try {
      await suspendMutation.mutateAsync({ userId, reason: 'Suspension administrative demandée via la console' });
      await refetch();
      setConfirmDialog(null);
    } catch (err: any) {
      setActionError(err.message || 'Impossible de suspendre ce compte.');
    }
  };

  const handleExecuteReactivate = async (userId: string) => {
    setActionError(null);
    try {
      await reactivateMutation.mutateAsync(userId);
      await refetch();
      setConfirmDialog(null);
    } catch (err: any) {
      setActionError(err.message || 'Impossible de réactiver ce compte.');
    }
  };

  const handleExecuteUpdateRoles = async (userId: string) => {
    setActionError(null);
    try {
      await updateRolesMutation.mutateAsync({ userId, roles: selectedRoles });
      await refetch();
      setConfirmDialog(null);
    } catch (err: any) {
      setActionError(err.message || 'Impossible de modifier les rôles de ce compte.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Comptes &amp; Sécurité des Voyageurs
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Registre des voyageurs et opérateurs autorisés, gouvernance RBAC et déverrouillage de sécurité.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#14171E] border border-[#E2E8F0] dark:border-[#1E2430] text-[#0F172A] dark:text-white admin-mono-tabular">
            {users.length} comptes enregistrés
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par nom, prénom ou email..."
        totalCount={users.length}
        filteredCount={filtered.length}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        hasActiveFilters={roleFilter !== 'ALL' || Boolean(searchTerm)}
        onResetFilters={() => {
          setSearchTerm('');
          setRoleFilter('ALL');
        }}
        filters={[
          {
            key: 'role',
            label: 'Rôle RBAC',
            value: roleFilter,
            options: [
              { label: 'Tous les rôles', value: 'ALL' },
              { label: 'Voyageur (ROLE_USER)', value: 'ROLE_USER' },
              { label: 'Administrateur (ROLE_ADMIN)', value: 'ROLE_ADMIN' },
              { label: 'Support (ROLE_SUPPORT)', value: 'ROLE_SUPPORT' },
            ],
            onChange: setRoleFilter,
          },
        ]}
      />

      {/* 3. Split Workspace: User Directory Table & Right Contextual Profile Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* User Directory Table */}
        <div className={`${selectedUser ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto admin-custom-scrollbar">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôles RBAC</th>
                    <th>Date d&apos;inscription</th>
                    <th className="text-center">Statut</th>
                    <th className="text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-4">
                          <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94A3B8] text-xs">
                        Aucun utilisateur ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => {
                      const fullName = `${u.firstName} ${u.lastName}`.trim() || 'Client';
                      const isSelected = selectedUser?.id === u.id;
                      const isLocked = u.status === 'LOCKED' || (u.lockedUntil && new Date(u.lockedUntil) > new Date());
                      const isSuspended = u.status === 'SUSPENDED';

                      return (
                        <tr
                          key={u.id}
                          onClick={() => handleSelectUser(isSelected ? null : u)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#F1F5F9] dark:bg-[#1E2430]'
                              : 'hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28]'
                          }`}
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <EntityAvatar
                                name={fullName}
                                email={u.email}
                                userId={u.id}
                                hasProfilePhoto={u.hasProfilePhoto}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                                  {fullName}
                                </div>
                                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <span
                                  key={r}
                                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#475569] dark:text-[#94A3B8]"
                                >
                                  {r.replace('ROLE_', '')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="text-center whitespace-nowrap">
                            <AdminBadge
                              variant={isLocked ? 'danger' : isSuspended ? 'warning' : 'success'}
                              size="sm"
                            >
                              {isLocked ? 'VERROUILLÉ' : isSuspended ? 'SUSPENDU' : 'ACTIF'}
                            </AdminBadge>
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <button
                              type="button"
                              className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                            >
                              Gérer →
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
        </div>

        {/* Right: Real Profile & Activity Workspace */}
        {selectedUser && (
          <div className="lg:col-span-5 admin-card p-6 space-y-6 sticky top-24 shadow-sm animate-fade-in">
            {/* Profile Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="flex items-center gap-3.5">
                <EntityAvatar
                  name={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  email={selectedUser.email}
                  userId={selectedUser.id}
                  hasProfilePhoto={selectedUser.hasProfilePhoto}
                  size="lg"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white m-0 truncate">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                    {selectedUser.email}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <AdminBadge
                      variant={
                        selectedUser.status === 'LOCKED' || (selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date())
                          ? 'danger'
                          : selectedUser.status === 'SUSPENDED'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {selectedUser.status === 'LOCKED' || (selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date())
                        ? 'Compte Verrouillé'
                        : selectedUser.status === 'SUSPENDED'
                        ? 'Compte Suspendu'
                        : 'Compte Actif'}
                    </AdminBadge>
                    {isSelf && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                        Votre session
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectUser(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E2430]"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Error banner if action failed */}
            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <i className="fas fa-exclamation-triangle shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Traveler Spend & Booking Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Dépenses Cumulées
                </div>
                <div className="text-base font-black font-mono text-[#0F172A] dark:text-white mt-1">
                  {userSpend.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Réservations
                </div>
                <div className="text-base font-black font-mono text-[#0F172A] dark:text-white mt-1">
                  {userBookings.length} dossiers
                </div>
              </div>
            </div>

            {/* Account Governance Controls */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Actions de Sécurité &amp; Accès
              </span>

              <div className="flex flex-wrap gap-2">
                {/* Unlock Account button */}
                {(selectedUser.status === 'LOCKED' ||
                  selectedUser.failedLoginAttempts > 0 ||
                  (selectedUser.lockedUntil && new Date(selectedUser.lockedUntil) > new Date())) && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'UNLOCK',
                        title: 'Déverrouiller le compte voyageur',
                        description: `Confirmez-vous la réinitialisation des ${selectedUser.failedLoginAttempts} tentatives infructueuses et la levée immédiate du verrouillage pour ${selectedUser.email} ?`,
                        action: () => handleExecuteUnlock(selectedUser.id),
                      })
                    }
                    className="admin-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3"
                  >
                    <i className="fas fa-unlock text-xs" />
                    <span>Déverrouiller le compte</span>
                  </button>
                )}

                {/* Suspend Account button */}
                {selectedUser.status === 'ACTIVE' && !isSelf && isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'SUSPEND',
                        title: 'Suspendre le compte',
                        description: `Le voyageur ${selectedUser.email} ne pourra plus se connecter ni effectuer de réservation jusqu'à réactivation.`,
                        action: () => handleExecuteSuspend(selectedUser.id),
                      })
                    }
                    className="admin-btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3"
                  >
                    <i className="fas fa-ban text-xs" />
                    <span>Suspendre</span>
                  </button>
                )}

                {/* Reactivate Account button */}
                {selectedUser.status === 'SUSPENDED' && isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        type: 'REACTIVATE',
                        title: 'Réactiver le compte',
                        description: `Le compte ${selectedUser.email} sera réactivé avec ses accès habituels.`,
                        action: () => handleExecuteReactivate(selectedUser.id),
                      })
                    }
                    className="admin-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3"
                  >
                    <i className="fas fa-check-circle text-xs" />
                    <span>Réactiver</span>
                  </button>
                )}
              </div>
            </div>

            {/* Role Management (RBAC) */}
            {isAdmin && (
              <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2430]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Gestion des Rôles (RBAC)
                </span>

                <div className="space-y-2">
                  {['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER'].map((role) => {
                    const isChecked = selectedRoles.includes(role);
                    const isSelfAdmin = isSelf && role === 'ROLE_ADMIN';
                    return (
                      <label
                        key={role}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          isChecked
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                            : 'border-[#E2E8F0] dark:border-[#2D3748]'
                        } ${isSelfAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {role.replace('ROLE_', '')}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSelfAdmin}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoles([...selectedRoles, role]);
                            } else {
                              setSelectedRoles(selectedRoles.filter((r) => r !== role));
                            }
                          }}
                          className="rounded border-[#CBD5E1] text-[#00D4AA] focus:ring-[#00D4AA]"
                        />
                      </label>
                    );
                  })}

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={
                        JSON.stringify(selectedRoles.sort()) === JSON.stringify(selectedUser.roles.sort())
                      }
                      onClick={() =>
                        setConfirmDialog({
                          type: 'ROLES',
                          title: 'Confirmer la modification des rôles',
                          description: `Mettre à jour les privilèges pour ${selectedUser.email} vers : ${selectedRoles
                            .map((r) => r.replace('ROLE_', ''))
                            .join(', ')} ?`,
                          action: () => handleExecuteUpdateRoles(selectedUser.id),
                        })
                      }
                      className="admin-btn bg-[#0F172A] text-white hover:bg-slate-800 dark:bg-white dark:text-[#0F172A] dark:hover:bg-slate-100 text-xs w-full py-2 disabled:opacity-50"
                    >
                      Enregistrer les rôles
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Travel History Stream */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Historique des Voyages ({userBookings.length})
                </span>
                {userBookings.length > 0 && (
                  <Link
                    href={`/admin/bookings?search=${encodeURIComponent(selectedUser.id)}`}
                    className="text-xs font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline no-underline"
                  >
                    Voir tous →
                  </Link>
                )}
              </div>

              {userBookings.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] text-center text-xs text-[#94A3B8]">
                  Aucun dossier de voyage associé à cet utilisateur.
                </div>
              ) : (
                <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430] overflow-hidden">
                  {userBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-[#0F172A] dark:text-white">
                          {b.bookingReference}
                        </div>
                        <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                          {b.productType} • {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#0F172A] dark:text-white">
                          {b.amount ? `${Number(b.amount).toFixed(2)} MAD` : '—'}
                        </div>
                        <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit & Deep Link Context */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E2430]">
              <div className="flex items-center justify-between">
                <Link
                  href={`/admin/audit?search=${encodeURIComponent(selectedUser.id)}`}
                  className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:underline no-underline"
                >
                  <i className="fas fa-history mr-1.5" />
                  Consulter les événements d&apos;audit liés →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#14171E] rounded-2xl border border-[#E2E8F0] dark:border-[#1E2430] max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-[#0F172A] dark:text-white font-bold text-base">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                <i className="fas fa-shield-alt text-base" />
              </div>
              <span>{confirmDialog.title}</span>
            </div>

            <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed m-0">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#1E2430]">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmLoading}
                className="admin-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white text-xs py-2 px-4"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={async () => {
                  setConfirmLoading(true);
                  try {
                    await confirmDialog.action();
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
                className="admin-btn bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:text-[#0F172A] dark:hover:bg-slate-100 text-white text-xs py-2 px-4"
              >
                {confirmLoading ? 'Exécution...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
