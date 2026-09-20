'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import { AdminUserSummary } from '@/types/admin.types';
import { useAuth } from '@/features/auth/useAuth';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Selected user for role editing
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUnlock = async (userId: string) => {
    try {
      const res = await adminService.unlockUser(userId);
      setActionFeedback(res.message || 'Compte déverrouillé avec succès.');
      loadUsers();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setActionFeedback(err.message || 'Erreur lors du déverrouillage.');
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
    setUpdating(true);
    try {
      await adminService.updateUserRoles(selectedUser.id, selectedRoles);
      setActionFeedback(`Rôles mis à jour pour ${selectedUser.email}`);
      setSelectedUser(null);
      loadUsers();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setActionFeedback(err.message || 'Erreur lors de la mise à jour des rôles.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            Gestion des Utilisateurs
          </h1>
          <p style={{ color: '#b0bec5', fontSize: '0.95rem' }}>
            Consultez les profils enregistrés, attribuez les privilèges RBAC et déverrouillez les comptes
          </p>
        </div>

        <button
          onClick={loadUsers}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(0, 212, 170, 0.1)',
            border: '1px solid #00D4AA',
            color: '#00D4AA',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-sync" style={{ marginRight: '0.4rem' }}></i>
          Actualiser
        </button>
      </div>

      {actionFeedback && (
        <div style={{ padding: '1rem', background: 'rgba(0, 212, 170, 0.15)', border: '1px solid #00D4AA', color: '#00D4AA', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
          {actionFeedback}
        </div>
      )}

      {/* Users Table */}
      <div
        style={{
          background: 'var(--bg-secondary, #1A1F2E)',
          borderRadius: '12px',
          padding: '1.75rem',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#b0bec5' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p style={{ marginTop: '1rem' }}>Chargement des utilisateurs...</p>
          </div>
        ) : users.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', color: '#b0bec5' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#90a4ae' }}>
                  <th style={{ padding: '0.85rem' }}>Utilisateur</th>
                  <th style={{ padding: '0.85rem' }}>Email</th>
                  <th style={{ padding: '0.85rem' }}>Rôles</th>
                  <th style={{ padding: '0.85rem' }}>Statut</th>
                  <th style={{ padding: '0.85rem' }}>Vérifié</th>
                  <th style={{ padding: '0.85rem' }}>Échecs</th>
                  <th style={{ padding: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.85rem', color: '#fff', fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td style={{ padding: '0.85rem', color: '#e0e0e0' }}>{u.email}</td>
                    <td style={{ padding: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {u.roles?.map((r) => (
                          <span
                            key={r}
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: r === 'ROLE_ADMIN' ? 'rgba(239, 83, 80, 0.2)' : 'rgba(0, 212, 170, 0.15)',
                              color: r === 'ROLE_ADMIN' ? '#ef5350' : '#00D4AA',
                            }}
                          >
                            {r.replace('ROLE_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: u.status === 'LOCKED' ? '#ffebee' : '#e8f5e9',
                          color: u.status === 'LOCKED' ? '#c62828' : '#2e7d32',
                        }}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem' }}>
                      {u.isEmailVerified ? (
                        <i className="fas fa-check-circle" style={{ color: '#4caf50' }}></i>
                      ) : (
                        <i className="fas fa-times-circle" style={{ color: '#ff9800' }}></i>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem' }}>{u.failedLoginAttempts}</td>
                    <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {u.status === 'LOCKED' && (
                          <button
                            onClick={() => handleUnlock(u.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              background: '#388e3c',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Déverrouiller
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              background: 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Rôles
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Aucun utilisateur trouvé.</p>
        )}
      </div>

      {/* Role Edit Modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary, #1A1F2E)',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '450px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Modifier les Rôles RBAC
            </h2>
            <p style={{ color: '#90a4ae', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Pour l&apos;utilisateur : <strong>{selectedUser.email}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER'].map((role) => (
                <label
                  key={role}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleToggleRole(role)}
                    style={{ width: '18px', height: '18px', accentColor: '#00D4AA' }}
                  />
                  <span style={{ fontWeight: 600 }}>{role}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#b0bec5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleSaveRoles}
                disabled={updating}
                style={{
                  padding: '0.65rem 1.5rem',
                  background: '#00D4AA',
                  border: 'none',
                  color: '#0A0E1A',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {updating ? <i className="fas fa-spinner fa-spin"></i> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
