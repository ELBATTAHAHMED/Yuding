'use client';

import React from 'react';
import { useAdminAuditLogs } from '@/hooks/queries/useAdminQueries';

export default function AdminAuditPage() {
  const { data: logs = [], isLoading, refetch } = useAdminAuditLogs(50);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Journal d&apos;Audit des Actions Administratives
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Registre immuable en écriture seule des interventions de sécurité et d&apos;administration (audit.admin_actions)
          </p>
        </div>

        <button
          onClick={() => refetch()}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(0, 212, 170, 0.1)',
            border: '1px solid #00D4AA',
            color: '#00D4AA',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <i className="fas fa-sync" />
          Actualiser
        </button>
      </div>

      {/* Audit Table */}
      <div
        style={{
          background: 'var(--bg-secondary, #111827)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem' }}>ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>ACTION</th>
                <th style={{ padding: '0.85rem 1rem' }}>SERVICE CIBLE</th>
                <th style={{ padding: '0.85rem 1rem' }}>ENTITÉ</th>
                <th style={{ padding: '0.85rem 1rem' }}>ADMINISTRATEUR (UUID)</th>
                <th style={{ padding: '0.85rem 1rem' }}>MOTIF DE L&apos;ACTION</th>
                <th style={{ padding: '0.85rem 1rem' }}>HORODATAGE</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Chargement du journal d&apos;audit...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Aucune action administrative enregistrée pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>
                      #{log.id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(0, 212, 170, 0.15)',
                          color: '#00D4AA',
                        }}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                      {log.targetService}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {log.targetEntityType} ({log.targetEntityId.slice(0, 8)}...)
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {log.adminUserId ? log.adminUserId.slice(0, 8) + '...' : 'SYSTEM'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {log.reason || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
