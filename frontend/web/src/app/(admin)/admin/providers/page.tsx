'use client';

import React from 'react';
import Link from 'next/link';
import { useProviderHealth } from '@/hooks/queries/useAdminQueries';
import { AdminBadge } from '@/components/admin/AdminBadge';

export default function AdminProvidersPage() {
  const { data: providers = [], isLoading, refetch, isFetching } = useProviderHealth();

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Supervision Plateforme
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Cartographie d&apos;architecture des services Yuding et état de l&apos;observabilité opérationnelle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="admin-btn bg-white dark:bg-[#14171E] border border-[#E2E8F0] dark:border-[#1E2430] text-[#0F172A] dark:text-white"
          >
            <i className={`fas fa-sync text-xs ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 2. Truthful Telemetry Disclaimer Banner (Section 6 & 41) */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fas fa-info-circle text-sm" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-[#0F172A] dark:text-white">
            Télémétrie temps réel non disponible
          </div>
          <p className="text-[#64748B] dark:text-[#94A3B8] m-0 leading-relaxed">
            La console ne simule aucune métrique artificielle. Les sondes Spring Boot Actuator directes et les flux Eureka/Prometheus ne sont pas exposés sur l&apos;API Gateway publique. Le tableau ci-dessous recense le périmètre architectural vérifié et les composants du cluster Yuding V2.
          </p>
        </div>
      </div>

      {/* 3. Architecture & Service Mesh Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Point d&apos;Entrée Unique
          </div>
          <div className="text-sm font-bold text-[#0F172A] dark:text-white mt-1">
            API Gateway (:8888)
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Filtrage autoritaire, strip headers X-User-*
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Persistance Relationnelle
          </div>
          <div className="text-sm font-bold text-[#0F172A] dark:text-white mt-1">
            PostgreSQL 16 &amp; pgvector
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            8 schémas logiques isolés (Flyway V1–V12)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Sécurité Asymétrique
          </div>
          <div className="text-sm font-bold text-[#0F172A] dark:text-white mt-1">
            RS256 JWT &amp; Refresh Tokens
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            Rotation sécurisée des cookies HttpOnly
          </div>
        </div>
      </div>

      {/* 4. Architectural Registry Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto admin-custom-scrollbar">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Composant Système</th>
                <th>Domaine</th>
                <th>Rôle Architectural</th>
                <th className="text-center">Statut Observabilité</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="py-4">
                      <div className="h-4 bg-[#E2E8F0] dark:bg-[#1E2430] rounded animate-pulse w-3/4 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#94A3B8] text-xs">
                    Aucun composant système interrogé.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.name} className="hover:bg-[#F8F9FA] dark:hover:bg-[#1A1F28] transition-colors">
                    <td>
                      <div className="font-bold text-xs text-[#0F172A] dark:text-white">
                        {p.name}
                      </div>
                    </td>
                    <td>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E2430] text-[#475569] dark:text-[#94A3B8] uppercase">
                        {p.type}
                      </span>
                    </td>
                    <td className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {p.details || 'Composant de la topologie Yuding V2'}
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>CONFIGURÉ</span>
                      </span>
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
