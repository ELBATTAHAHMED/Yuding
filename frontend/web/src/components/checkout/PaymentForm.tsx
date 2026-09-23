'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { paymentService } from '@/services/payment.service';
import { bookingService } from '@/services/booking.service';
import { getBookingDossierPath } from '@/lib/confirmation-state';
import { BookingPricingResponseDto } from '@/types/booking.types';
import { PaymentOrderResponseDto } from '@/types/payment.types';
import { CardPreview } from './CardPreview';

interface PaymentFormProps {
  bookingReference: string;
  pricing: BookingPricingResponseDto;
  onPaymentSuccess?: (paymentRef: string) => void;
}

/**
 * Deliberately browser-memory-only state for the visual card simulator.
 * It is not a payment credential model and must never cross the component boundary
 * into API clients, storage, URLs, logging, or analytics.
 */
interface DemoCardState {
  holderName: string;
  displayNumber: string;
  expiry: string;
  cvc: string;
}

const EMPTY_DEMO_CARD_STATE: DemoCardState = {
  holderName: '',
  displayNumber: '',
  expiry: '',
  cvc: '',
};

export const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingReference,
  pricing,
  onPaymentSuccess,
}) => {
  const router = useRouter();

  // Visa and Mastercard are local-only visual simulators. PayPal is the only provider flow.
  const [selectedMethod, setSelectedMethod] = useState<'visa' | 'mastercard' | 'paypal'>('paypal');
  const [isFlipped, setIsFlipped] = useState(false);
  const [demoCard, setDemoCard] = useState<DemoCardState>(EMPTY_DEMO_CARD_STATE);
  const [demoSimulationComplete, setDemoSimulationComplete] = useState(false);

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PaymentOrderResponseDto | null>(null);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);
  const [webhookTimeout, setWebhookTimeout] = useState(false);

  // Stable idempotency keys per user attempt
  const createOrderIdempotencyKeyRef = useRef<string | null>(null);
  const captureIdempotencyKeyRef = useRef<string | null>(null);

  // Format authoritative total amount
  const formattedAmount = pricing.totalAmount != null
    ? new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: pricing.currency || 'EUR',
      }).format(pricing.totalAmount)
    : '—';

  // Format base / taxes / fee breakdown if available
  const formattedBase = pricing.baseAmount != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: pricing.currency || 'EUR' }).format(pricing.baseAmount)
    : null;
  const formattedTaxes = pricing.taxAmount != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: pricing.currency || 'EUR' }).format(pricing.taxAmount)
    : null;
  const formattedFees = pricing.feeAmount != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: pricing.currency || 'EUR' }).format(pricing.feeAmount)
    : null;

  // Handle Submission (Card or PayPal Sandbox)
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Initiate order (server derives authoritative amount and currency)
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${getBookingDossierPath(bookingReference)}`
        : undefined;
      const cancelUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/booking/${bookingReference}`
        : undefined;

      if (!createOrderIdempotencyKeyRef.current) {
        createOrderIdempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      const order = await paymentService.initiatePaymentOrder(
        bookingReference,
        returnUrl,
        cancelUrl,
        createOrderIdempotencyKeyRef.current
      );
      setPendingOrder(order);

      // If provider provides an approval URL (e.g. PayPal sandbox popup/redirect), open it
      if (order.approvalUrl && selectedMethod === 'paypal') {
        window.open(order.approvalUrl, '_blank');
      }

      // 2. Capture payment
      if (!captureIdempotencyKeyRef.current) {
        captureIdempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-cap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      const captureResult = await paymentService.capturePayment(
        bookingReference,
        {
          paymentReference: order.paymentReference,
          providerOrderId: order.providerOrderId,
        },
        captureIdempotencyKeyRef.current
      );

      if (captureResult.paymentStatus === 'SUCCEEDED') {
        if (onPaymentSuccess) {
          onPaymentSuccess(captureResult.paymentReference);
        } else {
          router.push(getBookingDossierPath(bookingReference));
        }
      } else if (captureResult.paymentStatus === 'AWAITING_WEBHOOK') {
        setWaitingForWebhook(true);
        // Bounded polling for webhook-confirmed PAID status (15 attempts x 2s = 30s)
        let confirmed = false;
        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const currentConfirmation = await bookingService.getConfirmation(bookingReference);
            if (currentConfirmation.confirmationState === 'PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION'
              || currentConfirmation.confirmationState === 'PENDING_PROVIDER_CONFIRMATION'
              || currentConfirmation.confirmationState === 'CONFIRMED') {
              confirmed = true;
              break;
            }
          } catch (pollErr) {
            console.warn('Polling check error:', pollErr);
          }
        }

        if (confirmed) {
          if (onPaymentSuccess) {
            onPaymentSuccess(captureResult.paymentReference);
          } else {
            router.push(getBookingDossierPath(bookingReference));
          }
        } else {
          setWebhookTimeout(true);
        }
      } else {
        setError(captureResult.message || 'Le paiement a échoué. Veuillez vérifier vos coordonnées et réessayer.');
      }
    } catch (err: any) {
      console.error('Payment execution error:', err);
      setError(err?.message || 'Erreur lors du traitement sécurisé du paiement.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCardMode = selectedMethod === 'visa' || selectedMethod === 'mastercard';

  const clearDemoCard = () => {
    setDemoCard(EMPTY_DEMO_CARD_STATE);
    setDemoSimulationComplete(false);
    setIsFlipped(false);
  };

  const selectPaymentMethod = (method: 'visa' | 'mastercard' | 'paypal') => {
    // A method switch is a hard boundary for all locally simulated card-like values.
    clearDemoCard();
    setError(null);
    setSelectedMethod(method);
  };

  const formatDemoNumber = (value: string) =>
    value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatDemoExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const handleDemoSimulation = (event: React.FormEvent) => {
    event.preventDefault();
    // Intentionally local-only: no API client, provider, persistence, or telemetry call.
    setDemoSimulationComplete(true);
    setIsFlipped(false);
  };

  return (
    <div
      style={{
        borderRadius: '24px',
        background: 'var(--card, #ffffff)',
        boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* ==================== 2-COLUMN SPLIT PANEL ==================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          minHeight: '520px',
        }}
      >
        {/* ==================== LEFT PANE: CARD STAGE & ORDER SUMMARY ==================== */}
        <div
          style={{
            padding: '2.5rem 2rem',
            background: 'linear-gradient(165deg, #f8fafc 0%, #edf4f4 50%, #e0eceb 100%)',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '2rem',
            position: 'relative',
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '280px',
              height: '180px',
              background: 'radial-gradient(circle, rgba(1, 121, 111, 0.09) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div>
            {/* Header Tag */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#01796F',
                  background: 'rgba(1, 121, 111, 0.1)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                }}
              >
                <i className="fas fa-shield-halved" />
                Aperçu Carte & Dossier
              </span>

              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                Réf: <strong style={{ color: '#001b1a' }}>{bookingReference}</strong>
              </span>
            </div>

            {/* 3D Interactive Card Preview (Phase 39: Permanently masked decorative artwork) */}
            <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
              <CardPreview
                isFlipped={isFlipped}
                brand={selectedMethod === 'mastercard' ? 'mastercard' : 'visa'}
                demoCard={isCardMode ? demoCard : undefined}
                onToggleFlip={() => setIsFlipped(!isFlipped)}
              />
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '0.65rem',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <i className="fas fa-arrows-rotate text-xs" />
                <span>Cliquez sur la carte pour la retourner</span>
              </div>
            </div>
          </div>

          {/* Authoritative Order Summary Box (Inspired by Reference) */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 8px 24px -10px rgba(0, 27, 26, 0.08)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#64748b',
                }}
              >
                Récapitulatif Dossier
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.7rem',
                  color: '#01796F',
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-check-circle" />
                Tarif serveur garanti
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Prestation {pricing.productType || 'Voyage'} :</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {formattedBase || formattedAmount}
                </span>
              </div>

              {formattedTaxes && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Taxes & redevances :</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formattedTaxes}</span>
                </div>
              )}

              {formattedFees && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Frais de gestion :</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formattedFees}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Fournisseur vérifié :</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{pricing.provider || 'Intégration directe'}</span>
              </div>
            </div>

            {/* Total Authoritative Amount */}
            <div
              style={{
                marginTop: '0.9rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Total dû aujourd&apos;hui</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>TVA & taxes incluses</div>
              </div>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#01796F',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.5px',
                }}
              >
                {formattedAmount}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT PANE: PAYMENT DETAILS FORM ==================== */}
        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Form Title & Subtitle */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h2
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: 'var(--text, #001b1a)',
                  marginBottom: '0.35rem',
                  letterSpacing: '-0.5px',
                }}
              >
                Moyen de Règlement
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Sélectionnez votre moyen de paiement et renseignez vos informations sécurisées.
              </p>
            </div>

            {/* Payment Method Selector (Visa / Mastercard / PayPal Sandbox) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.75rem',
              }}
            >
              {/* Visa Option */}
              <button
                type="button"
                onClick={() => selectPaymentMethod('visa')}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '12px',
                  border: selectedMethod === 'visa' ? '2px solid #01796F' : '1px solid #e2e8f0',
                  background: selectedMethod === 'visa' ? 'rgba(1, 121, 111, 0.08)' : '#ffffff',
                  color: selectedMethod === 'visa' ? '#01796F' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedMethod === 'visa' ? '0 4px 12px rgba(1, 121, 111, 0.15)' : 'none',
                }}
              >
                <div style={{ height: '22px', display: 'flex', alignItems: 'center' }}>
                  <svg width="42" height="15" viewBox="0 0 54 20" fill="none" aria-label="Visa">
                    <path
                      d="M21.2 1.2L16.2 18.8H11.5L7.0 5.2C6.7 4.1 6.5 3.7 5.7 3.2C4.3 2.5 2.0 1.8 0.1 1.4L0.2 1.2H8.3C9.4 1.2 10.3 1.9 10.6 3.2L12.6 14.1L17.2 1.2H21.2ZM39.6 13.2C39.6 8.5 33.1 8.2 33.2 5.9C33.2 5.2 33.9 4.4 35.3 4.2C36.0 4.1 38.0 4.0 40.0 5.0L40.8 1.4C39.7 1.0 38.3 0.6 36.6 0.6C32.1 0.6 28.9 3.0 28.9 6.5C28.8 9.1 31.1 10.5 32.8 11.4C34.6 12.3 35.2 12.9 35.2 13.7C35.2 14.9 33.7 15.4 32.4 15.4C30.4 15.4 29.2 14.8 28.3 14.4L27.4 18.2C28.5 18.7 30.3 19.1 32.2 19.1C36.9 19.1 40.0 16.8 40.0 13.2M51.9 18.8H56L52.4 1.2H48.6C47.7 1.2 47.0 1.7 46.7 2.4L39.8 18.8H44.6L45.5 16.2H51.4L51.9 18.8ZM46.9 12.5L49.3 5.8L50.7 12.5H46.9ZM27.9 1.2L24.2 18.8H19.7L23.4 1.2H27.9Z"
                      fill={selectedMethod === 'visa' ? '#01796F' : '#1e293b'}
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Visa</span>
              </button>

              {/* Mastercard Option */}
              <button
                type="button"
                onClick={() => selectPaymentMethod('mastercard')}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '12px',
                  border: selectedMethod === 'mastercard' ? '2px solid #005951' : '1px solid #e2e8f0',
                  background: selectedMethod === 'mastercard' ? 'rgba(0, 89, 81, 0.08)' : '#ffffff',
                  color: selectedMethod === 'mastercard' ? '#005951' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedMethod === 'mastercard' ? '0 4px 12px rgba(0, 89, 81, 0.15)' : 'none',
                }}
              >
                <div style={{ height: '22px', display: 'flex', alignItems: 'center' }}>
                  <svg width="34" height="22" viewBox="0 0 48 30" fill="none" aria-label="Mastercard">
                    <circle cx="17" cy="15" r="14" fill="#EB001B" />
                    <circle cx="31" cy="15" r="14" fill="#F79E1B" />
                    <path
                      d="M24 4.5A13.9 13.9 0 0 1 29.8 15 13.9 13.9 0 0 1 24 25.5 13.9 13.9 0 0 1 18.2 15 13.9 13.9 0 0 1 24 4.5Z"
                      fill="#FF5F00"
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Mastercard</span>
              </button>

              {/* PayPal Sandbox Option */}
              <button
                type="button"
                onClick={() => selectPaymentMethod('paypal')}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '12px',
                  border: selectedMethod === 'paypal' ? '2px solid #0070BA' : '1px solid #e2e8f0',
                  background: selectedMethod === 'paypal' ? 'rgba(0, 112, 186, 0.08)' : '#ffffff',
                  color: selectedMethod === 'paypal' ? '#0070BA' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedMethod === 'paypal' ? '0 4px 12px rgba(0, 112, 186, 0.15)' : 'none',
                }}
              >
                <div style={{ height: '22px', display: 'flex', alignItems: 'center', fontSize: '1.25rem', color: '#0070BA' }}>
                  <i className="fab fa-paypal" />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>PayPal</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                style={{
                  padding: '0.9rem 1.2rem',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  marginBottom: '1.5rem',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <i className="fas fa-circle-exclamation" style={{ fontSize: '1.1rem', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isCardMode ? handleDemoSimulation : handlePay}>
              {isCardMode ? (
                /* Browser-memory-only visual simulator. It never invokes a payment API. */
                <div
                  style={{
                    padding: '1.35rem',
                    borderRadius: '14px',
                    background: 'linear-gradient(145deg, #f8fafc 0%, #f0fdfa 100%)',
                    border: '1px solid #cce5e1',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      marginBottom: '1.15rem',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 750, color: '#0f172a', margin: 0 }}>
                        Carte {selectedMethod === 'visa' ? 'Visa' : 'Mastercard'} de démonstration
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0', lineHeight: 1.45 }}>
                        Animez l&apos;aperçu de carte localement, sans transaction.
                      </p>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.7rem',
                        borderRadius: '999px',
                        background: '#dff7f2',
                        color: '#00685f',
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <i className="fas fa-flask" /> Mode démo
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>
                      Nom du titulaire
                      <input
                        value={demoCard.holderName}
                        onChange={(event) => setDemoCard((current) => ({ ...current, holderName: event.target.value }))}
                        placeholder="VOTRE NOM"
                        autoComplete="off"
                        data-demo-card-field="holder"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem 0.85rem', color: 'var(--text, #0f172a)', background: 'var(--card, #ffffff)', fontSize: '0.95rem' }}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>
                      Numéro de carte de démonstration
                      <input
                        value={demoCard.displayNumber}
                        onChange={(event) => setDemoCard((current) => ({ ...current, displayNumber: formatDemoNumber(event.target.value) }))}
                        placeholder="1234 5678 9012 3456"
                        inputMode="numeric"
                        autoComplete="off"
                        data-demo-card-field="number"
                        style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem 0.85rem', color: 'var(--text, #0f172a)', background: 'var(--card, #ffffff)', fontSize: '0.95rem', letterSpacing: '0.08em' }}
                      />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.8rem' }}>
                      <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>
                        Date d&apos;expiration
                        <input
                          value={demoCard.expiry}
                          onChange={(event) => setDemoCard((current) => ({ ...current, expiry: formatDemoExpiry(event.target.value) }))}
                          placeholder="MM/AA"
                          inputMode="numeric"
                          autoComplete="off"
                          data-demo-card-field="expiry"
                          style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem 0.85rem', color: 'var(--text, #0f172a)', background: 'var(--card, #ffffff)', fontSize: '0.95rem' }}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '0.4rem', color: '#334155', fontSize: '0.82rem', fontWeight: 700 }}>
                        CVC / CVV
                        <input
                          value={demoCard.cvc}
                          onChange={(event) => setDemoCard((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          placeholder="•••"
                          inputMode="numeric"
                          autoComplete="off"
                          data-demo-card-field="cvc"
                          style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem 0.85rem', color: 'var(--text, #0f172a)', background: 'var(--card, #ffffff)', fontSize: '0.95rem', letterSpacing: '0.12em' }}
                        />
                      </label>
                    </div>
                  </div>

                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#52716d', fontSize: '0.78rem', lineHeight: 1.45, margin: '1rem 0 0' }}>
                    <i className="fas fa-shield-halved" />
                    Simulation visuelle uniquement — aucune donnée bancaire n&apos;est transmise.
                  </p>
                </div>
              ) : (
                /* PayPal Sandbox View */
                <div
                  style={{
                    padding: '2rem 1.5rem',
                    borderRadius: '14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '3rem', color: '#0070BA', marginBottom: '0.75rem' }}>
                    <i className="fab fa-paypal" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                    Règlement via PayPal Sandbox
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                    Vous allez être connecté à l&apos;interface PayPal Sandbox pour approuver le montant certifié de{' '}
                    <strong>{formattedAmount}</strong>.
                  </p>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-vial text-xs" />
                    Environnement PayPal v2 Sandbox Actif
                  </span>
                </div>
              )}

              {/* Primary Pay Action CTA or Webhook Confirmation Pending View */}
              {waitingForWebhook ? (
                <div
                  style={{
                    marginTop: '1.75rem',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  {!webhookTimeout ? (
                    <>
                      <div style={{ color: '#01796F', fontSize: '2rem', marginBottom: '0.75rem' }}>
                        <i className="fas fa-spinner fa-spin" />
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                        Confirmation du paiement en cours…
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                        Votre règlement a été soumis avec succès. Nous attendons la confirmation finale sécurisée du webhook pour valider votre réservation.
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ color: '#f59e0b', fontSize: '2rem', marginBottom: '0.75rem' }}>
                        <i className="fas fa-clock" />
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                        Le paiement est en cours de vérification
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                        La confirmation finale du prestataire est en attente. Vous pouvez actualiser la vérification ou retrouver votre dossier dans vos réservations.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="btn-booking"
                          style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#01796F',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <i className="fas fa-sync-alt" /> Actualiser
                        </button>
                        <Link
                          href="/account/bookings"
                          style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          Mes réservations
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {isCardMode && demoSimulationComplete && (
                    <div
                      role="status"
                      style={{
                        marginTop: '1.25rem',
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#047857',
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                      }}
                    >
                      <i className="fas fa-circle-check" />
                      Simulation terminée — aucun paiement n&apos;a été effectué.
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!isCardMode && isLoading}
                    style={{
                      marginTop: '1.25rem',
                      width: '100%',
                      padding: '1rem 1.5rem',
                      borderRadius: '12px',
                      background: isCardMode
                        ? 'linear-gradient(135deg, #01796F 0%, #005951 100%)'
                        : 'linear-gradient(135deg, #0070BA 0%, #003087 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      cursor: !isCardMode && isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      boxShadow: isCardMode
                        ? '0 8px 20px -4px rgba(1, 121, 111, 0.35)'
                        : '0 8px 20px -4px rgba(0, 112, 186, 0.35)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(event) => {
                      if (isCardMode || !isLoading) event.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {isCardMode ? (
                      <>
                        <i className="fas fa-wand-magic-sparkles" />
                        <span>{demoSimulationComplete ? 'Rejouer l’animation' : 'Tester l’animation'}</span>
                      </>
                    ) : isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin" />
                        <span>Traitement sécurisé en cours...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-lock" />
                        <span>Payer avec PayPal ({formattedAmount})</span>
                        <i className="fas fa-arrow-right" style={{ fontSize: '0.9rem', marginLeft: '0.25rem' }} />
                      </>
                    )}
                  </button>
                  {isCardMode && demoSimulationComplete && (
                    <button
                      type="button"
                      onClick={clearDemoCard}
                      style={{
                        width: '100%',
                        marginTop: '0.7rem',
                        padding: '0.65rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: 'transparent',
                        color: '#475569',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Réinitialiser la démo
                    </button>
                  )}
                </>
              )}
            </form>
          </div>

          {/* Security & Assurance Row (Phase 39 Truthful Non-Custodial Assurances) */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.25rem',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-shield-alt text-[#01796F]" />
              <span>Paiement Orchestré par Prestataire Agréé</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-lock text-[#01796F]" />
              <span>Chiffrement TLS 256-bit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="fas fa-circle-check text-[#01796F]" />
              <span>Zéro Stockage PAN / CVC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
