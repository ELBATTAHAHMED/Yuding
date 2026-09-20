'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Profil & Sécurité', href: '/account/profile', icon: 'fa-user-shield' },
    { label: 'Mes Réservations', href: '/account/bookings', icon: 'fa-suitcase-rolling' },
    { label: 'Mes Favoris', href: '/account/favorites', icon: 'fa-heart' },
  ];

  return (
    <div className="user-account-shell">
      <Header />
      <ProtectedRoute>
        <div style={{ background: 'var(--bg, #f4f6f6)', minHeight: '80vh', padding: '2rem 1rem 4rem' }}>
          <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Account Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '2px solid rgba(1, 121, 111, 0.15)',
                marginBottom: '2rem',
                overflowX: 'auto',
              }}
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.25rem',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      color: isActive ? '#01796F' : 'var(--text-secondary, #666)',
                      borderBottom: isActive ? '3px solid #01796F' : '3px solid transparent',
                      marginBottom: '-2px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <i className={`fas ${item.icon}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Subroute content */}
            {children}
          </div>
        </div>
      </ProtectedRoute>
      <Footer />
    </div>
  );
}
