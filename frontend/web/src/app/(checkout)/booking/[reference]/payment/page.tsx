'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { bookingService } from '@/services/booking.service';
import { BookingPricingResponseDto } from '@/types/booking.types';

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const reference = (params?.reference as string) || '';

  const [pricing, setPricing] = useState<BookingPricingResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;

    let isMounted = true;

    async function loadPricing() {
      setIsLoading(true);
      setError(null);
      try {
        // First try to fetch existing pricing
        let p: BookingPricingResponseDto;
        try {
          p = await bookingService.getAuthoritativePricing(reference);
        } catch {
          // If not yet priced, initiate authoritative pricing calculation
          p = await bookingService.createAuthoritativePricing(reference);
        }

        if (isMounted) {
          setPricing(p);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Impossible de récupérer la tarification autoritaire du dossier.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      isMounted = false;
    };
  }, [reference]);

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '80vh', padding: '3.5rem 1rem', background: 'var(--bg, #f4f6f6)' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
            <Link href="/" style={{ color: '#01796F', textDecoration: 'none' }}>
              Accueil
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <Link href={`/booking/${reference}`} style={{ color: '#01796F', textDecoration: 'none' }}>
              Dossier {reference}
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <span style={{ fontWeight: 600 }}>Paiement Sécurisé</span>
          </nav>

          <div
            style={{
              background: 'var(--card, #fff)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.9rem',
                  background: '#e0f2f1',
                  color: '#004d40',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  marginBottom: '0.75rem',
                }}
              >
                Étape 2 / 2 — Règlement Sécurisé
              </span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
                Finaliser votre Réservation
              </h1>
              <p style={{ color: '#666', fontSize: '1rem', marginTop: '0.5rem' }}>
                Référence dossier : <strong>{reference}</strong>
              </p>
            </div>

            {isLoading && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#01796F', marginBottom: '1rem' }} />
                <p style={{ color: '#666' }}>Chargement de la tarification autoritaire du serveur...</p>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: '#ffebee',
                  color: '#c62828',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem', fontSize: '1.2rem' }} />
                <span>{error}</span>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => router.refresh()}
                    className="btn-connexion"
                    type="button"
                    style={{ background: '#01796F' }}
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            {!isLoading && !error && pricing && (
              <>
                {pricing.canProceedToPayment ? (
                  <PaymentForm bookingReference={reference} pricing={pricing} />
                ) : (
                  <div
                    style={{
                      padding: '2rem',
                      borderRadius: '12px',
                      background: '#fff8e1',
                      border: '1px solid #ffe082',
                      textAlign: 'center',
                      color: '#b78103',
                    }}
                  >
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '2.5rem', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Paiement Non Disponible
                    </h3>
                    <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem', color: '#555' }}>
                      {pricing.message || 'Ce dossier ne peut pas faire l&apos;objet d&apos;un règlement immédiat (tarification expirée ou produit non monétisé).'}
                    </p>
                    <Link
                      href={`/booking/${reference}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        background: '#01796F',
                        color: '#fff',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Retourner au dossier
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
