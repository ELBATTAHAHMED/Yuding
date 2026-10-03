'use client';

import React, { useState } from 'react';
import { useAdminAuditLogs } from '@/hooks/queries/useAdminQueries';
import { AdminAuditAction } from '@/types/admin.types';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminDrawer } from '@/components/admin/AdminDrawer';

export default function AdminAuditPage() {
  const { data: logs = [], isLoading, refetch, isRefetching } = useAdminAuditLogs(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminAuditAction | null>(null);

  const filtered = logs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.actionType.toLowerCase().includes(term) ||
      l.targetService.toLowerCase().includes(term) ||
      l.targetEntityType.toLowerCase().includes(term) ||
      l.adminUserId.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: '60px',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          #{l.id}
        </span>
      ),
    },
    {
      key: 'actionType',
      header: 'TYPE D’ACTION',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
          {l.actionType}
        </span>
      ),
    },
    {
      key: 'targetService',
      header: 'SERVICE CIBLE',
      render: (l: AdminAuditAction) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-mono font-medium"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          {l.targetService}
        </span>
      ),
    },
    {
      key: 'targetEntityType',
      header: 'ENTITÉ',
      render: (l: AdminAuditAction) => (
        <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
          {l.targetEntityType}
        </span>
      ),
    },
    {
      key: 'adminUserId',
      header: 'OPÉRATEUR (UUID)',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {l.adminUserId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIF DE L’INTERVENTION',
      render: (l: AdminAuditAction) => (
        <span className="text-xs truncate max-w-[200px] inline-block" style={{ color: 'var(--admin-text-secondary)' }}>
          {l.reason || 'Action administrative standard'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'HORODATAGE',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(l.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'MÉTADONNÉES',
      align: 'right' as const,
      render: (l: AdminAuditAction) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(l);
          }}
          className="admin-btn text-[0.7rem] py-1 px-2.5 rounded"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-file-code text-[0.65rem]" />
          <span>Payload</span>
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Journal d&apos;Audit des Actions Administratives
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Registre immuable en écriture seule des interventions de sécurité et d&apos;administration (audit.admin_actions)
        </p>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par type d'action, service, opérateur..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={logs.length}
        filteredCount={filtered.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
        onRowClick={(l) => setSelectedLog(l)}
        emptyMessage="Aucun enregistrement d'audit trouvé"
      />

      {/* Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Audit #${selectedLog.id} — ${selectedLog.actionType}` : ''}
        subtitle="Détail de l'action administrative tracée"
        rawJson={selectedLog ? { ...selectedLog, parsedMetadata: selectedLog.metadataJson ? JSON.parse(selectedLog.metadataJson) : null } : null}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div
              className="p-4 rounded-lg border space-y-2.5"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div>
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Service Cible
                </span>
                <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                  {selectedLog.targetService}
                </span>
              </div>
              <div>
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Entité Cible
                </span>
                <span className="admin-mono-tabular font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {selectedLog.targetEntityType} ({selectedLog.targetEntityId})
                </span>
              </div>
              <div>
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Opérateur Administrateur
                </span>
                <span className="admin-mono-tabular" style={{ color: 'var(--admin-accent)' }}>
                  {selectedLog.adminUserId}
                </span>
              </div>
              <div>
                <span className="block text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  Motif Fourni
                </span>
                <span style={{ color: 'var(--admin-text-secondary)' }}>
                  {selectedLog.reason || 'Aucun motif renseigné'}
                </span>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
