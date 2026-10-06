'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { UserPhotoAvatar } from './UserPhotoAvatar';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavCategory {
  title: 'OPÉRATIONS VOYAGE' | 'TRÉSORERIE & FINANCES' | 'VOYAGEURS & CONTENU' | 'SYSTÈME & CONFORMITÉ';
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavCategory[] = [
  {
    title: 'OPÉRATIONS VOYAGE',
    items: [
      { href: '/admin', label: "Vue d'ensemble", icon: 'fas fa-chart-pie' },
      { href: '/admin/bookings', label: 'Dossiers Voyage', icon: 'fas fa-compass' },
    ],
  },
  {
    title: 'TRÉSORERIE & FINANCES',
    items: [
      { href: '/admin/payments', label: 'Encaissements & Règlements', icon: 'fas fa-wallet' },
      { href: '/admin/refunds', label: 'Annulations & Remboursements', icon: 'fas fa-undo-alt' },
    ],
  },
  {
    title: 'VOYAGEURS & CONTENU',
    items: [
      { href: '/admin/users', label: 'Comptes & Sécurité', icon: 'fas fa-users-cog' },
      { href: '/admin/reviews', label: 'Modération des Avis', icon: 'fas fa-comment-alt' },
    ],
  },
  {
    title: 'SYSTÈME & CONFORMITÉ',
    items: [
      { href: '/admin/audit', label: "Journal d'Audit", icon: 'fas fa-history' },
      { href: '/admin/providers', label: 'Supervision Plateforme', icon: 'fas fa-microchip' },
    ],
  },
];

// Flattened for header/breadcrumb lookups
export const ADMIN_NAV_ITEMS: Array<NavItem & { category: string }> = ADMIN_NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, category: g.title }))
);

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]);

  const operatorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Ahmed Elbattah';

  const operatorRole = user?.roles?.includes('ROLE_ADMIN')
    ? 'Administrateur'
    : user?.roles?.includes('ROLE_CONTENT_MANAGER')
    ? 'Gestionnaire Contenu'
    : 'Opérateur Support';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-[260px] fixed md:sticky top-0 h-screen z-50 md:z-30 flex flex-col justify-between select-none border-r shrink-0 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--admin-sidebar-bg)',
          borderColor: 'var(--admin-sidebar-border)',
        }}
        aria-label="Navigation d'administration"
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Header */}
          <div
            className="h-16 px-5 flex items-center justify-between border-b shrink-0"
            style={{ borderColor: 'var(--admin-sidebar-border)' }}
          >
            <Link href="/admin" className="flex items-center gap-3 no-underline group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-slate-900 shadow-sm shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                }}
              >
                Y
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-[#0F172A] dark:text-white leading-tight">
                  Yuding
                </span>
                <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] leading-tight">
                  Console Opérations
                </span>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                aria-label="Fermer"
              >
                <i className="fas fa-times text-xs" />
              </button>
            )}
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 overflow-y-auto p-3.5 space-y-6 admin-custom-scrollbar">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 pb-1 text-[11px] font-bold tracking-wider uppercase text-[#94A3B8] dark:text-[#64748B]">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold no-underline transition-all relative ${
                          isActive
                            ? 'bg-[#0F172A] text-white shadow-xs dark:bg-[#222834] dark:text-white'
                            : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9]/70 dark:hover:bg-[#1E2430]/70'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#00D4AA]" />
                        )}
                        <i
                          className={`${item.icon} text-sm w-4 text-center shrink-0 ${
                            isActive ? 'text-[#00D4AA]' : 'text-[#94A3B8]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Real Operator Profile Area */}
        <div
          ref={profileMenuRef}
          className="p-3 border-t relative shrink-0"
          style={{
            borderColor: 'var(--admin-sidebar-border)',
            backgroundColor: 'var(--admin-sidebar-bg)',
          }}
        >
          {/* Profile Popover Menu */}
          {profileOpen && (
            <div
              className="absolute bottom-full left-3 right-3 mb-2 p-1.5 rounded-xl border bg-white dark:bg-[#14171E] shadow-xl space-y-1 z-50 text-xs animate-fade-in"
              style={{
                borderColor: 'var(--admin-border)',
                boxShadow: 'var(--admin-shadow-lg)',
              }}
            >
              <div className="px-2.5 py-1.5 border-b border-[#F1F3F5] dark:border-[#1E2430]">
                <div className="font-bold text-[#0F172A] dark:text-white truncate">
                  {operatorName}
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                  {user?.email || 'ahmedelbattah123@gmail.com'}
                </div>
              </div>

              <Link
                href="/account/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1A1F28] no-underline transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <i className="fas fa-user-circle text-xs" />
                <span>Mon profil</span>
              </Link>

              <Link
                href="/hotels"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1A1F28] no-underline transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <i className="fas fa-globe text-xs text-[#00D4AA]" />
                <span>Portail Yuding</span>
              </Link>

              <div className="pt-1 border-t border-[#F1F3F5] dark:border-[#1E2430]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/20 transition-colors font-semibold text-left"
                >
                  <i className="fas fa-sign-out-alt text-xs" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}

          {/* Operator Row Trigger */}
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#1A1F28] transition-colors text-left"
            title="Menu profil opérateur"
            aria-expanded={profileOpen}
          >
            <UserPhotoAvatar
              user={{
                id: user?.id,
                firstName: user?.firstName || 'Ahmed',
                lastName: user?.lastName || 'Elbattah',
                hasProfilePhoto: user?.hasProfilePhoto,
                updatedAt: user?.updatedAt,
              }}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#0F172A] dark:text-white truncate leading-tight">
                {operatorName}
              </div>
              <div className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                {operatorRole}
              </div>
            </div>
            <i className={`fas fa-chevron-${profileOpen ? 'down' : 'up'} text-[10px] text-[#94A3B8] shrink-0`} />
          </button>
        </div>
      </aside>
    </>
  );
}
