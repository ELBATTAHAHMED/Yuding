'use client';

import React from 'react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  variant?: 'primary' | 'accent' | 'warning' | 'info' | 'danger';
  isLoading?: boolean;
}

export function AdminStatCard({
  label,
  value,
  subtext,
  icon,
  variant = 'accent',
  isLoading = false,
}: AdminStatCardProps) {
  const iconColors: Record<string, string> = {
    primary: 'var(--admin-accent, #00D4AA)',
    accent: 'var(--admin-accent, #00D4AA)',
    warning: '#F59E0B',
    info: '#38BDF8',
    danger: '#F87171',
  };

  return (
    <div
      className="admin-card p-4 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[0.7rem] font-bold tracking-wider uppercase"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            color: iconColors[variant] || 'var(--admin-accent)',
          }}
        >
          <i className={`${icon} text-xs`} />
        </div>
      </div>

      <div className="mt-2.5">
        {isLoading ? (
          <div className="h-7 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse my-1" />
        ) : (
          <div
            className="text-2xl font-extrabold admin-mono-tabular tracking-tight"
            style={{ color: 'var(--admin-text-primary)' }}
          >
            {value}
          </div>
        )}

        {subtext && (
          <div
            className="text-[0.75rem] font-medium mt-1 truncate"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
