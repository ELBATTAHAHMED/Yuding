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
  // Variant styles mapped cleanly to tokens and semantic roles
  const getVariantStyles = (v: StatCardVariant) => {
    switch (v) {
      case 'cool':
        return {
          cardClass: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40',
          iconWrapper: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
          labelColor: 'text-emerald-800 dark:text-emerald-300',
          valueColor: 'text-emerald-950 dark:text-emerald-100',
          badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/30',
        };
      case 'warm':
        return {
          cardClass: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40',
          iconWrapper: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
          labelColor: 'text-amber-800 dark:text-amber-300',
          valueColor: 'text-amber-950 dark:text-amber-100',
          badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/30',
        };
      case 'dark':
        return {
          cardClass: 'bg-slate-900 text-white border-slate-800 shadow-md dark:bg-slate-950 dark:border-slate-800',
          iconWrapper: 'bg-slate-800 text-emerald-400',
          labelColor: 'text-slate-300',
          valueColor: 'text-white',
          badgeColor: 'text-emerald-300 bg-emerald-950/80 border border-emerald-800/50',
        };
      case 'incident':
        return {
          cardClass: 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-900/50',
          iconWrapper: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
          labelColor: 'text-rose-800 dark:text-rose-300',
          valueColor: 'text-rose-950 dark:text-rose-100',
          badgeColor: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40',
        };
      default:
        return {
          cardClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs',
          iconWrapper: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
          labelColor: 'text-slate-500 dark:text-slate-400',
          valueColor: 'text-slate-900 dark:text-slate-100',
          badgeColor: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
        };
    }
  };

  const styles = getVariantStyles(variant);

  return (
    <div
      onClick={onClick}
      className={`admin-concentric-card p-4 rounded-xl border flex flex-col justify-between transition-all duration-150 ${styles.cardClass} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold tracking-wider uppercase truncate ${styles.labelColor}`}>
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${styles.iconWrapper}`}>
          <i className={`${icon} text-xs`} />
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-8 w-28 rounded bg-slate-200/70 dark:bg-slate-800 animate-pulse my-0.5" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black admin-mono-tabular tracking-tight leading-none ${styles.valueColor}`}>
              {value}
            </span>
            {trend && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles.badgeColor}`}>
                {trend.value}
              </span>
            )}
          </div>
        )}

        {subtext && (
          <div className="text-[11px] font-medium mt-1.5 text-slate-500 dark:text-slate-400 truncate">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
