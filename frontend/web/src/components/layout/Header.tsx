'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';

export const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isSupport, logout } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header className={`header ${isHome ? 'home-header' : 'subpage-header'}`}>
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

          {!isHome && (
            <div className="navigation" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <Link
                href="/hotels"
                className={`nav-link ${pathname === '/hotels' ? 'active' : ''}`}
              >
                Hébergements
              </Link>
              <Link
                href="/flights"
                className={`nav-link ${pathname === '/flights' ? 'active' : ''}`}
              >
                Vols
              </Link>
              <Link
                href="/transfers"
                className={`nav-link ${pathname === '/transfers' ? 'active' : ''}`}
              >
                Taxi
              </Link>
              <Link
                href="/hotels"
                className={`nav-link ${pathname === '/hotels' ? 'active' : ''}`}
              >
                Location
              </Link>
              <Link
                href="/activities"
                className={`nav-link ${pathname === '/activities' ? 'active' : ''}`}
              >
                Activités
              </Link>
              <Link
                href="/trains"
                className={`nav-link ${pathname === '/trains' ? 'active' : ''}`}
              >
                Trains
              </Link>
            </div>
          )}

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
          </div>
        </div>
      </div>
    </header>
  );
};
