'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isSupport, logout } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [
    { href: '/hotels', label: 'Hébergements' },
    { href: '/flights', label: 'Vols' },
    { href: '/activities', label: 'Activités' },
    { href: '/transfers', label: 'Transferts' },
    { href: '/trains', label: 'Trains' },
  ];

  return (
    <header className={`header yuding-header ${isHome ? 'home-header' : 'subpage-header'}`}>
      <div className="header-top">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/logo1.png"
              alt="Yuding"
              id="headerLogo"
            />
          </Link>

          <nav className={`navigation yuding-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-btns" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div className="booking" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isAuthenticated ? (
                <>
                  <Link href="/account">
                    <button className="btn-booking" style={{ color: 'white', minWidth: 'auto', padding: '0.45rem 1.1rem', fontSize: '0.85rem', borderRadius: '6px', backgroundColor: '#01796F' }}>
                      <i className="fas fa-user-circle" style={{ marginRight: '6px' }} />
                      {user?.firstName || user?.email?.split('@')[0] || 'Mon Compte'}
                    </button>
                  </Link>

                  {(isAdmin || isSupport) && (
                    <Link href="/admin">
                      <button className="btn-booking" style={{ color: 'white', background: '#e11d48', minWidth: 'auto', padding: '0.45rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px' }}>
                        Admin
                      </button>
                    </Link>
                  )}

                  <button
                    onClick={() => logout()}
                    className="h-btn"
                    style={{ background: 'transparent', border: 'none', color: '#80cbc4', cursor: 'pointer', fontSize: '14px', padding: '6px' }}
                    title="Déconnexion"
                    type="button"
                  >
                    <i className="fas fa-sign-out-alt" />
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  id="loginBtn"
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    backgroundColor: '#01796F',
                    padding: '0.45rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  Connexion
                </Link>
              )}
            </div>

            <DarkModeToggle />
            <button type="button" className="yuding-menu-toggle" aria-expanded={menuOpen} aria-label="Ouvrir la navigation" onClick={() => setMenuOpen((open) => !open)}>
              <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
