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
        <span className="admin-mono-tabular text-xs text-slate-400 dark:text-slate-500">
          #{l.id}
        </span>
      ),
    },
    {
      key: 'actionType',
      header: 'TYPE D’ACTION',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular font-bold text-xs text-emerald-600 dark:text-emerald-400">
          {l.actionType}
        </span>
      ),
    },
    {
      key: 'targetService',
      header: 'SERVICE CIBLE',
      render: (l: AdminAuditAction) => (
        <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {l.targetService}
        </span>
      ),
    },
    {
      key: 'targetEntityType',
      header: 'ENTITÉ',
      render: (l: AdminAuditAction) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {l.targetEntityType}
        </span>
      ),
    },
    {
      key: 'adminUserId',
      header: 'OPÉRATEUR',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular text-xs text-slate-400 dark:text-slate-500">
          {l.adminUserId.substring(0, 8)}...
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'MOTIF DE L’INTERVENTION',
      render: (l: AdminAuditAction) => (
        <span className="text-xs truncate max-w-[200px] inline-block text-slate-600 dark:text-slate-400">
          {l.reason || 'Action administrative standard'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'HORODATAGE',
      render: (l: AdminAuditAction) => (
        <span className="admin-mono-tabular text-xs text-slate-500 dark:text-slate-400">
          {new Date(l.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
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
          className="text-xs font-semibold py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
        >
          <i className="fas fa-file-code text-[10px] mr-1" />
          <span>Payload</span>
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Journal d&apos;Audit des Actions Administratives
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registre immuable en écriture seule des interventions de sécurité et d&apos;administration (audit.admin_actions)
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
        >
          <i className={`fas fa-sync text-[11px] ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Actualiser ({logs.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par type d'action, service cible, opérateur..."
        filters={[]}
      />

      {/* Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        keyExtractor={(l) => String(l.id)}
        isLoading={isLoading}
        onRowClick={(l) => setSelectedLog(l)}
        emptyMessage="Aucun événement d'audit enregistré."
      />

      {/* Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Audit #${selectedLog.id} • ${selectedLog.actionType}` : ''}
        subtitle="Détails du payload immuable"
        rawJson={selectedLog}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-2xs">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Service Cible :</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedLog.targetService}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Type d&apos;Entité :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.targetEntityType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Opérateur UUID :</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.adminUserId}</span>
              </div>
              {selectedLog.reason && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="block text-slate-400 dark:text-slate-500 mb-0.5">Motif déclaré :</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 m-0">{selectedLog.reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
