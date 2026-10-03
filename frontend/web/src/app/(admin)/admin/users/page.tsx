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
import { exportToCsv } from '@/lib/admin-csv';

const AVAILABLE_ROLES = [
  { role: 'ROLE_USER', label: 'Client / Voyageur', desc: 'Accès standard aux réservations & paiements' },
  { role: 'ROLE_ADMIN', label: 'Super Administrateur', desc: 'Contrôle complet de la plateforme et gouvernance' },
  { role: 'ROLE_SUPPORT', label: 'Support Client', desc: 'Gestion des réclamations, annulations et assistance' },
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
      const userBookings = allBookings.filter((b) => b.userId === u.id);
      const spend = userBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      return {
        Id: u.id,
        Email: u.email,
        FirstName: u.firstName,
        LastName: u.lastName,
        Status: u.status,
        Roles: u.roles.join('; '),
        BookingsCount: userBookings.length,
        TotalSpendMAD: spend.toFixed(2),
        FailedLogins: u.failedLoginAttempts,
        CreatedAt: u.createdAt,
      };
    });
    exportToCsv('utilisateurs_yuding', rows);
  };

  // Inspect User Data
  const userBookings = selectedUser ? allBookings.filter((b) => b.userId === selectedUser.id) : [];
  const totalSpend = userBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'UTILISATEUR (IDENTITÉ)',
      render: (u: AdminUserSummary) => (
        <div className="flex items-center gap-2.5 py-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs"
            style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
              color: '#0B0F19',
            }}
          >
            {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs truncate" style={{ color: 'var(--admin-text-primary)' }}>
              {u.firstName} {u.lastName}
            </div>
            <div className="text-[0.6875rem] truncate" style={{ color: 'var(--admin-text-muted)' }}>
              {u.email}
            </div>
          </div>
        </div>
      ),
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
              <span title="Email vérifié" className="text-emerald-500 text-[0.7rem]">
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
            <span className="text-xs font-bold admin-mono-tabular" style={{ color: 'var(--admin-text-primary)' }}>
              {uB.length} réservation(s)
            </span>
            <span className="text-[0.65rem] admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
              {spend > 0 ? `${spend.toFixed(2)} MAD dépensés` : 'Aucun achat finalisé'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'INSCRIPTION',
      render: (u: AdminUserSummary) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
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
                className="admin-btn text-[0.6875rem] py-1 px-2 rounded"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#F59E0B',
                }}
                title="Déverrouiller le compte"
              >
                <i className="fas fa-unlock text-[0.65rem]" />
                <span>Débloquer</span>
              </button>
            )}

            {isSuspended ? (
              <button
                type="button"
                onClick={() => handleReactivate(u)}
                disabled={reactivateUserMutation.isPending}
                className="admin-btn text-[0.6875rem] py-1 px-2 rounded font-semibold"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#10B981',
                }}
                title="Réactiver le compte utilisateur"
              >
                <i className="fas fa-check-circle text-[0.65rem]" />
                <span>Réactiver</span>
              </button>
            ) : (
              !isSelf && (
                <button
                  type="button"
                  onClick={() => handleOpenSuspendModal(u)}
                  className="admin-btn text-[0.6875rem] py-1 px-2 rounded"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                  }}
                  title="Suspendre l'accès utilisateur"
                >
                  <i className="fas fa-ban text-[0.65rem]" />
                  <span>Suspendre</span>
                </button>
              )
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenRoleModal(u)}
                className="admin-btn text-[0.6875rem] py-1 px-2 rounded"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text-secondary)',
                }}
                title="Gérer les rôles RBAC"
              >
                <i className="fas fa-user-shield text-[0.65rem]" />
                <span>Rôles</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedUser(u)}
              className="admin-btn text-[0.6875rem] py-1 px-2 rounded"
              style={{
                backgroundColor: 'var(--admin-accent-subtle)',
                border: '1px solid var(--admin-accent-border)',
                color: 'var(--admin-accent)',
              }}
              title="Inspecter le profil client"
            >
              <i className="fas fa-eye text-[0.65rem]" />
            </button>
          </div>
        );
      },
    },
  ];

  const filterSelects = [
    {
      key: 'status',
      label: 'Statut',
      value: statusFilter,
      onChange: (val: string) => {
        setStatusFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Tous les statuts', value: 'ALL' },
        { label: 'Actifs (ACTIVE)', value: 'ACTIVE' },
        { label: 'Suspendus (SUSPENDED)', value: 'SUSPENDED' },
        { label: 'Verrouillés (LOCKED)', value: 'LOCKED' },
      ],
    },
    {
      key: 'role',
      label: 'Rôle RBAC',
      value: roleFilter,
      onChange: (val: string) => {
        setRoleFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Tous les rôles', value: 'ALL' },
        { label: 'ROLE_ADMIN', value: 'ROLE_ADMIN' },
        { label: 'ROLE_SUPPORT', value: 'ROLE_SUPPORT' },
        { label: 'ROLE_CONTENT_MANAGER', value: 'ROLE_CONTENT_MANAGER' },
        { label: 'ROLE_USER', value: 'ROLE_USER' },
      ],
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== 'ALL' || roleFilter !== 'ALL');

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Gouvernance des Utilisateurs &amp; RBAC
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Contrôle d&apos;accès autoritaire, historique des dépenses, verrouillage de sécurité et gestion des rôles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredUsers.length === 0}
            className="admin-btn text-xs py-2 px-3.5 rounded-lg border font-semibold"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <i className="fas fa-file-csv text-xs mr-1 text-emerald-500" />
            <span>Exporter CSV ({filteredUsers.length})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in"
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--admin-accent-subtle)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: feedback.type === 'success' ? 'var(--admin-accent-border)' : 'rgba(239, 68, 68, 0.3)',
            color: feedback.type === 'success' ? 'var(--admin-accent)' : '#EF4444',
          }}
        >
          <i className={feedback.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Rechercher par nom, email ou UUID utilisateur..."
        filters={filterSelects}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={users.length}
        filteredCount={filteredUsers.length}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Table with Pagination */}
      <AdminTable
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        onRowClick={(u) => setSelectedUser(u)}
        emptyMessage="Aucun utilisateur trouvé"
        emptySubtext="Modifiez vos critères de recherche ou réinitialisez les filtres."
        footer={
          filteredUsers.length > 0 ? (
            <AdminPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          ) : null
        }
      />

      {/* User Inspection Profile Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ''}
        subtitle={selectedUser ? `Fiche Client • ${selectedUser.email}` : ''}
        badge={
          selectedUser && (
            <AdminBadge variant={selectedUser.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
              {selectedUser.status}
            </AdminBadge>
          )
        }
        rawJson={selectedUser}
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Identity Card */}
            <div
              className="p-4 rounded-xl border flex items-center gap-4"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-xs"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                  color: '#0B0F19',
                }}
              >
                {selectedUser.firstName ? selectedUser.firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </div>
                <div className="text-xs admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
                  {selectedUser.email}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {selectedUser.roles.map((r) => (
                    <span
                      key={r}
                      className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{
                        backgroundColor: 'var(--admin-surface-muted)',
                        color: 'var(--admin-text-secondary)',
                        border: '1px solid var(--admin-border)',
                      }}
                    >
                      {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Lifetime Spend & Booking Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                }}
              >
                <span className="block text-[0.65rem] uppercase font-bold tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Dépenses Cumulées
                </span>
                <span className="font-black text-base admin-mono-tabular mt-1 block" style={{ color: 'var(--admin-accent)' }}>
                  {totalSpend.toFixed(2)} MAD
                </span>
                <span className="text-[0.625rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Sur toutes ses réservations
                </span>
              </div>

              <div
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                }}
              >
                <span className="block text-[0.65rem] uppercase font-bold tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Dossiers Voyage
                </span>
                <span className="font-black text-base admin-mono-tabular mt-1 block" style={{ color: 'var(--admin-text-primary)' }}>
                  {userBookings.length}
                </span>
                <span className="text-[0.625rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  {userBookings.filter((b) => b.status === 'CONFIRMED').length} confirmées
                </span>
              </div>
            </div>

            {/* Associated Bookings History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                  Historique des Réservations Client
                </span>
                <Link
                  href={`/admin/bookings?search=${encodeURIComponent(selectedUser.id)}`}
                  className="text-xs font-bold no-underline hover:underline"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Ouvrir dans Réservations →
                </Link>
              </div>

              {userBookings.length === 0 ? (
                <div
                  className="p-4 rounded-lg border text-center text-xs"
                  style={{
                    backgroundColor: 'var(--admin-surface-muted)',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text-muted)',
                  }}
                >
                  Aucune réservation enregistrée pour ce client.
                </div>
              ) : (
                <div className="space-y-2">
                  {userBookings.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                      style={{
                        backgroundColor: 'var(--admin-surface-muted)',
                        borderColor: 'var(--admin-border)',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold admin-mono-tabular" style={{ color: 'var(--admin-accent)' }}>
                          {b.bookingReference}
                        </div>
                        <div className="text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                          {b.productType} • {new Date(b.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold admin-mono-tabular" style={{ color: 'var(--admin-text-primary)' }}>
                          {b.amount != null ? `${Number(b.amount).toFixed(2)} ${b.currency || 'MAD'}` : '—'}
                        </span>
                        <AdminBadge variant={b.status === 'CONFIRMED' ? 'success' : 'neutral'} size="sm">
                          {b.status}
                        </AdminBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Profile */}
            <div
              className="p-4 rounded-xl border space-y-2.5 text-xs"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <span className="font-bold uppercase tracking-wider block" style={{ color: 'var(--admin-text-muted)' }}>
                Sécurité & Vérification
              </span>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--admin-text-secondary)' }}>Échecs de mot de passe :</span>
                <span className="admin-mono-tabular font-bold" style={{ color: selectedUser.failedLoginAttempts > 0 ? '#EF4444' : 'var(--admin-text-primary)' }}>
                  {selectedUser.failedLoginAttempts} tentative(s)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--admin-text-secondary)' }}>Vérification Email :</span>
                <span className="font-bold" style={{ color: selectedUser.isEmailVerified ? '#10B981' : '#F59E0B' }}>
                  {selectedUser.isEmailVerified ? 'Vérifié' : 'En attente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--admin-text-secondary)' }}>UUID Autoritaire :</span>
                <span className="admin-mono-tabular text-[0.65rem] truncate max-w-[200px]" style={{ color: 'var(--admin-text-muted)' }}>
                  {selectedUser.id}
                </span>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Suspend Account Confirmation Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setSuspendModalUser(null)}
          />
          <div
            className="relative z-10 w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: 'var(--admin-text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-red-500"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <i className="fas fa-exclamation-triangle text-base" />
              </div>
              <div>
                <h3 className="text-base font-black m-0" style={{ color: '#EF4444' }}>
                  Suspendre le Compte Utilisateur
                </h3>
                <p className="text-xs m-0 truncate" style={{ color: 'var(--admin-text-muted)' }}>
                  {suspendModalUser.email}
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
              La suspension révoquera immédiatement toute session active et bloquera toute tentative de connexion ultérieure (`LOGIN_BLOCKED_SUSPENDED`). Cette action sera inscrite au Journal d&apos;Audit.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Motif obligatoire de la suspension :
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border focus:outline-none"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-text-primary)',
                }}
                placeholder="Ex : Activité frauduleuse suspectée, impayé..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="admin-btn text-xs py-2 px-3 rounded"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--admin-text-muted)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspendUserMutation.isPending || !suspendReason.trim()}
                className="admin-btn text-xs py-2 px-4 rounded font-bold"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                }}
              >
                {suspendUserMutation.isPending ? 'Suspension en cours...' : 'Confirmer la Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal with Admin Confirmation Check */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setRoleModalUser(null)}
          />
          <div
            className="relative z-10 w-full max-w-md p-6 rounded-xl border shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-primary)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--admin-border)' }}>
              <div>
                <h3 className="text-base font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
                  Modifier les Privilèges RBAC
                </h3>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--admin-text-muted)' }}>
                  {roleModalUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="w-7 h-7 rounded flex items-center justify-center opacity-60 hover:opacity-100"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            <div className="space-y-2.5">
              {AVAILABLE_ROLES.map(({ role, label, desc }) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <label
                    key={role}
                    onClick={() => handleToggleRole(role)}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none"
                    style={{
                      backgroundColor: isSelected ? 'var(--admin-accent-subtle)' : 'var(--admin-surface-muted)',
                      borderColor: isSelected ? 'var(--admin-accent-border)' : 'var(--admin-border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                        {label}
                      </div>
                      <div className="text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                        {desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedRoles.includes('ROLE_ADMIN') && !roleModalUser.roles.includes('ROLE_ADMIN') && (
              <div
                className="p-3 rounded-lg border space-y-2 text-xs"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <div className="flex items-center gap-2 font-bold text-amber-500">
                  <i className="fas fa-shield-alt" />
                  <span>Avertissement de Sécurité : Super Administrateur</span>
                </div>
                <p className="text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Ce rôle confère un accès illimité à toutes les données, flux financiers et configurations de la plateforme.
                </p>
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-[0.6875rem]">
                  <input
                    type="checkbox"
                    checked={adminRoleConfirmed}
                    onChange={(e) => setAdminRoleConfirmed(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Je confirme autoriser ces prérogatives critiques.</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="admin-btn text-xs py-2 px-3 rounded"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--admin-text-muted)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={updateUserRolesMutation.isPending}
                className="admin-btn text-xs py-2 px-4 rounded font-bold"
                style={{
                  backgroundColor: 'var(--admin-accent)',
                  color: '#0B0F19',
                }}
              >
                {updateUserRolesMutation.isPending ? 'Enregistrement...' : 'Enregistrer les rôles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
