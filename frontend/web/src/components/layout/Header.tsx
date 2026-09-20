'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isSupport, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="header-top">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/logo1.png" alt="Yuding Logo" id="headerLogo" style={{ maxHeight: '50px' }} />
          </Link>

          <div className="header-btns" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="booking" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/account"
                    className="btn btn-booking"
                    style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    <i className="fas fa-user-circle" style={{ marginRight: '0.4rem' }}></i>
                    {user?.firstName || user?.email || 'Mon Compte'}
                  </Link>

                  {(isAdmin || isSupport) && (
                    <Link
                      href="/admin"
                      className="btn btn-booking"
                      style={{
                        backgroundColor: '#d32f2f',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <i className="fas fa-chart-line" style={{ marginRight: '0.4rem' }}></i>
                      Admin
                    </Link>
                  )}

                  <button
                    onClick={() => logout()}
                    className="btn btn-booking"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid currentColor',
                      color: 'var(--text-color, #001b1a)',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                    type="button"
                  >
                    <i className="fas fa-sign-out-alt" style={{ marginRight: '0.3rem' }}></i>
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-booking"
                  style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                >
                  <i className="fas fa-sign-in-alt" style={{ marginRight: '0.4rem' }}></i>
                  Connexion
                </Link>
              )}
            </div>

            <DarkModeToggle />
          </div>
        </div>
      </div>

      <div className="header-bottom">
        <div className="container">
          <nav className="navigation" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link href="/hotels" className={`nav-link ${pathname === '/hotels' ? 'active' : ''}`}>
              <i className="fas fa-bed" style={{ marginRight: '0.4rem' }}></i>
              Hébergements
            </Link>
            <Link href="/flights" className={`nav-link ${pathname === '/flights' ? 'active' : ''}`}>
              <i className="fas fa-plane" style={{ marginRight: '0.4rem' }}></i>
              Vols
            </Link>
            <Link href="/transfers" className={`nav-link ${pathname === '/transfers' ? 'active' : ''}`}>
              <i className="fas fa-taxi" style={{ marginRight: '0.4rem' }}></i>
              Taxi &amp; Trains
            </Link>
            <Link href="/activities" className={`nav-link ${pathname === '/activities' ? 'active' : ''}`}>
              <i className="fas fa-hiking" style={{ marginRight: '0.4rem' }}></i>
              Activités
            </Link>
            <Link href="/booking" className={`nav-link ${pathname === '/booking' ? 'active' : ''}`}>
              <i className="fas fa-receipt" style={{ marginRight: '0.4rem' }}></i>
              Réservations
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
