'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>
      <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #0A0E1A)' }}>
        {/* Sidebar */}
        <aside
          className="sidebar"
          style={{
            width: collapsed ? '80px' : '260px',
            background: 'var(--bg-secondary, #1A1F2E)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
            zIndex: 10,
          }}
        >
          <div
            className="sidebar-top"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Link href="/" className="sidebar-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image/logo1.png"
                alt="Yuding Admin"
                style={{ maxHeight: '38px', display: collapsed ? 'none' : 'block' }}
              />
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
              title="Basculer le menu"
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>

          <div className="sidebar-content" style={{ flex: 1, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column' }}>
            <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <Link
                href="/admin"
                className={`sidebar-link ${pathname === '/admin' ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname === '/admin' ? '#00D4AA' : '#b0bec5',
                  background: pathname === '/admin' ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-chart-line" style={{ width: '20px', textAlign: 'center' }}></i>
                {!collapsed && <span>Overview</span>}
              </Link>

              <Link
                href="/admin/users"
                className={`sidebar-link ${pathname === '/admin/users' ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: pathname === '/admin/users' ? '#00D4AA' : '#b0bec5',
                  background: pathname === '/admin/users' ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-users" style={{ width: '20px', textAlign: 'center' }}></i>
                {!collapsed && <span>Utilisateurs</span>}
              </Link>

              <Link
                href="/hotels"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#b0bec5',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-bed" style={{ width: '20px', textAlign: 'center' }}></i>
                {!collapsed && <span>Hébergements</span>}
              </Link>

              <Link
                href="/flights"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#b0bec5',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-plane" style={{ width: '20px', textAlign: 'center' }}></i>
                {!collapsed && <span>Transports</span>}
              </Link>

              <Link
                href="/activities"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: '#b0bec5',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                <i className="fas fa-calendar-alt" style={{ width: '20px', textAlign: 'center' }}></i>
                {!collapsed && <span>Activités</span>}
              </Link>
            </nav>

            <div
              className="sidebar-footer"
              style={{
                marginTop: 'auto',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#00D4AA',
                    color: '#0A0E1A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
                </div>
                {!collapsed && (
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {user?.firstName || 'Administrateur'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#00D4AA' }}>
                      {user?.roles?.includes('ROLE_ADMIN') ? 'Super Admin' : 'Support Team'}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => logout()}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#ef5350',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                {!collapsed && <span>Déconnexion</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="dashboard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Topbar */}
          <div
            className="topbar"
            style={{
              height: '70px',
              padding: '0 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--bg-secondary, #1A1F2E)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem', color: '#00D4AA' }}></i>
                Yuding Administration Portal
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <Link
                href="/"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#b0bec5',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-external-link-alt" style={{ marginRight: '0.4rem' }}></i>
                Voir le site
              </Link>
              <DarkModeToggle />
            </div>
          </div>

          <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
