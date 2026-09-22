'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { bookingService } from '@/services/booking.service';
import { BookingResponseDto } from '@/types/booking.types';

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('code') || '';
  const paymentRef = searchParams.get('payment');
  const total = searchParams.get('amount') || searchParams.get('total');
  const currency = searchParams.get('currency') || 'EUR';

  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [loading, setLoading] = useState(Boolean(reference));
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function verifyBookingStatus() {
      try {
        const data = await bookingService.getBookingByReference(reference);
        if (isMounted) {
          setBooking(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err?.message || 'Impossible de vérifier le statut du dossier.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyBookingStatus();

    return () => {
      isMounted = false;
    };
  }, [reference]);

  if (loading) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#01796F', marginBottom: '1rem' }} />
          <p style={{ color: '#666', fontWeight: 600 }}>Vérification du règlement auprès du serveur...</p>
        </div>
      </div>
    );
  }

  // Guard: If booking exists but status is NOT PAID, alert the user and guide to payment
  const isUnpaid = booking && booking.status !== 'PAID' && !paymentRef;

  if (isUnpaid) {
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
          <div style={{ color: '#e65100', fontSize: '4rem', marginBottom: '1.5rem' }}>
            <i className="fas fa-exclamation-triangle" />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text, #001b1a)' }}>
            Paiement en Attente
          </h1>

          <div
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#fff3e0',
              color: '#e65100',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
            }}
          >
            Statut du dossier : {booking.status}
          </div>

          <p style={{ fontSize: '1rem', color: '#555', lineHeight: '1.7', marginBottom: '2rem' }}>
            Le dossier portant la référence <strong>{reference}</strong> n&apos;a pas encore été réglé.
            Pour finaliser votre réservation et obtenir vos justificatifs, veuillez effectuer votre paiement sandbox sécurisé.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href={`/booking/${reference}/payment`}
              className="btn-booking"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-lock" />
              Procéder au Paiement
            </Link>

            <Link
              href="/account/bookings"
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '8px',
                border: '1px solid #01796F',
                color: '#01796F',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              Mes réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If no reference was provided at all
  if (!reference && !paymentRef) {
    return (
      <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div
          className="container"
          style={{
            maxWidth: '600px',
            background: 'var(--card, #fff)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ color: '#01796F', fontSize: '3rem', marginBottom: '1.5rem' }}>
            <i className="fas fa-info-circle" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>
            Aucun dossier sélectionné
          </h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Veuillez sélectionner une prestation de voyage et finaliser son règlement pour accéder à la confirmation.
          </p>
          <Link
            href="/"
            className="btn-booking"
            style={{ padding: '0.85rem 2rem', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
          >
            Retourner à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div
        className="container"
        style={{
          maxWidth: '680px',
          background: 'var(--card, #fff)',
          borderRadius: '20px',
          padding: '3rem 2.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ color: '#2e7d32', fontSize: '4.5rem', marginBottom: '1.5rem' }}>
          <i className="fas fa-check-circle"></i>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text, #001b1a)' }}>
          Paiement Sandbox Validé !
        </h1>

        <div
          style={{
            display: 'inline-block',
            padding: '0.4rem 1.25rem',
            backgroundColor: '#e8f5e9',
            color: '#1b5e20',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            letterSpacing: '0.5px',
          }}
        >
          Statut de la réservation : PAYÉ (PAID)
        </div>

        {reference && (
          <div
            style={{
              background: 'var(--bg, #f9fbfb)',
              borderRadius: '12px',
              border: '1px solid #e0f2f1',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              <span style={{ color: '#666' }}>Référence dossier</span>
              <strong style={{ color: '#01796F' }}>{reference}</strong>
            </div>

            {paymentRef && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                <span style={{ color: '#666' }}>Référence de règlement</span>
                <strong>{paymentRef}</strong>
              </div>
            )}

            {total && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: '#666' }}>Montant total réglé</span>
                <strong style={{ color: '#2e7d32' }}>{total} {currency}</strong>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            padding: '1rem',
            borderRadius: '10px',
            background: '#e0f2f1',
            color: '#004d40',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            marginBottom: '2rem',
            textAlign: 'left',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <i className="fas fa-shield-alt" style={{ fontSize: '1.2rem', marginTop: '0.1rem', color: '#01796F' }} />
          <div>
            <strong>Environnement PayPal Sandbox :</strong> Cette transaction a été enregistrée avec succès sous le statut <em>PAID</em>.
            Conformément aux règles de l&apos;environnement d&apos;essai Sandbox, aucun débit bancaire réel n&apos;a été effectué.
          </div>
        </div>

        <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: '1.6', marginBottom: '2.5rem' }}>
          Votre dossier est désormais confirmé au niveau du paiement. Vous pouvez retrouver l&apos;historique complet de votre réservation dans votre espace personnel.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            className="btn-booking"
            style={{ padding: '0.85rem 2rem', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
          >
            <i className="fas fa-home" style={{ marginRight: '0.5rem' }}></i>
            Retour à l&apos;accueil
          </Link>

          <Link
            href="/account/bookings"
            style={{
              padding: '0.85rem 2rem',
              borderRadius: '8px',
              border: '1px solid #01796F',
              color: '#01796F',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            <i className="fas fa-suitcase-rolling" style={{ marginRight: '0.5rem' }}></i>
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
