'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { AccountMenu } from './AccountMenu';

export const Header: React.FC<{ hideLogin?: boolean; onThemeChange?: (dark: boolean) => void }> = ({ hideLogin = false, onThemeChange }) => {
  const { isAuthenticated, isAdmin, isSupport } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    if (!isHome) return;
    let scrolled = false;
    const update = () => {
      const next = window.scrollY > 56;
      if (next !== scrolled) { scrolled = next; setHomeScrolled(next); }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [isHome]);

  const navigation = [
    { href: '/hotels', label: 'Hébergements', icon: 'fas fa-bed' },
    { href: '/flights', label: 'Vols', icon: 'fas fa-plane' },
    { href: '/activities', label: 'Activités', icon: 'fas fa-person-hiking' },
    { href: '/transfers', label: 'Transferts', icon: 'fas fa-taxi' },
    { href: '/trains', label: 'Trains', icon: 'fas fa-train' },
  ];

  return (
    <header className={`header yuding-header${hydrated ? ' header--hydrated' : ''} ${isHome ? `home-header${homeScrolled ? ' home-header--scrolled' : ''}${menuOpen ? ' home-header--menu-open' : ''}` : 'subpage-header'}`}>
      <div className="header-top">
        <div className="container1 header-inner">
          <Link href="/" className="logo">
            {/* Both logo assets stay mounted so a theme switch never flashes the old color. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/logo1.png" alt="Yuding" className="home-logo-light" id="headerLogo" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/logodark.png" alt="" aria-hidden="true" className="home-logo-dark" />
          </Link>

          <nav className={`header-nav yuding-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Navigation principale">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="header-btns">
            <div className="booking">
              {isAuthenticated ? (
                <div className="header-account-actions">
                  <AccountMenu />

                  {(isAdmin || isSupport) && (
                    <Link href="/admin" className="btn-connexion" style={{ background: '#e11d48', padding: '8px 14px', fontSize: '13px' }}>Admin</Link>
                  )}
                </div>
              ) : !hideLogin ? (
                <Link
                  href="/login"
                  id="loginBtn"
                  className="btn-connexion"
                >
                  <i className="fas fa-sign-in-alt" />
                  <span>Connexion</span>
                </Link>
              ) : null}
            </div>

            <DarkModeToggle onThemeChange={onThemeChange} />

            {hydrated && <button
              type="button"
              className="yuding-menu-toggle"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'}
              onClick={() => setMenuOpen((open) => !open)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`} aria-hidden="true" />
            </button>}
          </div>
        </div>
      </div>
    </header>
  );
};
