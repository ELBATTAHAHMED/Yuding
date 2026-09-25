'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { AccountMenu } from './AccountMenu';

export const Header: React.FC = () => {
  const { isAuthenticated, isAdmin, isSupport } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDark(darkActive);

    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    return () => observer.disconnect();
  }, []);

  const navigation = [
    { href: '/hotels', label: 'Hébergements', icon: 'fas fa-bed' },
    { href: '/flights', label: 'Vols', icon: 'fas fa-plane' },
    { href: '/activities', label: 'Activités', icon: 'fas fa-ticket-alt' },
    { href: '/transfers', label: 'Transferts', icon: 'fas fa-taxi' },
    { href: '/trains', label: 'Trains', icon: 'fas fa-train' },
  ];

  return (
    <header className={`header yuding-header ${isHome ? 'home-header' : 'subpage-header'}`}>
      <div className="header-top">
        <div className="container1 header-inner">
          <Link href="/" className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDark ? '/image/logo1.png' : '/image/logodark.png'}
              alt="Yuding"
              id="headerLogo"
            />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AccountMenu />

                  {(isAdmin || isSupport) && (
                    <Link href="/admin" className="btn-connexion" style={{ background: '#e11d48', padding: '8px 14px', fontSize: '13px' }}>Admin</Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  id="loginBtn"
                  className="btn-connexion"
                >
                  <i className="fas fa-sign-in-alt" />
                  <span>Connexion</span>
                </Link>
              )}
            </div>

            <DarkModeToggle />

            <button
              type="button"
              className="yuding-menu-toggle"
              aria-expanded={menuOpen}
              aria-label="Ouvrir la navigation"
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
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
