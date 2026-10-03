'use client';

import React, { useState } from 'react';
import { AdminUserSummary } from '@/types/admin.types';
import { useAuth } from '@/features/auth/useAuth';
import {
  useAdminUsers,
  useUnlockUserMutation,
  useUpdateUserRolesMutation,
} from '@/hooks/queries/useAdminQueries';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge } from '@/components/admin/AdminBadge';

const AVAILABLE_ROLES = [
  { role: 'ROLE_USER', label: 'Client / Utilisateur', desc: 'Accès standard aux réservations' },
  { role: 'ROLE_ADMIN', label: 'Super Administrateur', desc: 'Contrôle complet de la plateforme' },
  { role: 'ROLE_SUPPORT', label: 'Support Opérationnel', desc: 'Gestion des réclamations & remboursements' },
  { role: 'ROLE_CONTENT_MANAGER', label: 'Gestionnaire de Contenu', desc: 'Modération des avis & destinations' },
];

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const { data: users = [], isLoading, refetch, isRefetching } = useAdminUsers();
  const unlockUserMutation = useUnlockUserMutation();
  const updateUserRolesMutation = useUpdateUserRolesMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term)
    );
  });

  const handleUnlock = async (userId: string) => {
    try {
      const res = await unlockUserMutation.mutateAsync(userId);
      setFeedback(res.message || 'Compte déverrouillé avec succès.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Erreur lors du déverrouillage.');
    }
  };

  const handleOpenRoleModal = (u: AdminUserSummary) => {
    setSelectedUser(u);
    setSelectedRoles([...u.roles]);
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
    if (!selectedUser) return;
    try {
      await updateUserRolesMutation.mutateAsync({ userId: selectedUser.id, roles: selectedRoles });
      setFeedback(`Rôles mis à jour pour ${selectedUser.email}`);
      setSelectedUser(null);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Erreur lors de la mise à jour des rôles.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'UTILISATEUR',
      render: (u: AdminUserSummary) => (
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
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
      render: (u: AdminUserSummary) => (
        <AdminBadge
          variant={u.status === 'ACTIVE' ? 'success' : 'danger'}
          size="sm"
        >
          {u.status}
        </AdminBadge>
      ),
    },
    {
      key: 'failedLoginAttempts',
      header: 'ÉCHECS LOGIN',
      align: 'center' as const,
      render: (u: AdminUserSummary) => (
        <span
          className={`admin-mono-tabular font-bold text-xs ${
            u.failedLoginAttempts > 0 ? 'text-red-500 font-extrabold' : ''
          }`}
          style={{ color: u.failedLoginAttempts > 0 ? '#EF4444' : 'var(--admin-text-muted)' }}
        >
          {u.failedLoginAttempts}
        </span>
      ),
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
      header: 'ACTIONS',
      align: 'right' as const,
      render: (u: AdminUserSummary) => (
        <div className="flex items-center justify-end gap-1.5">
          {u.failedLoginAttempts > 0 && (
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
              <span>Déverrouiller</span>
            </button>
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
            >
              <i className="fas fa-user-shield text-[0.65rem]" />
              <span>Rôles</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Gouvernance des Utilisateurs &amp; RBAC
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Gestion des autorisations d&apos;accès, privilèges administrateurs et déverrouillage de sécurité
        </p>
      </div>

      {feedback && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            borderColor: 'var(--admin-accent-border)',
            color: 'var(--admin-accent)',
          }}
        >
          <i className="fas fa-check-circle" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par nom, email ou UUID utilisateur..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={users.length}
        filteredCount={filteredUsers.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Main Table */}
      <AdminTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="Aucun utilisateur trouvé"
      />

      {/* Role Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedUser(null)}
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
                  {selectedUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
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

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
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
