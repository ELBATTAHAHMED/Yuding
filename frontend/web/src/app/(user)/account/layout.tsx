'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './account.css';

const navItems = [
  { label: 'Profil & Sécurité', href: '/account/profile', icon: 'fa-user-shield' },
  { label: 'Mes Réservations', href: '/account/bookings', icon: 'fa-suitcase-rolling' },
  { label: 'Mes Favoris', href: '/account/favorites', icon: 'fa-heart' },
];

export default function UserLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="user-account-shell">
      <Header />
      <ProtectedRoute>
        <div className="account-surface">
          <div className="account-content">
            <nav className="account-nav" aria-label="Navigation du compte">
              {navItems.map(item => (
                <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''} aria-current={pathname === item.href ? 'page' : undefined}>
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            {children}
          </div>
        </div>
      </ProtectedRoute>
      <Footer />
    </div>
  );
}
