'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import styles from './AccountMenu.module.css';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Mon compte';
  const initial = Array.from((user?.firstName || user?.email || 'C').trim())[0]?.toLocaleUpperCase() || 'C';

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.avatar}
        aria-label={`Ouvrir le compte de ${displayName}`}
        aria-expanded={open}
        aria-controls="yuding-account-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {initial}
      </button>
      {open && (
        <div id="yuding-account-menu" className={styles.panel}>
          <div className={styles.identity}>
            <span className={styles.identityAvatar} aria-hidden="true">{initial}</span>
            <span className={styles.identityText}>
              <strong>{displayName}</strong>
              <small>{user?.email}</small>
            </span>
          </div>
          <div className={styles.links}>
            <Link ref={firstLinkRef} href="/account/profile" onClick={() => setOpen(false)}><span className={styles.linkIcon}><i className="fas fa-user" aria-hidden="true" /></span><span>Mon profil</span><i className={`fas fa-chevron-right ${styles.chevron}`} aria-hidden="true" /></Link>
            <Link href="/account/bookings" onClick={() => setOpen(false)}><span className={styles.linkIcon}><i className="fas fa-suitcase" aria-hidden="true" /></span><span>Mes réservations</span><i className={`fas fa-chevron-right ${styles.chevron}`} aria-hidden="true" /></Link>
            <Link href="/account/profile#account-security" onClick={() => setOpen(false)}><span className={styles.linkIcon}><i className="fas fa-cog" aria-hidden="true" /></span><span>Paramètres</span><i className={`fas fa-chevron-right ${styles.chevron}`} aria-hidden="true" /></Link>
          </div>
          <button type="button" className={styles.logout} onClick={() => { setOpen(false); void logout(); }}>
            <span className={styles.logoutIcon}><i className="fas fa-sign-out-alt" aria-hidden="true" /></span>Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
