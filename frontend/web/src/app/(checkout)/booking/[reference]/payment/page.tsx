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
        // First try to fetch existing pricing quote
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
      <div style={{ minHeight: '85vh', padding: '2.5rem 1rem 4rem', background: 'var(--bg, #f4f6f6)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          {/* Top Bar: Breadcrumb, Session Badge & Retour Action */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '0.85rem',
              }}
            >
              <nav style={{ fontSize: '0.88rem', color: '#64748b' }}>
                <Link href="/" style={{ color: '#01796F', textDecoration: 'none', fontWeight: 500 }}>
                  Accueil
                </Link>
                <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>/</span>
                <Link href={`/booking/${reference}`} style={{ color: '#01796F', textDecoration: 'none', fontWeight: 500 }}>
                  Dossier {reference}
                </Link>
                <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>/</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Paiement Sécurisé</span>
              </nav>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#0f766e',
                  background: '#ccfbf1',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                }}
              >
                <i className="fas fa-lock" />
                <span>Session de paiement chiffrée</span>
              </div>
            </div>

            {/* Clear, accessible Retour action using the canonical booking route */}
            <div>
              <Link
                href={`/booking/${reference}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '0.35rem 0',
                  transition: 'color 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#01796F';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <i className="fas fa-arrow-left text-xs" />
                <span>Retour au dossier</span>
              </Link>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '4rem 2rem',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
              }}
            >
              <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: '#01796F', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Établissement du tarif autoritaire...
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Connexion sécurisée aux services de réservation Yuding V2.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                border: '1px solid #fecaca',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                <i className="fas fa-triangle-exclamation" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
                Impossible de charger le dossier
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                {error}
              </p>
              <button
                onClick={() => router.refresh()}
                type="button"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  background: '#01796F',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                <i className="fas fa-rotate-right" style={{ marginRight: '0.5rem' }} />
                Réessayer
              </button>
            </div>
          )}

          {/* Main Content: Render PaymentForm if Authoritative Pricing is Ready */}
          {!isLoading && !error && pricing && (
            <>
              {pricing.canProceedToPayment ? (
                <PaymentForm bookingReference={reference} pricing={pricing} />
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                    border: '1px solid #fed7aa',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#ffedd5',
                      color: '#ea580c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      margin: '0 auto 1.25rem',
                    }}
                  >
                    <i className="fas fa-triangle-exclamation" />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.5rem' }}>
                    Paiement en Ligne Non Disponible
                  </h3>
                  <p style={{ maxWidth: '520px', margin: '0 auto 1.75rem', color: '#64748b', fontSize: '0.95rem' }}>
                    {pricing.message ||
                      'Cette prestation ne peut pas faire l’objet d’un règlement en ligne immédiat (tarif non monétisé ou devis expiré).'}
                  </p>
                  <Link
                    href={`/booking/${reference}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem 1.6rem',
                      borderRadius: '10px',
                      background: '#01796F',
                      color: '#ffffff',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(1, 121, 111, 0.25)',
                    }}
                  >
                    <i className="fas fa-arrow-left" />
                    <span>Retourner aux détails du dossier</span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
