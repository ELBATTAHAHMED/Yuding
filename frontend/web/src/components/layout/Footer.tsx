'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const exploreLinks = [
  { href: '/hotels', label: 'Hébergements' },
  { href: '/flights', label: 'Vols' },
  { href: '/activities', label: 'Activités' },
  { href: '/transfers', label: 'Transferts' },
  { href: '/trains', label: 'Trains' },
];

export function Footer() {
  const isHome = usePathname() === '/';
  return (
    <footer className={`yuding-footer${isHome ? ' yuding-footer--home' : ''}`}>
      <div className="yuding-footer__inner">
        <div className="yuding-footer__grid">
          <div className="yuding-footer__brand">
            <Link href="/" aria-label="Yuding — accueil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image/logodark.png" alt="Yuding" />
            </Link>
            <p>Des voyages qui vous ressemblent, à votre rythme.</p>
          </div>

          <div>
            <h4>Explorer</h4>
            <ul>
              {exploreLinks.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4>Continuer</h4>
            <ul>
              <li><Link href="/planifier">Smart Trip Planner</Link></li>
              <li><Link href="/account/bookings">Mes réservations</Link></li>
              <li><Link href="/account/reviews">Mes avis</Link></li>
              <li><Link href="/account">Mon compte</Link></li>
            </ul>
          </div>

          <div className="yuding-footer__discover">
            <h4>Votre voyage commence ici</h4>
            <p>Choisissez une destination et trouvez le séjour, le trajet et les expériences qui vous ressemblent.</p>
            <Link href="/planifier" className="yuding-footer__cta">Planifier mon voyage <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
          </div>
        </div>

        {isHome ? <div className="yuding-footer__bottom yuding-footer__bottom--home">
          <span className="yuding-footer__end-mark">Y<span aria-hidden="true">·</span></span>
          <span>© {new Date().getFullYear()} Yuding. Tous droits réservés.</span>
          <span>Le voyage continue.</span>
        </div> : <div className="yuding-footer__bottom">
          <div className="yuding-footer__signature">
            <span aria-hidden="true" />
            <div>
              <i className="fas fa-mountain" aria-hidden="true" />
              <strong>© {new Date().getFullYear()} Yuding. Tous droits réservés.</strong>
            </div>
            <span aria-hidden="true" />
          </div>
        </div>}
      </div>
    </footer>
  );
}
