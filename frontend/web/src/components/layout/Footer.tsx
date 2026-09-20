'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#002220] text-[#e0e0e0] pt-12 pb-6 px-4 mt-16 border-t border-white/10">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/logo1.png"
              alt="Yuding Logo"
              className="max-h-11 mb-4 object-contain"
            />
            <p className="text-sm leading-relaxed text-[#b0bec5]">
              Votre plateforme intelligente de réservation de voyages : hébergements, vols, taxis,
              trains et activités partout dans le monde.
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
                  Taxi &amp; Trains
                </Link>
              </li>
              <li>
                <Link href="/activities" className="hover:text-white transition-colors">
                  Activités
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
              Contact &amp; Sécurité
            </h4>
            <div className="text-sm text-[#b0bec5] space-y-2 leading-relaxed">
              <p className="flex items-center gap-2">
                <i className="fas fa-shield-alt text-[#4db6ac]" />
                <span>Paiements sécurisés &amp; Données chiffrées</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fas fa-envelope text-[#4db6ac]" />
                <span>support@yuding.travel</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fas fa-phone text-[#4db6ac]" />
                <span>+212 (0) 522 00 00 00</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-[#78909c]">
          &copy; {new Date().getFullYear()} YUDING V2. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};
