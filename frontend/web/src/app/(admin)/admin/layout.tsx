'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { useAuth } from '@/features/auth/useAuth';
import { usePathname } from 'next/navigation';
import '@/styles/admin.css';

const NAV_GROUPS = [
  {
    title: 'OPÉRATIONS',
    items: [
      { href: '/admin', label: "Vue d'ensemble", icon: 'fas fa-chart-pie' },
      { href: '/admin/bookings', label: 'Réservations', icon: 'fas fa-compass' },
      { href: '/admin/payments', label: 'Paiements', icon: 'fas fa-wallet' },
      { href: '/admin/refunds', label: 'Remboursements', icon: 'fas fa-undo-alt' },
    ],
  },
  {
    title: 'CONTENU',
    items: [
      { href: '/admin/reviews', label: 'Avis', icon: 'fas fa-comment-alt' },
      { href: '/admin/destinations', label: 'Destinations', icon: 'fas fa-map-pin' },
    ],
  },
  {
    title: 'SYSTÈME',
    items: [
      { href: '/admin/providers', label: 'Santé & Télémétrie', icon: 'fas fa-microchip' },
    ],
  },
  {
    title: 'GOUVERNANCE',
    items: [
      { href: '/admin/users', label: 'Utilisateurs', icon: 'fas fa-users-cog' },
      { href: '/admin/audit', label: "Journal d'audit", icon: 'fas fa-history' },
      { href: '/admin/settings', label: 'Paramètres', icon: 'fas fa-sliders-h' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const operatorName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'Ahmed Elbattah';
  const operatorRole = user?.roles?.includes('ROLE_ADMIN')
    ? 'Administrateur Principal'
    : 'Opérateur Support';

  return (
    <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>
      <div
        className="min-h-screen flex"
        style={{
          backgroundColor: 'var(--admin-bg)',
          color: 'var(--admin-text-primary)',
        }}
      >
        {/* Sleek, Restrained Product Navigation Rail */}
        <aside
          className="w-64 shrink-0 flex flex-col justify-between select-none border-r"
          style={{
            backgroundColor: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
          }}
        >
          <div>
            {/* Minimal Brand Identity */}
            <div className="h-16 px-6 flex items-center gap-3 border-b border-[#F1F3F5] dark:border-[#1A1F28]">
              <div className="w-7 h-7 rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0B0D11] flex items-center justify-center font-black text-xs tracking-wider">
                Y
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight leading-none text-[#0F172A] dark:text-white">
                  Yuding
                </span>
                <span className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8] leading-none mt-1">
                  Operations Console
                </span>
              </div>
            </div>

            {/* Navigation Groups with Generous Air & Clean Geometry */}
            <nav className="p-4 space-y-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold tracking-widest text-[#94A3B8] dark:text-[#64748B] uppercase">
                    {group.title}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold no-underline transition-all ${
                            isActive
                              ? 'bg-[#0F172A] dark:bg-[#1E2430] text-white shadow-xs'
                              : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F5F9]/60 dark:hover:bg-[#1A1F29]/60'
                          }`}
                        >
                          <i
                            className={`${item.icon} text-xs w-4 text-center ${
                              isActive ? 'text-[#00D4AA]' : 'text-[#94A3B8]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Real Operator Profile Foundation */}
          <div className="p-4 border-t border-[#F1F3F5] dark:border-[#1A1F28] bg-[#FAFAFB] dark:bg-[#0E1116]">
            <div className="flex items-center gap-3">
              <img
                src="/image/ahmed-profile.png"
                alt={operatorName}
                className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] dark:border-[#2D3748] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                  {operatorName}
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                  {operatorRole}
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[#94A3B8] hover:text-[#EF4444] transition-colors p-1"
                title="Déconnexion"
              >
                <i className="fas fa-sign-out-alt text-xs" />
              </button>
            </div>
          </div>
        </aside>

        {/* Viewport & Utility Header */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <header className="h-16 px-8 border-b border-[#E5E7EB] dark:border-[#1E232D] bg-white/80 dark:bg-[#12151B]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span>Console</span>
              <span>/</span>
              <span className="font-semibold text-[#0F172A] dark:text-white capitalize">
                {pathname.replace('/admin/', '').replace('/admin', "Vue d'ensemble")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#059669]/30 text-[#047857] dark:text-[#34D399] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>Passerelle :8888</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
