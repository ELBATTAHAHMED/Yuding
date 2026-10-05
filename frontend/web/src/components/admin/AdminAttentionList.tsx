'use client';

import React from 'react';
import Link from 'next/link';
import { EntityAvatar } from './EntityAvatar';

export interface AttentionItem {
  id: string;
  type: 'REFUND_FAILED' | 'PAYMENT_FAILED' | 'ACCOUNT_LOCKED' | 'REVIEW_PENDING' | 'PROVIDER_LATENCY';
  title: string;
  subtitle: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
  actionHref: string;
  actionLabel: string;
  entityName?: string;
}

interface AdminAttentionListProps {
  items: AttentionItem[];
  isLoading?: boolean;
}

export function AdminAttentionList({ items, isLoading = false }: AdminAttentionListProps) {
  const getSeverityBadge = (sev: AttentionItem['severity']) => {
    switch (sev) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      case 'low':
        return 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50';
    }
  };

  const getTypeIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'REFUND_FAILED':
        return 'fas fa-undo-alt text-rose-500';
      case 'PAYMENT_FAILED':
        return 'fas fa-exclamation-triangle text-amber-500';
      case 'ACCOUNT_LOCKED':
        return 'fas fa-user-lock text-rose-500';
      case 'REVIEW_PENDING':
        return 'fas fa-star-half-alt text-amber-500';
      case 'PROVIDER_LATENCY':
        return 'fas fa-wifi text-sky-500';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Dossiers Prioritaires
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
            {items.length}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Triage direct
        </span>
      </div>

      {/* Items list */}
      <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto max-h-[260px] admin-custom-scrollbar py-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chargement des alertes opérationnelles...
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <i className="fas fa-check text-xs" />
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Aucun incident bloquant
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mt-0.5">
              Les remboursements, paiements et sessions utilisateurs sont sous contrôle opérationnel.
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-lg transition-colors group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <i className={`${getTypeIcon(item.type)} text-xs`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity === 'high' ? 'Critique' : item.severity === 'medium' ? 'Attention' : 'Info'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.subtitle}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 admin-mono-tabular mt-0.5">
                    {item.timestamp}
                  </div>
                </div>
              </div>

              <Link
                href={item.actionHref}
                className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 transition-all border border-slate-200/80 dark:border-slate-700/80 no-underline"
              >
                {item.actionLabel}
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 dark:text-slate-500">
          Résolution SLA &lt; 15 min recommandée
        </span>
        <Link
          href="/admin/refunds"
          className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline no-underline"
        >
          Voir tous les incidents →
        </Link>
      </div>
    </div>
  );
}
