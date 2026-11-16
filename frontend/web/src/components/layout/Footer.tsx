'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const exploreLinks = [
  { href: '/hotels', label: 'Hébergements' },
  { href: '/flights', label: 'Vols' },
  { href: '/activities', label: 'Activités' },
  { href: '/transfers', label: 'Transferts' },
  { href: '/trains', label: 'Trains' },
  { href: '/planifier', label: 'Planifier' },
];

export function Footer() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname?.startsWith('/admin')) return null;

  return (
    <footer className="yuding-footer yuding-footer--clean">
      <div className="yuding-footer__clean-inner">
        <div className="yuding-footer__clean-intro">
          <div className="yuding-footer__clean-brand">
            <Link prefetch={false} href="/" aria-label="Yuding — accueil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="footer-logo-light" src="/image/yuding-logo-ai-light-green.png" alt="Yuding" />
              <img className="footer-logo-dark" src="/image/yuding-logo-ai-inverse-green.png" alt="" aria-hidden="true" />
            </Link>
            <span>Voyagez à votre rythme</span>
          </div>

          <div className="yuding-footer__clean-lead">
            <h2>La suite de votre voyage commence ici.</h2>
            <p>Comparez les options qui vous conviennent et réservez chaque étape au même endroit.</p>
          </div>

            <Link prefetch={false} href="/planifier" className="yuding-footer__clean-cta">
            Planifier un voyage <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
          </Link>
        </div>

        <div className="yuding-footer__clean-links">
          <nav className="yuding-footer__clean-nav" aria-label="Navigation du pied de page">
            <span>Explorer</span>
            <ul>{exploreLinks.map((link) => <li key={link.href}><Link prefetch={false} href={link.href}>{link.label}</Link></li>)}</ul>
          </nav>

          <nav className="yuding-footer__clean-nav" aria-label="Votre espace">
            <span>Votre espace</span>
            <ul>
              <li><Link prefetch={false} href="/account">Mon compte</Link></li>
              <li><Link prefetch={false} href="/account/bookings">Réservations</Link></li>
              <li><Link prefetch={false} href="/account/reviews">Mes avis</Link></li>
            </ul>
          </nav>

          <div className="yuding-footer__clean-note">
            <span>Yuding</span>
            <p>Des départs simples. Des choix clairs.</p>
          </div>
        </div>

        <div className="yuding-footer__clean-bottom">
          <span>© {new Date().getFullYear()} Yuding</span>
          <span className="yuding-footer__clean-status"><i aria-hidden="true" /> La route est ouverte.</span>
          <div className="yuding-footer__clean-legal">
            <Link prefetch={false} href="/">Accueil</Link>
            <Link prefetch={false} href="/planifier">Planificateur</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
