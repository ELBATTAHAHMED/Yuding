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

  // Find current nav item label
  const currentItem = ADMIN_NAV_ITEMS.find((item) => item.href === pathname) || {
    label: pathname.replace('/admin/', '').replace('/admin', 'Vue d\'ensemble'),
    category: 'CONSOLE',
  };

  return (
    <header
      className="h-16 px-6 sticky top-0 z-20 flex items-center justify-between border-b backdrop-blur-md"
      style={{
        backgroundColor: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-8 h-8 rounded-md flex items-center justify-center border"
            style={{
              borderColor: 'var(--admin-border)',
              color: 'var(--admin-text-secondary)',
            }}
          >
            <i className="fas fa-bars text-sm" />
          </button>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/admin"
            className="no-underline transition-colors hover:underline"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            Yuding OPS
          </Link>
          <span style={{ color: 'var(--admin-text-muted)' }}>/</span>
          <span style={{ color: 'var(--admin-text-primary)' }}>{currentItem.label}</span>
        </div>
      </div>

      {/* Center: System Status Indicator */}
      <div className="hidden lg:flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            color: 'var(--admin-accent)',
            border: '1px solid var(--admin-accent-border)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--admin-accent)' }}
          />
          <span>Environnement Opérationnel</span>
        </div>
        <span
          className="text-xs admin-mono-tabular font-medium"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          PG16 · Redis 7 · Gateway :8888
        </span>
      </div>

      {/* Right: Actions & Theme Toggle */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn text-xs py-1.5 px-3 rounded-md no-underline transition-colors"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-external-link-alt text-[0.7rem]" />
          <span className="hidden sm:inline">Portail Client</span>
        </Link>

        <div className="flex items-center">
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
