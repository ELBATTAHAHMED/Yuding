'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('reference') || searchParams.get('code') || 'YUD-CONFIRMED';
  const paymentRef = searchParams.get('payment');
  const id = searchParams.get('id');
  const total = searchParams.get('amount') || searchParams.get('total');
  const currency = searchParams.get('currency') || 'EUR';

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div
        className="container"
        style={{
          maxWidth: '650px',
          background: 'var(--card, #fff)',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ color: '#2e7d32', fontSize: '4.5rem', marginBottom: '1.5rem' }}>
          <i className="fas fa-check-circle"></i>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text, #001b1a)' }}>
          Réservation Confirmée !
        </h1>

        <div
          style={{
            display: 'inline-block',
            padding: '0.5rem 1.5rem',
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: '1rem',
            letterSpacing: '1px',
          }}
        >
          Numéro de confirmation : {code}
        </div>

        {paymentRef && (
          <div style={{ marginBottom: '1rem', color: '#004d40', fontWeight: 600, fontSize: '0.95rem' }}>
            <i className="fas fa-receipt" style={{ marginRight: '0.4rem' }} />
            Règlement validé : <strong>{paymentRef}</strong> {total ? `(${total} ${currency})` : ''}
          </div>
        )}

        {id && (
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Dossier n° <strong>#{id}</strong> {total && !paymentRef ? `— Total réglé : ${total} ${currency}` : ''}
          </p>
        )}

        <p style={{ fontSize: '1.05rem', color: '#555', lineHeight: '1.7', marginBottom: '1.5rem' }}>
          Félicitations ! Votre réservation a été effectuée avec succès. Votre paiement a été validé et vous recevrez sous quelques instants un email récapitulatif avec l&apos;ensemble des billets et vouchers.
        </p>

        <p style={{ fontSize: '1rem', color: '#555', lineHeight: '1.7', marginBottom: '2.5rem' }}>
          Nous vous remercions pour votre confiance et nous réjouissons de vous accompagner lors de votre voyage avec <strong>Yuding</strong>.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            className="btn-booking"
            style={{ padding: '0.85rem 2rem', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
          >
            <i className="fas fa-home" style={{ marginRight: '0.5rem' }}></i>
            Retour à l&apos;accueil
          </Link>

          <Link
            href="/account"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '6px',
              border: '1px solid #01796F',
              color: '#01796F',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>
            Voir mes réservations
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00796b' }}></i>
        </div>
      }
    >
      <BookingConfirmationContent />
    </Suspense>
  );
}
