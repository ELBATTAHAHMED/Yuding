'use client';

import React from 'react';
import Link from 'next/link';

export default function AccountBookingsPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
          Mes Réservations
        </h1>
        <p style={{ color: '#666' }}>Consultez et suivez l&apos;état de vos réservations de voyage</p>
      </div>

      <div
        style={{
          background: 'var(--card, #fff)',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(1, 121, 111, 0.1)',
            color: '#01796F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem',
          }}
        >
          <i className="fas fa-suitcase-rolling" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text, #001b1a)' }}>
          Aucune réservation pour le moment
        </h2>

        <p style={{ color: '#666', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
          Vos billets d&apos;avion, réservations d&apos;hôtels, courses de taxi et billets d&apos;activités confirmés apparaîtront ici automatiquement.
        </p>

        <Link
          href="/"
          className="btn-booking"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.8rem 2rem',
            borderRadius: '6px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <i className="fas fa-search" />
          Explorer les destinations
        </Link>
      </div>
    </div>
  );
}
