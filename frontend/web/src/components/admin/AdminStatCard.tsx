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
  const getVariantStyles = (v: StatCardVariant) => {
    switch (v) {
      case 'cool':
        return {
          cardClass: 'bg-[#EAF3FF] dark:bg-[#111A26] border-[#CCE2FF] dark:border-sky-900/40',
          iconWrapper: 'bg-blue-600 text-white',
          labelColor: 'text-blue-900 dark:text-sky-200',
          valueColor: 'text-[#0F172A] dark:text-white',
          badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60',
        };
      case 'warm':
        return {
          cardClass: 'bg-[#FFF0E5] dark:bg-[#221A12] border-[#FFDBC2] dark:border-amber-900/40',
          iconWrapper: 'bg-amber-600 text-white',
          labelColor: 'text-amber-900 dark:text-amber-200',
          valueColor: 'text-[#0F172A] dark:text-white',
          badgeColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60',
        };
      case 'dark':
        return {
          cardClass: 'bg-[#121826] text-white border-[#1E2738] dark:bg-[#07080A] dark:border-zinc-800',
          iconWrapper: 'bg-slate-800 text-[#00D4AA]',
          labelColor: 'text-slate-300',
          valueColor: 'text-white',
          badgeColor: 'text-[#00D4AA] bg-emerald-950/80 border border-emerald-800/60',
        };
      case 'incident':
        return {
          cardClass: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50',
          iconWrapper: 'bg-rose-600 text-white',
          labelColor: 'text-rose-900 dark:text-rose-200',
          valueColor: 'text-[#0F172A] dark:text-rose-100',
          badgeColor: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50',
        };
      default:
        return {
          cardClass: 'bg-white dark:bg-[#14171E] border-[#E2E8F0] dark:border-[#1E2430]',
          iconWrapper: 'bg-[#F1F5F9] dark:bg-[#1E2430] text-[#0F172A] dark:text-white',
          labelColor: 'text-[#64748B] dark:text-[#94A3B8]',
          valueColor: 'text-[#0F172A] dark:text-white',
          badgeColor: 'text-[#64748B] dark:text-[#94A3B8] bg-[#F1F5F9] dark:bg-[#1E2430]',
        };
    }
  };

  const styles = getVariantStyles(variant);

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border flex flex-col justify-between transition-all duration-150 ${styles.cardClass} ${
        onClick ? 'cursor-pointer hover:border-[#CBD5E1] dark:hover:border-zinc-700' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styles.iconWrapper}`}>
            <i className={`${icon} text-xs`} />
          </div>
          <span className={`text-xs font-semibold uppercase tracking-wider truncate ${styles.labelColor}`}>
            {label}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="h-8 w-28 rounded-lg bg-[#E2E8F0] dark:bg-[#1E2430] animate-pulse my-0.5" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-2xl font-extrabold admin-mono-tabular tracking-tight leading-none ${styles.valueColor}`}>
              {value}
            </span>
            {trend && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${styles.badgeColor} shrink-0`}>
                {trend.value}
              </span>
            )}
          </div>
        )}

        {subtext && (
          <div className="text-[11px] font-medium mt-2 text-[#64748B] dark:text-[#94A3B8] truncate">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
