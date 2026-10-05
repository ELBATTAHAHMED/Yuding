'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { ADMIN_NAV_ITEMS } from './AdminSidebar';

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
}

export function AdminHeader({ onToggleMobileMenu }: AdminHeaderProps) {
  const pathname = usePathname();

  // Find current nav item label & category
  const currentItem = ADMIN_NAV_ITEMS.find((item) => item.href === pathname) || {
    label: pathname.replace('/admin/', '').replace('/admin', "Vue d'ensemble"),
    category: 'OPÉRATIONS',
  };

  return (
    <header
      className="h-16 px-6 lg:px-8 sticky top-0 z-20 flex items-center justify-between border-b backdrop-blur-md shrink-0"
      style={{
        backgroundColor: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      {/* Left: Mobile trigger & Refined Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center border text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            style={{
              borderColor: 'var(--admin-border)',
              backgroundColor: 'var(--admin-surface-muted)',
            }}
            aria-label="Menu de navigation"
          >
            <i className="fas fa-bars text-xs" />
          </button>
        )}

        {/* Breadcrumb Context */}
        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium no-underline transition-colors"
          >
            Yuding Ops
          </Link>
          <span className="text-slate-300 dark:text-slate-600 select-none">/</span>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold hidden sm:inline">
            {currentItem.category}
          </span>
          <span className="text-slate-300 dark:text-slate-600 select-none hidden sm:inline">/</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {currentItem.label}
          </span>
        </nav>
      </div>

      {/* Center: Quiet Sandbox / Architecture Pill */}
      <div className="hidden lg:flex items-center gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PRODUCTION-READY (SANDBOX)</span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 admin-mono-tabular">
          Gateway :8888 · Redis 7 · PG16
        </span>
      </div>

      {/* Right: Quick Notification Bell, Heartbeat & Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Notification Bell matching Reference Dashboard */}
        <button
          type="button"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          title="Notifications opérationnelles"
          aria-label="Notifications"
        >
          <i className="far fa-bell text-xs" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <div className="flex items-center">
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
