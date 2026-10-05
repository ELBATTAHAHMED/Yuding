'use client';

import React from 'react';

export type StatCardVariant = 'cool' | 'warm' | 'dark' | 'incident' | 'default';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  variant?: StatCardVariant;
  isLoading?: boolean;
  onClick?: () => void;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export function AdminStatCard({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
  isLoading = false,
  onClick,
  trend,
}: AdminStatCardProps) {
  // Variant styles mapped cleanly to tokens and semantic roles inspired by Reference Dashboard
  const getVariantStyles = (v: StatCardVariant) => {
    switch (v) {
      case 'cool':
        return {
          cardClass: 'bg-[#EAF3FF] dark:bg-[#0C1E38] border-[#CCE2FF] dark:border-blue-900/40 shadow-xs',
          iconWrapper: 'bg-blue-600 text-white shadow-xs',
          labelColor: 'text-blue-900 dark:text-blue-200 font-semibold',
          valueColor: 'text-slate-900 dark:text-white',
          badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 font-bold',
          sparklineColor: '#2563EB',
        };
      case 'warm':
        return {
          cardClass: 'bg-[#FFF0E5] dark:bg-[#261A10] border-[#FFDBC2] dark:border-amber-900/40 shadow-xs',
          iconWrapper: 'bg-amber-600 text-white shadow-xs',
          labelColor: 'text-amber-900 dark:text-amber-200 font-semibold',
          valueColor: 'text-slate-900 dark:text-white',
          badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 font-bold',
          sparklineColor: '#D97706',
        };
      case 'dark':
        return {
          cardClass: 'bg-[#121826] text-white border-[#1E2738] shadow-md dark:bg-[#070B12] dark:border-zinc-800',
          iconWrapper: 'bg-slate-800 text-emerald-400',
          labelColor: 'text-slate-300 font-medium',
          valueColor: 'text-white',
          badgeColor: 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 font-bold',
          sparklineColor: '#00D4AA',
        };
      case 'incident':
        return {
          cardClass: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 shadow-xs',
          iconWrapper: 'bg-rose-600 text-white shadow-xs',
          labelColor: 'text-rose-900 dark:text-rose-200 font-semibold',
          valueColor: 'text-slate-900 dark:text-rose-100',
          badgeColor: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50 font-bold',
          sparklineColor: '#E11D48',
        };
      default:
        return {
          cardClass: 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 shadow-xs',
          iconWrapper: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300',
          labelColor: 'text-slate-500 dark:text-zinc-400 font-medium',
          valueColor: 'text-slate-900 dark:text-zinc-100',
          badgeColor: 'text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 font-medium',
          sparklineColor: '#64748B',
        };
    }
  };

  const styles = getVariantStyles(variant);

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 ${styles.cardClass} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styles.iconWrapper}`}>
            <i className={`${icon} text-xs`} />
          </div>
          <span className={`text-xs truncate ${styles.labelColor}`}>
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3.5">
        {isLoading ? (
          <div className="h-8 w-28 rounded-lg bg-slate-200/70 dark:bg-zinc-800 animate-pulse my-0.5" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-2xl font-black admin-mono-tabular tracking-tight leading-none ${styles.valueColor}`}>
              {value}
            </span>
            {trend && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles.badgeColor} shrink-0`}>
                {trend.value}
              </span>
            )}
          </div>
        )}

        {subtext && (
          <div className="text-[11px] font-medium mt-2 text-slate-500 dark:text-zinc-400 truncate opacity-85">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
