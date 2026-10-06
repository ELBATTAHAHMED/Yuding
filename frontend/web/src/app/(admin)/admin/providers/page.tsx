'use client';

import React from 'react';
import { useProviderHealth } from '@/hooks/queries/useAdminQueries';

export default function AdminProvidersPage() {
  const { data: providers = [], isLoading } = useProviderHealth();

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Santé des Services &amp; Observabilité
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Matrice unifiée de télémétrie des microservices Spring Boot, bases de données et adaptateurs partenaires.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#047857] dark:text-[#34D399] bg-[#ECFDF5] dark:bg-[#064E3B]/30 px-3 py-1.5 rounded-full border border-[#A7F3D0] dark:border-[#059669]/30">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Écosystème Opérationnel</span>
        </div>
      </div>

      {/* 2. Unified Telemetry Registry Table */}
      <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116] text-[#64748B] dark:text-[#94A3B8] font-bold text-[10px] tracking-wider uppercase">
              <th className="py-3 px-4">Composant Système</th>
              <th className="py-3 px-4">Catégorie</th>
              <th className="py-3 px-4">Port / Endpoint</th>
              <th className="py-3 px-4">Dernier Battement</th>
              <th className="py-3 px-4 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                  Interrogation de la santé système...
                </td>
              </tr>
            ) : providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                  Aucun composant enregistré.
                </td>
              </tr>
            ) : (
              providers.map((p) => {
                const isUp = p.status === 'UP';
                return (
                  <tr key={p.name} className="hover:bg-[#FAFAFB] dark:hover:bg-[#161B22] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172A] dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                        {p.details || 'Service Spring Boot V2'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E232D] text-[#475569] dark:text-[#94A3B8]">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {p.port ? `Port :${p.port}` : 'Passerelle Cloud'}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">
                      {new Date(p.lastChecked).toLocaleTimeString('fr-FR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          isUp
                            ? 'bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#7F1D1D]/30 dark:text-[#F87171]'
                        }`}
                      >
                        {isUp ? 'OPÉRATIONNEL' : 'DÉGRADÉ'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
