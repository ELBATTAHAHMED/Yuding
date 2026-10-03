'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
  category?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: 'fas fa-chart-line', category: 'PRINCIPAL' },
  { href: '/admin/users', label: 'Utilisateurs & RBAC', icon: 'fas fa-users-cog', category: 'PRINCIPAL' },
  { href: '/admin/bookings', label: 'Réservations', icon: 'fas fa-ticket-alt', category: 'COMMERCE' },
  { href: '/admin/payments', label: 'Paiements & Ledger', icon: 'fas fa-credit-card', category: 'COMMERCE' },
  { href: '/admin/refunds', label: 'Remboursements', icon: 'fas fa-undo-alt', category: 'COMMERCE' },
  { href: '/admin/reviews', label: 'Modération Avis', icon: 'fas fa-star', category: 'CONTENU' },
  { href: '/admin/destinations', label: 'Destinations Maroc', icon: 'fas fa-map-marked-alt', category: 'CONTENU' },
  { href: '/admin/custom-offers', label: 'Offres & Packages', icon: 'fas fa-tags', category: 'CONTENU' },
  { href: '/admin/providers', label: 'Santé des Fournisseurs', icon: 'fas fa-server', category: 'SYSTÈME' },
  { href: '/admin/api-usage', label: 'Consommation API', icon: 'fas fa-network-wired', category: 'SYSTÈME' },
  { href: '/admin/ai-usage', label: 'IA & Outils RAG', icon: 'fas fa-robot', category: 'SYSTÈME' },
  { href: '/admin/audit', label: 'Journal d\'Audit', icon: 'fas fa-shield-alt', category: 'SÉCURITÉ' },
  { href: '/admin/settings', label: 'Paramètres Opérationnels', icon: 'fas fa-sliders-h', category: 'SÉCURITÉ' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Group nav items by category
  const categories = Array.from(new Set(NAV_ITEMS.map((item) => item.category || 'PRINCIPAL')));

  return (
    <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>
      <div
        className="admin-dashboard-layout"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--bg-primary, #0B0F19)',
          color: '#f8fafc',
          fontFamily: 'inherit',
        }}
      >
        {/* Operations Sidebar */}
        <aside
          className="admin-sidebar"
          style={{
            width: collapsed ? '80px' : '260px',
            background: 'var(--bg-secondary, #111827)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 30,
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          {/* Brand header */}
          <div
            style={{
              padding: '1.25rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            {!collapsed ? (
              <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00D4AA 0%, #008766 100%)',
                    color: '#0B0F19',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                  }}
                >
                  Y
                </span>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    Yuding <span style={{ color: '#00D4AA', fontSize: '0.8rem', fontWeight: 700 }}>OPS</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Console v2.0
                  </div>
                </div>
              </Link>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00D4AA 0%, #008766 100%)',
                  color: '#0B0F19',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                }}
              >
                Y
              </span>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              aria-label="Toggle sidebar"
            >
              <i className={`fas fa-${collapsed ? 'chevron-right' : 'chevron-left'}`} style={{ fontSize: '0.85rem' }} />
            </button>
          </div>

          {/* Navigation Items */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {categories.map((category) => {
              const items = NAV_ITEMS.filter((item) => (item.category || 'PRINCIPAL') === category);
              return (
                <div key={category}>
                  {!collapsed && (
                    <div
                      style={{
                        padding: '0 0.6rem 0.35rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {category}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            color: isActive ? '#00D4AA' : '#94a3b8',
                            background: isActive ? 'rgba(0, 212, 170, 0.12)' : 'transparent',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                            borderLeft: isActive ? '3px solid #00D4AA' : '3px solid transparent',
                          }}
                          title={collapsed ? item.label : undefined}
                        >
                          <i
                            className={item.icon}
                            style={{
                              width: '20px',
                              textAlign: 'center',
                              fontSize: '0.95rem',
                              color: isActive ? '#00D4AA' : '#64748b',
                            }}
                          />
                          {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User profile & session footer */}
          <div
            style={{
              padding: '0.85rem 0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D4AA 0%, #008766 100%)',
                  color: '#0B0F19',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
              </div>
              {!collapsed && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Administrateur'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#00D4AA', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#00D4AA' }} />
                    {user?.roles?.includes('ROLE_ADMIN') ? 'Super Admin' : 'Opérations'}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => logout()}
              style={{
                width: '100%',
                marginTop: '0.65rem',
                padding: '0.45rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'background 0.15s ease',
              }}
              title="Déconnexion sécurisée"
            >
              <i className="fas fa-sign-out-alt" />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
          {/* Operational Topbar */}
          <header
            style={{
              height: '64px',
              padding: '0 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'var(--bg-secondary, #111827)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(0, 212, 170, 0.1)',
                  border: '1px solid rgba(0, 212, 170, 0.2)',
                  fontSize: '0.75rem',
                  color: '#00D4AA',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#00D4AA' }} />
                <span>Production Environnement</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>PostgreSQL 16 · Redis 7 · Gateway :8888</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem' }} />
                <span>Voir portail client</span>
              </Link>
              <DarkModeToggle />
            </div>
          </header>

          {/* Page workspace */}
          <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
