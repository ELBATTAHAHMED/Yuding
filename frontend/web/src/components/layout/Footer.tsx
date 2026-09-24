'use client';

import Link from 'next/link';

const exploreLinks = [
  { href: '/hotels', label: 'Hébergements' },
  { href: '/flights', label: 'Vols' },
  { href: '/activities', label: 'Activités' },
  { href: '/transfers', label: 'Transferts' },
  { href: '/trains', label: 'Trains' },
];

export function Footer() {
  return (
    <footer className="yuding-footer">
      <div className="yuding-footer__inner">
        <div className="yuding-footer__grid">
          <div className="yuding-footer__brand">
            <Link href="/" aria-label="Yuding — accueil">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image/logodark.png" alt="Yuding" />
            </Link>
            <p>Des voyages qui vous ressemblent, authentiques et inspirants.</p>
          </div>

          <div>
            <h4>Explorer</h4>
            <ul>
              {exploreLinks.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h4>À propos</h4>
            <ul>
              <li>Voyages à votre rythme</li>
              <li>Offres de partenaires</li>
              <li>Destinations à découvrir</li>
            </ul>
          </div>

          <div className="yuding-footer__discover">
            <h4>Votre voyage commence ici</h4>
            <p>Choisissez une destination et trouvez le séjour, le trajet et les expériences qui vous ressemblent.</p>
            <Link href="/#home-search" className="yuding-footer__cta">Planifier mon voyage <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
          </div>
        </div>

        <div className="yuding-footer__bottom">
          <div className="yuding-footer__signature">
            <span aria-hidden="true" />
            <div>
              <i className="fas fa-mountain" aria-hidden="true" />
              <strong>© {new Date().getFullYear()} Yuding. Tous droits réservés.</strong>
            </div>
            <span aria-hidden="true" />
          </div>
        </div>
      </div>
    </footer>
  );
}
