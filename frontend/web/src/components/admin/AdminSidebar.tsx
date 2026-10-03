'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  category: 'OPÉRATIONS & COMMERCE' | 'CONTENU & MODÉRATION' | 'SYSTÈME & OBSERVABILITÉ' | 'GOUVERNANCE & SÉCURITÉ';
  badgeCount?: number;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: 'fas fa-chart-line', category: 'OPÉRATIONS & COMMERCE' },
  { href: '/admin/bookings', label: 'Réservations & Voyages', icon: 'fas fa-ticket-alt', category: 'OPÉRATIONS & COMMERCE' },
  { href: '/admin/payments', label: 'Paiements & Ledger', icon: 'fas fa-credit-card', category: 'OPÉRATIONS & COMMERCE' },
  { href: '/admin/refunds', label: 'Remboursements', icon: 'fas fa-undo-alt', category: 'OPÉRATIONS & COMMERCE' },
  
  { href: '/admin/reviews', label: 'Modération Avis', icon: 'fas fa-star', category: 'CONTENU & MODÉRATION' },
  { href: '/admin/destinations', label: 'Destinations Maroc', icon: 'fas fa-map-marked-alt', category: 'CONTENU & MODÉRATION' },
  
  { href: '/admin/providers', label: 'Santé & Télémétrie', icon: 'fas fa-server', category: 'SYSTÈME & OBSERVABILITÉ' },
  
  { href: '/admin/users', label: 'Utilisateurs & RBAC', icon: 'fas fa-users-cog', category: 'GOUVERNANCE & SÉCURITÉ' },
  { href: '/admin/audit', label: 'Journal d\'Audit', icon: 'fas fa-shield-alt', category: 'GOUVERNANCE & SÉCURITÉ' },
  { href: '/admin/settings', label: 'Politiques & Paramètres', icon: 'fas fa-sliders-h', category: 'GOUVERNANCE & SÉCURITÉ' },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const categories: Array<NavItem['category']> = [
    'OPÉRATIONS & COMMERCE',
    'CONTENU & MODÉRATION',
    'SYSTÈME & OBSERVABILITÉ',
    'GOUVERNANCE & SÉCURITÉ',
  ];

  const userInitials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'AD';

  const userFullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Administrateur';

  const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN');

  return (
    <aside
      className="admin-sidebar flex flex-col sticky top-0 h-screen z-30 transition-[width] duration-200 select-none border-r"
      style={{
        width: collapsed ? '72px' : '260px',
        backgroundColor: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      {/* Brand Header */}
      <div
        className="h-16 px-4 flex items-center border-b justify-between"
        style={{
          borderColor: 'var(--admin-border)',
          backgroundColor: 'var(--admin-surface)',
        }}
      >
        {!collapsed ? (
          <Link href="/admin" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                color: '#0B0F19',
              }}
            >
              Y
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight leading-tight" style={{ color: 'var(--admin-text-primary)' }}>
                  Yuding
                </span>
                <span
                  className="text-[0.625rem] font-bold px-1.5 py-0.2 rounded leading-normal uppercase tracking-wider"
                  style={{
                    backgroundColor: 'var(--admin-accent-subtle)',
                    color: 'var(--admin-accent)',
                    border: '1px solid var(--admin-accent-border)',
                  }}
                >
                  OPS
                </span>
              </div>
              <span className="text-[0.65rem] uppercase tracking-wider font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
                Console v2.0
              </span>
            </div>
          </Link>
        ) : (
          <div className="w-full flex justify-center">
            <Link
              href="/admin"
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm no-underline"
              style={{
                background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
                color: '#0B0F19',
              }}
              title="Yuding Operations"
            >
              Y
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-md flex items-center justify-center border transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          style={{
            borderColor: 'var(--admin-border)',
            color: 'var(--admin-text-muted)',
            backgroundColor: 'transparent',
          }}
          title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          aria-label="Toggle navigation"
        >
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'} text-[0.65rem]`} />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 admin-custom-scrollbar">
        {categories.map((cat) => {
          const items = ADMIN_NAV_ITEMS.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-0.5">
              {!collapsed && (
                <div
                  className="px-2 pb-1 text-[0.65rem] font-bold tracking-wider uppercase truncate"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {cat}
                </div>
              )}
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-semibold no-underline transition-all duration-150 ${
                      isActive ? 'shadow-2xs' : 'hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'var(--admin-accent-subtle)' : 'transparent',
                      color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                      borderLeft: isActive ? '3px solid var(--admin-accent)' : '3px solid transparent',
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <i
                      className={`${item.icon} text-xs w-4 text-center flex-shrink-0`}
                      style={{
                        color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                      }}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.badgeCount !== undefined && (
                      <span
                        className="text-[0.65rem] px-1.5 py-0.2 rounded-full font-bold ml-auto"
                        style={{
                          backgroundColor: 'var(--admin-surface-muted)',
                          color: 'var(--admin-text-muted)',
                        }}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Operator Session Card */}
      <div
        className="p-3 border-t flex flex-col gap-2"
        style={{
          borderColor: 'var(--admin-border)',
          backgroundColor: 'var(--admin-surface-muted)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #01796F 100%)',
              color: '#0B0F19',
            }}
          >
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-bold truncate leading-tight"
                style={{ color: 'var(--admin-text-primary)' }}
              >
                {userFullName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isSuperAdmin ? 'var(--admin-accent)' : '#38BDF8' }}
                />
                <span
                  className="text-[0.6875rem] font-medium truncate"
                  style={{ color: isSuperAdmin ? 'var(--admin-accent)' : '#38BDF8' }}
                >
                  {isSuperAdmin ? 'Super Admin' : 'Opérations'}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="admin-btn w-full text-xs py-1.5 px-2 rounded-md transition-colors"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#F87171',
          }}
          title="Déconnexion sécurisée"
        >
          <i className="fas fa-sign-out-alt text-[0.75rem]" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
