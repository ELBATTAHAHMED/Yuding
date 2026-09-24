'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Footer: React.FC = () => {
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <footer className={`yuding-footer ${isHome ? 'yuding-footer--home' : ''}`}>
      <div className="yuding-footer__inner">
        <div className="yuding-footer__grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/logo1.png"
              alt="Yuding Logo"
              className="max-h-11 mb-4 object-contain"
            />
            <p className="yuding-footer__copy">
              Yuding V2 est un projet de démonstration pour explorer les recherches de voyage, les prix et les disponibilités fournisseur.
            </p>
          </div>

          <div>
            <h4 className="text-white text-base font-bold mb-4 border-b-2 border-[#00796b] inline-block pb-1">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-[#b0bec5]">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/hotels" className="hover:text-white transition-colors">
                  Hébergements
                </Link>
              </li>
              <li>
                <Link href="/flights" className="hover:text-white transition-colors">
                  Vols
                </Link>
              </li>
              <li>
                <Link href="/transfers" className="hover:text-white transition-colors">
                  Transferts
                </Link>
              </li>
              <li>
                <Link href="/activities" className="hover:text-white transition-colors">
                  Activités
                </Link>
              </li>
              <li>
                <Link href="/trains" className="hover:text-white transition-colors">
                  Trains
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-base font-bold mb-4 border-b-2 border-[#00796b] inline-block pb-1">
              Destinations
            </h4>
            <ul className="space-y-2 text-sm text-[#b0bec5]">
              <li>Marrakech, Maroc</li>
              <li>Chefchaouen, Maroc</li>
              <li>Dakhla, Maroc</li>
              <li>Paris, France</li>
              <li>New York, États-Unis</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-base font-bold mb-4 border-b-2 border-[#00796b] inline-block pb-1">
              À propos du projet
            </h4>
            <div className="yuding-footer__project">
              <p className="flex items-center gap-2">
                <i className="fas fa-flask text-[#4db6ac]" />
                <span>Plateforme de démonstration technique.</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fas fa-satellite-dish text-[#4db6ac]" />
                <span>Données affichées selon la disponibilité des fournisseurs.</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fas fa-info-circle text-[#4db6ac]" />
                <span>Les paiements ne sont pas activés dans cette démonstration.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="yuding-footer__rights">
          &copy; {new Date().getFullYear()} YUDING V2 — Projet de démonstration.
        </div>
      </div>
    </footer>
  );
};
