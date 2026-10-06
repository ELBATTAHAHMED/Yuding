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
      {/* Left: Mobile trigger & Breadcrumb Context */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center border text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
            style={{
              borderColor: 'var(--admin-border)',
              backgroundColor: 'var(--admin-surface-muted)',
            }}
            aria-label="Menu"
          >
            <i className="fas fa-bars text-xs" />
          </button>
        )}

        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs">
          <Link
            href="/admin"
            className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white font-medium no-underline transition-colors"
          >
            Console
          </Link>
          <span className="text-[#CBD5E1] dark:text-[#475569] select-none">/</span>
          <span className="text-[11px] uppercase tracking-wider text-[#94A3B8] dark:text-[#64748B] font-bold hidden sm:inline">
            {currentItem.category}
          </span>
          <span className="text-[#CBD5E1] dark:text-[#475569] select-none hidden sm:inline">/</span>
          <span className="font-bold text-[#0F172A] dark:text-white">
            {currentItem.label}
          </span>
        </nav>
      </div>

      {/* Center: Quiet Sandbox / Environment Indicator */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#047857] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[#059669]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>Environnement Opérationnel</span>
        </div>
      </div>

      {/* Right: Theme Toggle & Quick Action */}
      <div className="flex items-center gap-3">
        <DarkModeToggle />
      </div>
    </header>
  );
}
