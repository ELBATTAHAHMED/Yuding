'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--footer-bg, #002220)',
        color: '#e0e0e0',
        padding: '3rem 1rem 1.5rem',
        marginTop: '4rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/image/logo1.png" alt="Yuding Logo" style={{ maxHeight: '45px', marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#b0bec5' }}>
              Votre plateforme intelligente de réservation de voyages : hébergements, vols, taxis, trains et activités partout dans le monde.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '2px solid #00796b', display: 'inline-block', paddingBottom: '0.25rem' }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', lineHeight: '2' }}>
              <li><Link href="/" style={{ color: '#b0bec5', textDecoration: 'none' }}>Accueil</Link></li>
              <li><Link href="/hotels" style={{ color: '#b0bec5', textDecoration: 'none' }}>Hébergements</Link></li>
              <li><Link href="/flights" style={{ color: '#b0bec5', textDecoration: 'none' }}>Vols</Link></li>
              <li><Link href="/transfers" style={{ color: '#b0bec5', textDecoration: 'none' }}>Taxi &amp; Trains</Link></li>
              <li><Link href="/activities" style={{ color: '#b0bec5', textDecoration: 'none' }}>Activités</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '2px solid #00796b', display: 'inline-block', paddingBottom: '0.25rem' }}>
              Destinations
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', lineHeight: '2' }}>
              <li><span style={{ color: '#b0bec5' }}>Marrakech, Maroc</span></li>
              <li><span style={{ color: '#b0bec5' }}>Chefchaouen, Maroc</span></li>
              <li><span style={{ color: '#b0bec5' }}>Dakhla, Maroc</span></li>
              <li><span style={{ color: '#b0bec5' }}>Paris, France</span></li>
              <li><span style={{ color: '#b0bec5' }}>New York, États-Unis</span></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '2px solid #00796b', display: 'inline-block', paddingBottom: '0.25rem' }}>
              Contact &amp; Sécurité
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#b0bec5', lineHeight: '1.8' }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem', color: '#4db6ac' }}></i>
              Paiements sécurisés &amp; Données chiffrées<br />
              <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#4db6ac' }}></i>
              support@yuding.travel<br />
              <i className="fas fa-phone" style={{ marginRight: '0.5rem', color: '#4db6ac' }}></i>
              +212 (0) 522 00 00 00
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#78909c',
          }}
        >
          &copy; {new Date().getFullYear()} YUDING V2. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};
