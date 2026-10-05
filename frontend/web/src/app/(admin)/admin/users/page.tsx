'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminUserSummary } from '@/types/admin.types';
import { useAuth } from '@/features/auth/useAuth';
import {
  useAdminUsers,
  useAdminBookings,
  useUnlockUserMutation,
  useUpdateUserRolesMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
} from '@/hooks/queries/useAdminQueries';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { EntityAvatar } from '@/components/admin/EntityAvatar';
import { exportToCsv } from '@/lib/admin-csv';

const AVAILABLE_ROLES = [
  { role: 'ROLE_USER', label: 'Client / Voyageur', desc: 'Accès standard aux réservations & paiements' },
  { role: 'ROLE_ADMIN', label: 'Super Administrateur', desc: 'Contrôle complet de la plateforme et gouvernance' },
  { role: 'ROLE_SUPPORT', label: 'Support Client', desc: 'Gestion des réclamations, annulations et déverrouillage' },
  { role: 'ROLE_CONTENT_MANAGER', label: 'Gestionnaire Éditorial', desc: 'Modération des avis et gestion des destinations' },
];

export default function AdminUsersPage() {
  const { isAdmin, user: currentAdmin } = useAuth();
  const { data: users = [], isLoading, refetch, isRefetching } = useAdminUsers();
  const { data: allBookings = [] } = useAdminBookings({ limit: 500 });

  const unlockUserMutation = useUnlockUserMutation();
  const updateUserRolesMutation = useUpdateUserRolesMutation();
  const suspendUserMutation = useSuspendUserMutation();
  const reactivateUserMutation = useReactivateUserMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<AdminUserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [adminRoleConfirmed, setAdminRoleConfirmed] = useState(false);

  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (roleFilter !== 'ALL' && !u.roles.includes(roleFilter)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleUnlock = async (userId: string) => {
    try {
      const res = await unlockUserMutation.mutateAsync(userId);
      showNotification(res.message || 'Compte déverrouillé avec succès.');
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors du déverrouillage.', 'error');
    }
  };

  const handleOpenRoleModal = (u: AdminUserSummary) => {
    setRoleModalUser(u);
    setSelectedRoles([...u.roles]);
    setAdminRoleConfirmed(u.roles.includes('ROLE_ADMIN'));
  };

  const handleToggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSaveRoles = async () => {
    if (!roleModalUser) return;
    const isAddingAdmin = selectedRoles.includes('ROLE_ADMIN') && !roleModalUser.roles.includes('ROLE_ADMIN');
    if (isAddingAdmin && !adminRoleConfirmed) {
      showNotification('Veuillez confirmer l\'élévation au rôle Super Administrateur.', 'error');
      return;
    }
    try {
      await updateUserRolesMutation.mutateAsync({ userId: roleModalUser.id, roles: selectedRoles });
      showNotification(`Rôles mis à jour pour ${roleModalUser.email}`);
      setRoleModalUser(null);
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de la mise à jour des rôles.', 'error');
    }
  };

  const handleOpenSuspendModal = (u: AdminUserSummary) => {
    setSuspendModalUser(u);
    setSuspendReason('Non-respect des conditions d\'utilisation / Activité suspecte');
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    try {
      await suspendUserMutation.mutateAsync({
        userId: suspendModalUser.id,
        reason: suspendReason.trim(),
      });
      showNotification(`Compte ${suspendModalUser.email} suspendu avec succès.`);
      setSuspendModalUser(null);
      if (selectedUser?.id === suspendModalUser.id) {
        setSelectedUser(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Échec de la suspension du compte.', 'error');
    }
  };

  const handleReactivate = async (u: AdminUserSummary) => {
    try {
      await reactivateUserMutation.mutateAsync(u.id);
      showNotification(`Compte ${u.email} réactivé avec succès.`);
      if (selectedUser?.id === u.id) {
        setSelectedUser(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Échec de la réactivation du compte.', 'error');
    }
  };

  const handleExportCsv = () => {
    const rows = filteredUsers.map((u) => {
      const userB = allBookings.filter((b) => b.userId === u.id);
      const spend = userB.reduce((sum, b) => sum + (b.amount || 0), 0);
      return {
        Id: u.id,
        Email: u.email,
        FirstName: u.firstName,
        LastName: u.lastName,
        Status: u.status,
        Roles: u.roles.join('; '),
        BookingsCount: userB.length,
        TotalSpendMAD: spend.toFixed(2),
        FailedLogins: u.failedLoginAttempts,
        CreatedAt: u.createdAt,
      };
    });
    exportToCsv('utilisateurs_yuding', rows);
  };

  const userBookings = selectedUser ? allBookings.filter((b) => b.userId === selectedUser.id) : [];
  const totalSpend = userBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'UTILISATEUR (IDENTITÉ)',
      render: (u: AdminUserSummary) => {
        const fullName = `${u.firstName} ${u.lastName}`.trim() || 'Utilisateur';
        return (
          <div className="flex items-center gap-2.5 py-1">
            <EntityAvatar name={fullName} email={u.email} size="sm" />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                {fullName}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {u.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'roles',
      header: 'PRIVILÈGES RBAC',
      render: (u: AdminUserSummary) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <AdminBadge
              key={r}
              variant={r === 'ROLE_ADMIN' ? 'accent' : r === 'ROLE_SUPPORT' ? 'info' : 'neutral'}
              size="sm"
              dot={false}
            >
              {r.replace('ROLE_', '')}
            </AdminBadge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'STATUT DU COMPTE',
      render: (u: AdminUserSummary) => {
        const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
        const isSuspended = u.status === 'SUSPENDED';
        return (
          <div className="flex items-center gap-1.5">
            <AdminBadge
              variant={isSuspended || isLocked ? 'danger' : u.status === 'ACTIVE' ? 'success' : 'neutral'}
              size="sm"
            >
              {isSuspended ? 'SUSPENDU' : isLocked ? 'VERROUILLÉ' : u.status}
            </AdminBadge>
            {u.isEmailVerified && (
              <span title="Email vérifié" className="text-emerald-500 text-[10px]">
                <i className="fas fa-check-circle" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'activity',
      header: 'ACTIVITÉ & DÉPENSES',
      render: (u: AdminUserSummary) => {
        const uB = allBookings.filter((b) => b.userId === u.id);
        const spend = uB.reduce((sum, b) => sum + (b.amount || 0), 0);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold admin-mono-tabular text-slate-900 dark:text-slate-100">
              {uB.length} réservation(s)
            </span>
            <span className="text-[10px] admin-mono-tabular text-slate-400 dark:text-slate-500">
              {spend > 0 ? `${spend.toFixed(2)} MAD dépensés` : 'Aucun achat'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'INSCRIPTION',
      render: (u: AdminUserSummary) => (
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {new Date(u.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'ACTIONS DE CONTRÔLE',
      align: 'right' as const,
      render: (u: AdminUserSummary) => {
        const isSelf = currentAdmin?.email === u.email;
        const isLocked = u.failedLoginAttempts > 0 || (u.lockedUntil && new Date(u.lockedUntil) > new Date());
        const isSuspended = u.status === 'SUSPENDED';

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {isLocked && (
              <button
                type="button"
                onClick={() => handleUnlock(u.id)}
                disabled={unlockUserMutation.isPending}
                className="text-xs font-bold py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 transition-colors shadow-2xs"
                title="Déverrouiller le compte"
              >
                <i className="fas fa-unlock text-[10px] mr-1" />
                <span>Débloquer</span>
              </button>
            )}

            {isSuspended ? (
              <button
                type="button"
                onClick={() => handleReactivate(u)}
                disabled={reactivateUserMutation.isPending}
                className="text-xs font-semibold py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
                title="Réactiver le compte utilisateur"
              >
                <i className="fas fa-check-circle text-[10px] mr-1" />
                <span>Réactiver</span>
              </button>
            ) : (
              !isSelf && (
                <button
                  type="button"
                  onClick={() => handleOpenSuspendModal(u)}
                  className="text-xs font-medium py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/40 transition-colors"
                  title="Suspendre l'accès utilisateur"
                >
                  <i className="fas fa-ban text-[10px] mr-1" />
                  <span>Suspendre</span>
                </button>
              )
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenRoleModal(u)}
                className="text-xs font-medium py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
                title="Gérer les rôles RBAC"
              >
                <i className="fas fa-user-shield text-[10px] mr-1" />
                <span>Rôles</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedUser(u)}
              className="text-xs font-semibold py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
              title="Inspecter le profil client"
            >
              <i className="fas fa-eye text-[10px]" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Utilisateurs &amp; Gouvernance RBAC
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administration autoritaire des comptes identité, rôles, statuts de sécurité et déverrouillage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredUsers.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <i className="fas fa-file-csv text-[11px]" />
            <span>Exporter CSV ({filteredUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
          >
            <i className={`fas fa-sync text-[11px] ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <i className={feedback.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par nom, email, identifiant autoritaire..."
        filters={[
          {
            key: 'status',
            label: 'Statut',
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            },
            options: [
              { value: 'ALL', label: 'Tous les statuts' },
              { value: 'ACTIVE', label: 'Actifs (ACTIVE)' },
              { value: 'SUSPENDED', label: 'Suspendus (SUSPENDED)' },
              { value: 'LOCKED', label: 'Verrouillés (LOCKED)' },
            ],
          },
          {
            key: 'role',
            label: 'Rôle RBAC',
            value: roleFilter,
            onChange: (v) => {
              setRoleFilter(v);
              setCurrentPage(1);
            },
            options: [
              { value: 'ALL', label: 'Tous les rôles' },
              { value: 'ROLE_USER', label: 'ROLE_USER (Voyageur)' },
              { value: 'ROLE_ADMIN', label: 'ROLE_ADMIN (Super Admin)' },
              { value: 'ROLE_SUPPORT', label: 'ROLE_SUPPORT' },
              { value: 'ROLE_CONTENT_MANAGER', label: 'ROLE_CONTENT_MANAGER' },
            ],
          },
        ]}
      />

      {/* Users Table */}
      <AdminTable
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        onRowClick={(u) => setSelectedUser(u)}
        emptyMessage="Aucun utilisateur ne correspond aux filtres appliqués."
        footer={
          totalItems > 0 ? (
            <AdminPagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          ) : null
        }
      />

      {/* User Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ''}
        subtitle={selectedUser?.email || 'Fiche utilisateur autoritaire'}
        badge={
          selectedUser && (
            <AdminBadge
              variant={selectedUser.status === 'ACTIVE' ? 'success' : 'danger'}
              size="sm"
            >
              {selectedUser.status}
            </AdminBadge>
          )
        }
        rawJson={selectedUser}
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Header User Card */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <EntityAvatar
                  name={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  email={selectedUser.email}
                  size="lg"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    {selectedUser.email}
                  </p>
                  <div className="text-[10px] admin-mono-tabular text-slate-400 dark:text-slate-500 mt-1">
                    ID autoritaire : {selectedUser.id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Dépenses Cumulées</span>
                  <span className="font-bold admin-mono-tabular text-emerald-600 dark:text-emerald-400">
                    {totalSpend.toFixed(2)} MAD
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Réservations Totales</span>
                  <span className="font-bold admin-mono-tabular text-slate-800 dark:text-slate-200">
                    {userBookings.length} dossier(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Bookings associated with user */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Dossiers Voyage Associés ({userBookings.length})
                </span>
                <Link
                  href={`/admin/bookings?search=${encodeURIComponent(selectedUser.id)}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline no-underline"
                >
                  Filtrer dans Réservations →
                </Link>
              </div>

              {userBookings.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 m-0">Aucune réservation passée par ce compte.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto admin-custom-scrollbar">
                  {userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold admin-mono-tabular text-slate-900 dark:text-slate-100">
                          {b.bookingReference}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {b.productType} • {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <span className="font-bold admin-mono-tabular text-slate-800 dark:text-slate-200">
                        {b.amount ? `${b.amount.toFixed(2)} MAD` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setRoleModalUser(null)}
          />
          <div className="relative z-10 w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                <i className="fas fa-user-shield text-base" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 m-0">
                  Gouvernance des Rôles RBAC
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  {roleModalUser.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {AVAILABLE_ROLES.map(({ role, label, desc }) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <div
                    key={role}
                    onClick={() => handleToggleRole(role)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{role}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6 m-0">
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {selectedRoles.includes('ROLE_ADMIN') && !roleModalUser.roles.includes('ROLE_ADMIN') && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20 text-xs space-y-1">
                <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <i className="fas fa-exclamation-triangle" />
                  <span>Élévation de Privilège Critique</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 m-0">
                  Ce rôle permet de modifier les permissions d&apos;autrui et d&apos;exécuter des actions destructives.
                </p>
                <label className="flex items-center gap-2 mt-2 pt-1 border-t border-rose-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminRoleConfirmed}
                    onChange={(e) => setAdminRoleConfirmed(e.target.checked)}
                    className="w-3.5 h-3.5 text-rose-600"
                  />
                  <span className="font-semibold text-[11px] text-rose-800 dark:text-rose-200">
                    Je confirme octroyer les privilèges Super Administrateur à ce compte.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="text-xs py-2 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={updateUserRolesMutation.isPending}
                className="text-xs py-2 px-4 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {updateUserRolesMutation.isPending ? 'Enregistrement...' : 'Enregistrer les Privilèges'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Suspension Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setSuspendModalUser(null)}
          />
          <div className="relative z-10 w-full max-w-md p-6 rounded-2xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-950/60 text-rose-600 shrink-0">
                <i className="fas fa-ban text-base" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400 m-0">
                  Suspendre le Compte
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  {suspendModalUser.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 m-0">
              La suspension révoquera immédiatement les sessions actives et bloquera toute tentative de connexion ou réservation.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Motif réglementaire (Journal d&apos;Audit)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Précisez le motif..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="text-xs py-2 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspendUserMutation.isPending}
                className="text-xs py-2 px-4 rounded-lg font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {suspendUserMutation.isPending ? 'Suspension...' : 'Confirmer la Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
