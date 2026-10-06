'use client';

import React, { useState } from 'react';
import { useAdminAuditLogs } from '@/hooks/queries/useAdminQueries';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminAuditAction } from '@/types/admin.types';

export default function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminAuditAction | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useAdminAuditLogs(100);

  const filtered = logs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.actionType.toLowerCase().includes(term) ||
      l.targetService.toLowerCase().includes(term) ||
      l.targetEntityType.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Journal d&apos;Audit &amp; Imputabilité
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Piste d&apos;audit immuable (append-only) de toutes les actions d&apos;exploitation et de sécurité.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#14171E] border border-[#E2E8F0] dark:border-[#1E2430] text-[#0F172A] dark:text-white admin-mono-tabular">
            {logs.length} événements tracés
          </div>
        </div>
      </div>

      {/* 2. Compact Filter */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par action, service (identity, travel...), motif..."
        totalCount={logs.length}
        filteredCount={filtered.length}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        hasActiveFilters={Boolean(searchTerm)}
        onResetFilters={() => setSearchTerm('')}
      />

      {/* 3. Audit Trail Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto admin-custom-scrollbar">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Action Réalisée</th>
                <th>Service Cible</th>
                <th>Entité Concernée</th>
                <th>Opérateur UUID</th>
                <th>Motif Déclaré</th>
                <th className="text-right">Horodatage</th>
                <th className="text-right">Payload</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4">
                      <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8] text-xs">
                    Aucun enregistrement d&apos;audit ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className="cursor-pointer hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors"
                  >
                    <td className="font-mono font-bold text-xs text-[#0D9488] dark:text-[#00D4AA] whitespace-nowrap">
                      {l.actionType}
                    </td>
                    <td className="font-mono text-xs text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                      {l.targetService}
                    </td>
                    <td className="text-xs text-[#0F172A] dark:text-white font-semibold whitespace-nowrap">
                      {l.targetEntityType}
                    </td>
                    <td className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                      {l.adminUserId.slice(0, 8)}...
                    </td>
                    <td className="text-xs text-[#475569] dark:text-[#94A3B8] max-w-xs truncate">
                      {l.reason || 'Action administrative certifiée'}
                    </td>
                    <td className="text-right font-mono text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                      >
                        Voir →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Inspection Drawer */}
      <AdminDrawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.actionType || "Détail de l'Audit"}
        subtitle={`Service : ${selectedLog?.targetService} • Entité : ${selectedLog?.targetEntityType}`}
        rawJson={selectedLog}
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                Motif Enregistré
              </span>
              <p className="text-sm text-[#0F172A] dark:text-white font-medium mt-1 m-0">
                {selectedLog.reason || 'Action exécutée via la console d&apos;administration Yuding.'}
              </p>
            </div>

            <div className="admin-card divide-y divide-[#F1F3F5] dark:divide-[#1E2430]">
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">ID Événement</span>
                <span className="font-mono text-[#0F172A] dark:text-white">{selectedLog.id}</span>
              </div>
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Opérateur Responsable</span>
                <span className="font-mono text-[#0F172A] dark:text-white">{selectedLog.adminUserId}</span>
              </div>
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Cible Touchée</span>
                <span className="font-mono text-[#0F172A] dark:text-white">{selectedLog.targetEntityId}</span>
              </div>
              <div className="p-3.5 flex justify-between text-xs">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Date &amp; Heure UTC</span>
                <span className="text-[#0F172A] dark:text-white font-medium">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
