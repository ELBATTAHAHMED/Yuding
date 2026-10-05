'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { EntityAvatar } from './EntityAvatar';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  category: 'OPÉRATIONS' | 'CONTENU' | 'SYSTÈME' | 'GOUVERNANCE';
  badgeCount?: number;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: "Vue d'ensemble", icon: 'fas fa-chart-line', category: 'OPÉRATIONS' },
  { href: '/admin/bookings', label: 'Réservations & Voyages', icon: 'fas fa-ticket-alt', category: 'OPÉRATIONS' },
  { href: '/admin/payments', label: 'Paiements & Ledger', icon: 'fas fa-credit-card', category: 'OPÉRATIONS' },
  { href: '/admin/refunds', label: 'Remboursements', icon: 'fas fa-undo-alt', category: 'OPÉRATIONS' },

  { href: '/admin/reviews', label: 'Modération Avis', icon: 'fas fa-star', category: 'CONTENU' },
  { href: '/admin/destinations', label: 'Destinations Maroc', icon: 'fas fa-map-marked-alt', category: 'CONTENU' },

  { href: '/admin/providers', label: 'Santé & Télémétrie', icon: 'fas fa-server', category: 'SYSTÈME' },

  { href: '/admin/users', label: 'Utilisateurs & RBAC', icon: 'fas fa-users-cog', category: 'GOUVERNANCE' },
  { href: '/admin/audit', label: "Journal d'Audit", icon: 'fas fa-shield-alt', category: 'GOUVERNANCE' },
  { href: '/admin/settings', label: 'Politiques & Système', icon: 'fas fa-sliders-h', category: 'GOUVERNANCE' },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    if (mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]);

  const categories: Array<NavItem['category']> = [
    'OPÉRATIONS',
    'CONTENU',
    'SYSTÈME',
    'GOUVERNANCE',
  ];

  const userFullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Opérateur Yuding';

  const roleName = user?.roles?.includes('ROLE_ADMIN')
    ? 'Administrateur'
    : user?.roles?.includes('ROLE_CONTENT_MANAGER')
    ? 'Gestionnaire Contenu'
    : 'Opérateur Support';

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Persistent Desktop Sidebar & Mobile Off-canvas Drawer */}
      <aside
        className={`admin-sidebar flex flex-col fixed md:sticky top-0 h-screen z-50 md:z-30 transition-all duration-200 select-none border-r shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          width: collapsed ? '68px' : '256px',
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
        }}
        aria-label="Navigation d'administration"
      >
        {/* Brand Header */}
        <div
          className="h-14 px-3 flex items-center border-b justify-between shrink-0"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
          }}
        >
          {!collapsed ? (
            <Link href="/admin" className="flex items-center gap-2.5 no-underline group">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-slate-900 shadow-xs shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                }}
              >
                Y
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-slate-100">
                    Yuding
                  </span>
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider leading-none"
                    style={{
                      backgroundColor: 'var(--admin-accent-subtle)',
                      color: 'var(--admin-accent)',
                    }}
                  >
                    OPS
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">
                  Console V2
                </span>
              </div>
            </Link>
          ) : (
            <div className="w-full flex justify-center">
              <Link
                href="/admin"
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-slate-900 no-underline shadow-xs"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                }}
                title="Yuding Operations"
              >
                Y
              </Link>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex w-6 h-6 rounded items-center justify-center border transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{
              borderColor: 'var(--admin-border)',
              backgroundColor: 'transparent',
            }}
            title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            aria-label="Basculer le panneau de navigation"
          >
            <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'} text-[10px]`} />
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fermer le menu mobile"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3.5 admin-custom-scrollbar">
          {categories.map((cat) => {
            const items = ADMIN_NAV_ITEMS.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-0.5">
                {!collapsed && (
                  <div className="px-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 truncate">
                    {cat}
                  </div>
                )}
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline transition-all duration-150 relative ${
                        isActive
                          ? 'text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                      }`}
                      style={{
                        backgroundColor: isActive ? 'var(--admin-accent-subtle)' : undefined,
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--admin-accent)' }}
                        />
                      )}
                      <i
                        className={`${item.icon} text-xs w-4 text-center shrink-0 ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Operator Session Footer with Action Popover */}
        <div
          ref={profileMenuRef}
          className="p-2.5 border-t relative shrink-0"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface-muted)',
          }}
        >
          {/* Profile Dropdown Popover */}
          {profileMenuOpen && (
            <div
              className="absolute bottom-full left-2 right-2 mb-2 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-1 z-50 text-xs animate-fade-in"
              style={{
                boxShadow: 'var(--admin-shadow-lg)',
              }}
            >
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {userFullName}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {user?.email || 'operator@yuding.ma'}
                </div>
              </div>

              <Link
                href="/account/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-user-circle text-xs text-slate-400" />
                <span>Mon profil opérateur</span>
              </Link>

              <Link
                href="/hotels"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-globe text-xs text-emerald-500" />
                <span>Portail Yuding public</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-sliders-h text-xs text-sky-500" />
                <span>Paramètres système</span>
              </Link>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium text-left"
                >
                  <i className="fas fa-sign-out-alt text-xs" />
                  <span>Déconnexion sécurisée</span>
                </button>
              </div>
            </div>
          )}

          {/* Trigger Row */}
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-2 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors text-left"
            title="Menu profil opérateur"
            aria-expanded={profileMenuOpen}
          >
            <EntityAvatar
              name={userFullName}
              email={user?.email}
              size="sm"
              variant="operator"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {userFullName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {roleName}
                  </span>
                </div>
              </div>
            )}
            {!collapsed && (
              <i className={`fas fa-chevron-${profileMenuOpen ? 'down' : 'up'} text-[10px] text-slate-400 shrink-0`} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
