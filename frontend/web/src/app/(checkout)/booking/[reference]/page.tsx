'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export default function BookingReferencePage() {
  const params = useParams();
  const reference = (params?.reference as string) || '';

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '75vh', padding: '3.5rem 1rem', background: 'var(--bg, #f4f6f6)' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
            <Link href="/" style={{ color: '#01796F', textDecoration: 'none' }}>
              Accueil
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <Link href="/account/bookings" style={{ color: '#01796F', textDecoration: 'none' }}>
              Réservations
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <span style={{ fontWeight: 600 }}>{reference}</span>
          </nav>

          {/* Dossier Card */}
          <div
            style={{
              background: 'var(--card, #fff)',
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.07)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.8rem',
                    background: '#e0f2f1',
                    color: '#004d40',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    marginBottom: '0.5rem',
                  }}
                >
                  Dossier de voyage
                </span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
                  Référence : {reference}
                </h1>
              </div>

              <div
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: '#e8f5e9',
                  color: '#2e7d32',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <i className="fas fa-check-circle" />
                Dossier Enregistré
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderRadius: '10px',
                background: 'var(--bg, #f9fbfb)',
                border: '1px solid rgba(1, 121, 111, 0.15)',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <i className="fas fa-info-circle" style={{ color: '#01796F', fontSize: '1.4rem', marginTop: '0.2rem' }} />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text, #001b1a)' }}>
                    Informations sur le suivi
                  </h3>
                  <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Le dossier portant la référence <strong>{reference}</strong> est associé à votre compte Yuding.
                    Les détails télégraphiques et les vouchers confirmés sont transmis par email et consultables dans votre récapitulatif de réservations.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                href="/account/bookings"
                className="btn-booking"
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '6px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <i className="fas fa-list" />
                Mes réservations
              </Link>

              <Link
                href="/"
                style={{
                  padding: '0.75rem 1.75rem',
                  borderRadius: '6px',
                  border: '1px solid #01796F',
                  color: '#01796F',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <i className="fas fa-home" />
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
