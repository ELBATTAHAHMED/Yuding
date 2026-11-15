'use client';

import React from 'react';
import { AdminStats } from '@/types/admin.types';

interface AdminOverviewChartProps {
  stats?: AdminStats;
  isLoading?: boolean;
}

export function AdminOverviewChart({ stats, isLoading = false }: AdminOverviewChartProps) {
  const byProduct = stats?.bookingsByProduct || {
    HOTEL: 0,
    FLIGHT: 0,
    ACTIVITY: 0,
    TRANSFER: 0,
    TRAIN: 0,
  };

  const byStatus = stats?.bookingsByStatus || {
    CONFIRMED: 0,
    PENDING: 0,
    CANCELLED: 0,
  };

  const totalDossiers = stats?.totalReservations || 0;
  const totalRevenue = stats?.totalRevenue || 0;

  const productVerticals = [
    { key: 'HOTEL', label: 'Hôtels & Hébergements', icon: 'fas fa-hotel', color: '#10B981', count: byProduct['HOTEL'] || 0 },
    { key: 'FLIGHT', label: 'Vols & Billetterie', icon: 'fas fa-plane-departure', color: '#0EA5E9', count: byProduct['FLIGHT'] || 0 },
    { key: 'ACTIVITY', label: 'Activités & Excursions', icon: 'fas fa-map-marked-alt', color: '#F59E0B', count: byProduct['ACTIVITY'] || 0 },
    { key: 'TRANSFER', label: 'Transferts & VTC', icon: 'fas fa-car', color: '#8B5CF6', count: byProduct['TRANSFER'] || 0 },
    { key: 'TRAIN', label: 'Trains ONCF Al Boraq', icon: 'fas fa-train', color: '#EC4899', count: byProduct['TRAIN'] || 0 },
  ];

  const maxProductCount = Math.max(...productVerticals.map((v) => v.count), 1);

  return (
    <div className="bg-white dark:bg-[#14171E] border border-slate-200/90 dark:border-[#1E2430] rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E2430]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Répartition Opérationnelle des Prestations
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              Données de Production
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-zinc-100 admin-mono-tabular mt-1">
            {isLoading ? '—' : `${totalDossiers} dossiers de voyage enregistrés`}
          </div>
        </div>

        {/* Status mini badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold admin-mono-tabular">
            {byStatus['CONFIRMED'] || 0} Confirmés
          </div>
          <div className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold admin-mono-tabular">
            {byStatus['PENDING'] || 0} En attente
          </div>
          <div className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-semibold admin-mono-tabular">
            {byStatus['CANCELLED'] || 0} Annulés
          </div>
        </div>
      </div>

      {/* Progress Bars for Vertical Breakdown */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-xs text-slate-400 animate-pulse">
          Synchronisation de la distribution catalogue...
        </div>
      ) : (
        <div className="space-y-4">
          {productVerticals.map((v) => {
            const percent = totalDossiers > 0 ? Math.round((v.count / totalDossiers) * 100) : 0;
            const barWidth = totalDossiers > 0 ? `${(v.count / maxProductCount) * 100}%` : '0%';

            return (
              <div key={v.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <i className={`${v.icon} text-xs w-4 text-center`} style={{ color: v.color }} />
                    <span>{v.label}</span>
                  </div>
                  <div className="flex items-center gap-3 admin-mono-tabular">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {v.count} dossier{v.count > 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 w-10 text-right">
                      {percent}%
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#1E2430] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: barWidth,
                      backgroundColor: v.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer consolidated insight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-4 border-t border-slate-100 dark:border-[#1E2430] text-slate-500 dark:text-zinc-400 gap-2">
        <div className="flex items-center gap-2">
          <i className="fas fa-lock text-[#00D4AA]" />
          <span>PostgreSQL autoritaire : schéma <code>booking</code> &amp; <code>travel</code></span>
        </div>
        <div className="font-semibold text-slate-700 dark:text-slate-300 admin-mono-tabular">
          Volume brut encaissé : {totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
        </div>
      </div>
    </div>
  );
}
