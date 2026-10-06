'use client';

import React, { useState } from 'react';
import { useAdminAuditLogs } from '@/hooks/queries/useAdminQueries';

export default function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: logs = [], isLoading } = useAdminAuditLogs(100);

  const filtered = logs.filter((l) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.actionType.toLowerCase().includes(term) ||
      l.targetService.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Journal d&apos;Audit &amp; Imputabilité
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Registre immuable en écriture seule de toutes les interventions administratives et de sécurité.
          </p>
        </div>

        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par action, service..."
            className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] text-[#0F172A] dark:text-white outline-none w-64"
          />
        </div>
      </div>

      {/* 2. Audit Trail Table */}
      <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-4">Entité</th>
              <th className="py-3 px-4">Opérateur</th>
              <th className="py-3 px-4">Motif</th>
              <th className="py-3 px-4 text-right">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                  Lecture du journal d&apos;audit...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                  Aucun événement d&apos;audit trouvé.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#00D4AA]">
                    {l.actionType}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#475569] dark:text-[#94A3B8]">
                    {l.targetService}
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A] dark:text-white font-semibold">
                    {l.targetEntityType}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {l.adminUserId.slice(0, 8)}...
                  </td>
                  <td className="py-3.5 px-4 text-[#475569] dark:text-[#94A3B8] max-w-xs truncate">
                    {l.reason || 'Action administrative certifiée'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {new Date(l.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
