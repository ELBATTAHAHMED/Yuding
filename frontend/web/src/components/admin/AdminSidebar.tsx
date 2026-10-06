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
  { href: '/admin', label: "Vue d'ensemble", icon: 'fas fa-th-large', category: 'OPÉRATIONS' },
  { href: '/admin/bookings', label: 'Réservations', icon: 'fas fa-ticket-alt', category: 'OPÉRATIONS' },
  { href: '/admin/payments', label: 'Paiements', icon: 'fas fa-credit-card', category: 'OPÉRATIONS' },
  { href: '/admin/refunds', label: 'Remboursements', icon: 'fas fa-undo-alt', category: 'OPÉRATIONS' },

  { href: '/admin/reviews', label: 'Avis', icon: 'fas fa-star', category: 'CONTENU' },
  { href: '/admin/destinations', label: 'Destinations', icon: 'fas fa-map-marked-alt', category: 'CONTENU' },

  { href: '/admin/providers', label: 'Santé & Télémétrie', icon: 'fas fa-server', category: 'SYSTÈME' },

  { href: '/admin/users', label: 'Utilisateurs', icon: 'fas fa-user-shield', category: 'GOUVERNANCE' },
  { href: '/admin/audit', label: "Journal d'audit", icon: 'fas fa-shield-alt', category: 'GOUVERNANCE' },
  { href: '/admin/settings', label: 'Paramètres', icon: 'fas fa-cog', category: 'GOUVERNANCE' },
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
    : 'Ahmed Elbattah';

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

      {/* Persistent Designed Product Rail */}
      <aside
        className={`admin-sidebar flex flex-col fixed md:sticky top-0 h-screen z-50 md:z-30 transition-all duration-200 select-none border-r shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          width: collapsed ? '72px' : '260px',
          backgroundColor: 'var(--admin-sidebar-bg)',
          borderColor: 'var(--admin-sidebar-border)',
        }}
        aria-label="Navigation d'administration"
      >
        {/* Brand Header — Clean Product Mark & Operations Title */}
        <div
          className="h-16 px-4 flex items-center justify-between shrink-0 border-b"
          style={{ borderColor: 'var(--admin-sidebar-border)' }}
        >
          {!collapsed ? (
            <Link href="/admin" className="flex items-center gap-3 no-underline group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-slate-900 shadow-sm shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                }}
              >
                Y
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-zinc-100 font-sans leading-tight">
                  Yuding
                </span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 leading-tight">
                  Console Opérations
                </span>
              </div>
            </Link>
          ) : (
            <div className="w-full flex justify-center">
              <Link
                href="/admin"
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-slate-900 no-underline shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                }}
                title="Yuding Operations"
              >
                Y
              </Link>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title={collapsed ? 'Déplier' : 'Replier'}
            aria-label="Basculer le panneau de navigation"
          >
            <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'} text-xs`} />
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="Fermer le menu mobile"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>

        {/* Navigation Groups with Confident Typographic Scale */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 admin-custom-scrollbar">
          {categories.map((cat) => {
            const items = ADMIN_NAV_ITEMS.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 pb-1 text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 truncate">
                    {cat}
                  </div>
                )}
                {items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold no-underline transition-all duration-150 min-h-[40px] relative ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs dark:bg-zinc-800/90 dark:text-zinc-50'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/80 dark:hover:bg-zinc-800/50'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Left subtle active indicator bar */}
                      {isActive && (
                        <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-emerald-400" />
                      )}
                      <i
                        className={`${item.icon} text-sm w-5 text-center shrink-0 ${
                          isActive
                            ? 'text-emerald-400 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      />
                      {!collapsed && <span className="truncate flex-1 ml-0.5">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Device / Session Status Block (Like Macbook 2017 in Reference Dashboard) */}
        {!collapsed && (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0">
                <i className="fas fa-desktop" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 truncate leading-none">
                  Console Opérateur
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                    Passerelle :8888 Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Operator Session Footer with Action Popover */}
        <div
          ref={profileMenuRef}
          className="p-3 border-t relative shrink-0"
          style={{
            borderColor: 'var(--admin-sidebar-border)',
            backgroundColor: 'var(--admin-sidebar-bg)',
          }}
        >
          {/* Profile Dropdown Popover */}
          {profileMenuOpen && (
            <div
              className="absolute bottom-full left-3 right-3 mb-2 p-1.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-1 z-50 text-xs animate-fade-in"
              style={{
                boxShadow: 'var(--admin-shadow-lg)',
              }}
            >
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {userFullName}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                  {user?.email || 'admin@yuding.ma'}
                </div>
              </div>

              <Link
                href="/account/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-user-circle text-xs text-slate-400" />
                <span>Mon profil opérateur</span>
              </Link>

              <Link
                href="/hotels"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-globe text-xs text-emerald-500" />
                <span>Portail Yuding public</span>
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 no-underline transition-colors"
                onClick={() => setProfileMenuOpen(false)}
              >
                <i className="fas fa-cog text-xs text-sky-500" />
                <span>Paramètres système</span>
              </Link>

              <div className="pt-1 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-semibold text-left"
                >
                  <i className="fas fa-sign-out-alt text-xs" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}

          {/* Trigger Row with True Circular Avatar & Full Identity */}
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/ transition-colors text-left"
            title="Menu profil opérateur"
            aria-expanded={profileMenuOpen}
          >
            <EntityAvatar
              name={userFullName}
              email={user?.email}
              userId={user?.id}
              hasProfilePhoto={user?.hasProfilePhoto}
              size="md"
              variant="operator"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate leading-tight">
                  {userFullName}
                </div>
                <div className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                  {roleName}
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

