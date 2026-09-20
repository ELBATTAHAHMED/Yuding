'use client';

import React from 'react';
import Link from 'next/link';

export default function AccountFavoritesPage() {
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
          Mes Favoris
        </h1>
        <p style={{ color: '#666' }}>Retrouvez les hébergements, vols et activités que vous avez sauvegardés</p>
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
            background: 'rgba(225, 29, 72, 0.1)',
            color: '#e11d48',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem',
          }}
        >
          <i className="fas fa-heart" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text, #001b1a)' }}>
          Aucun favori enregistré
        </h2>

        <p style={{ color: '#666', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
          Explorez nos offres d&apos;hébergements, de séjours et d&apos;expériences pour constituer votre liste d&apos;envies de voyage.
        </p>

        <Link
          href="/hotels"
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
          <i className="fas fa-bed" />
          Découvrir les hébergements
        </Link>
      </div>
    </div>
  );
}
