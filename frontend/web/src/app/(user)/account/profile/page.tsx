'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { authService } from '@/services/auth.service';
import { ActiveSession, SecurityEvent } from '@/types/auth.types';

export default function AccountPage() {
  const { user, logout, logoutAll, reloadProfile } = useAuth();

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // General feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await authService.getActiveSessions();
      setActiveSessions(data);
    } catch {
      setActiveSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const data = await authService.getSecurityEvents();
      setSecurityEvents(data);
    } catch {
      setSecurityEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadEvents();
  }, [loadSessions, loadEvents]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authService.revokeSession(sessionId);
      setFeedback('Session révoquée avec succès.');
      loadSessions();
      loadEvents();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Erreur lors de la révocation.');
    }
  };

  const handleLogoutAll = async () => {
    if (confirm('Êtes-vous certain de vouloir déconnecter toutes vos sessions actives sur tous vos appareils ?')) {
      await logoutAll();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      setPasswordStatus({ type: 'success', message: res.message || 'Mot de passe modifié avec succès.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadEvents();
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err.message || 'Erreur lors du changement de mot de passe.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
                Espace Compte &amp; Sécurité
              </h1>
              <p style={{ color: '#666' }}>Gérez vos informations personnelles, vos appareils connectés et votre sécurité</p>
            </div>

            <button
              onClick={() => logout()}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: '1px solid #d32f2f',
                color: '#d32f2f',
                background: 'transparent',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: '0.4rem' }}></i>
              Se déconnecter
            </button>
          </div>

          {feedback && (
            <div style={{ padding: '1rem', background: '#e0f2f1', color: '#004d40', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
              {feedback}
            </div>
          )}

          {/* Profile Overview Card */}
          <div style={{ background: 'var(--card, #fff)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00796b, #004d40)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {user?.firstName} {user?.lastName}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#666', fontSize: '0.95rem' }}>
                    <i className="fas fa-envelope" style={{ marginRight: '0.4rem' }}></i>
                    {user?.email}
                  </span>

                  {user?.isEmailVerified ? (
                    <span style={{ padding: '0.2rem 0.6rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '0.25rem' }}></i>
                      Email Vérifié
                    </span>
                  ) : (
                    <span style={{ padding: '0.2rem 0.6rem', background: '#fff3e0', color: '#e65100', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.25rem' }}></i>
                      Email Non Vérifié
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: '#888', display: 'block', textAlign: 'right' }}>Rôles assignés</span>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                  {user?.roles?.map((r) => (
                    <span key={r} style={{ padding: '0.2rem 0.6rem', background: '#eceff1', color: '#37474f', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            {/* Active Sessions */}
            <div style={{ background: 'var(--card, #fff)', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  <i className="fas fa-laptop" style={{ marginRight: '0.5rem', color: '#01796F' }}></i>
                  Sessions actives ({activeSessions.length})
                </h3>

                <button
                  onClick={handleLogoutAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d32f2f',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Déconnecter tout
                </button>
              </div>

              {loadingSessions ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              ) : activeSessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeSessions.map((s) => (
                    <div
                      key={s.sessionId}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'var(--bg, #f9f9f9)',
                        border: s.isCurrent ? '1px solid #00796b' : '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {s.deviceLabel}
                          {s.isCurrent && (
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: '#00796b', color: '#fff', borderRadius: '4px' }}>
                              Session actuelle
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                          IP: {s.ipAddressMasked} • Connexion: {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s.sessionId)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            background: '#fff',
                            color: '#d32f2f',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Révoquer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#888', fontSize: '0.9rem' }}>Aucune autre session enregistrée.</p>
              )}
            </div>

            {/* Change Password Form */}
            <div style={{ background: 'var(--card, #fff)', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                <i className="fas fa-key" style={{ marginRight: '0.5rem', color: '#01796F' }}></i>
                Modifier mon mot de passe
              </h3>

              {!user?.isEmailVerified && (
                <div style={{ padding: '0.75rem', background: '#fff3e0', color: '#e65100', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <i className="fas fa-lock" style={{ marginRight: '0.4rem' }}></i>
                  La vérification d&apos;email est requise pour modifier votre mot de passe.
                </div>
              )}

              {passwordStatus && (
                <div
                  style={{
                    padding: '0.75rem',
                    background: passwordStatus.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: passwordStatus.type === 'success' ? '#2e7d32' : '#c62828',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {passwordStatus.message}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword || !user?.isEmailVerified}
                  className="btn-booking"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: !user?.isEmailVerified ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    opacity: !user?.isEmailVerified ? 0.6 : 1,
                  }}
                >
                  {isChangingPassword ? <i className="fas fa-spinner fa-spin"></i> : 'Mettre à jour le mot de passe'}
                </button>
              </form>
            </div>
          </div>

          {/* Security Events Audit Log */}
          <div style={{ background: 'var(--card, #fff)', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem', color: '#01796F' }}></i>
              Historique de sécurité récent
            </h3>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i>
              </div>
            ) : securityEvents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee', color: '#666' }}>
                      <th style={{ padding: '0.75rem' }}>Événement</th>
                      <th style={{ padding: '0.75rem' }}>Appareil / Navigateur</th>
                      <th style={{ padding: '0.75rem' }}>Adresse IP</th>
                      <th style={{ padding: '0.75rem' }}>Date &amp; Heure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#01796F' }}>
                          {ev.eventType}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#555' }}>
                          {ev.deviceLabel || 'Inconnu'}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#555', fontFamily: 'monospace' }}>
                          {ev.ipAddressMasked}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#888' }}>
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Aucun événement de sécurité consigné pour le moment.</p>
            )}
          </div>
    </div>
  );
}
