'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { paymentService } from '@/services/payment.service';
import { BookingPricingResponseDto } from '@/types/booking.types';
import { PaymentOrderResponseDto } from '@/types/payment.types';

interface PaymentFormProps {
  bookingReference: string;
  pricing: BookingPricingResponseDto;
  onPaymentSuccess?: (paymentRef: string) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingReference,
  pricing,
  onPaymentSuccess,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'card' | 'paypal'>('card');
  const [isFlipped, setIsFlipped] = useState(false);

  // Card Form State (Display & Simulation only — never raw transmitted to backend)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PaymentOrderResponseDto | null>(null);

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiry(raw);
  };

  // Format CVV 3 digits
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvv(raw);
  };

  // Initiate & Capture Payment (Simulated Card or PayPal Sandbox)
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Initiate order (server derives amount and currency)
      const order = await paymentService.initiatePaymentOrder(
        bookingReference,
        window.location.origin + `/booking/confirmation?reference=${bookingReference}`,
        window.location.origin + `/booking/${bookingReference}`
      );
      setPendingOrder(order);

      // If provider has an approval URL (e.g. PayPal sandbox redirect flow), offer redirect
      if (order.approvalUrl && activeTab === 'paypal') {
        window.open(order.approvalUrl, '_blank');
      }

      // 2. Capture payment
      const captureResult = await paymentService.capturePayment(bookingReference, {
        paymentReference: order.paymentReference,
        providerOrderId: order.providerOrderId,
      });

      if (captureResult.paymentStatus === 'SUCCEEDED') {
        if (onPaymentSuccess) {
          onPaymentSuccess(captureResult.paymentReference);
        } else {
          router.push(
            `/booking/confirmation?reference=${bookingReference}&payment=${captureResult.paymentReference}&amount=${captureResult.amount}&currency=${captureResult.currency}`
          );
        }
      } else {
        setError(captureResult.message || 'Le paiement a échoué. Veuillez réessayer.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err?.message || 'Erreur lors du traitement du paiement.');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedAmount = pricing.totalAmount != null
    ? new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: pricing.currency || 'EUR',
      }).format(pricing.totalAmount)
    : '—';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Authoritative Pricing Summary Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #01796F 0%, #004d40 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem 2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(1, 121, 111, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
            Montant Autoritaire Garanti
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{formattedAmount}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
            <i className="fas fa-shield-alt" />
            <span>Prix certifié par le serveur Yuding (autorité backend)</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
          <div>Fournisseur : <strong>{pricing.provider || 'Direct'}</strong></div>
          <div>Dossier : <strong>{bookingReference}</strong></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('card')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '12px',
            border: activeTab === 'card' ? '2px solid #01796F' : '1px solid #ddd',
            background: activeTab === 'card' ? 'rgba(1, 121, 111, 0.08)' : 'var(--card, #fff)',
            color: activeTab === 'card' ? '#01796F' : 'var(--text, #333)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s ease',
          }}
        >
          <i className="fas fa-credit-card" />
          Carte Bancaire (Sandbox)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '12px',
            border: activeTab === 'paypal' ? '2px solid #0070BA' : '1px solid #ddd',
            background: activeTab === 'paypal' ? 'rgba(0, 112, 186, 0.08)' : 'var(--card, #fff)',
            color: activeTab === 'paypal' ? '#0070BA' : 'var(--text, #333)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s ease',
          }}
        >
          <i className="fab fa-paypal" />
          PayPal Sandbox
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: '#ffebee',
            color: '#c62828',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <i className="fas fa-exclamation-triangle" />
          <span>{error}</span>
        </div>
      )}

      {/* 3D Animated Card Display */}
      {activeTab === 'card' && (
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '400px', height: '230px', perspective: '1000px' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Card Front */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #0a302d 0%, #01796F 50%, #02E0D5 100%)',
                  color: '#ffffff',
                  boxShadow: '0 15px 35px rgba(1, 121, 111, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* EMV Chip */}
                  <div
                    style={{
                      width: '45px',
                      height: '35px',
                      background: 'linear-gradient(135deg, #ffd700, #ffb300)',
                      borderRadius: '6px',
                      border: '1px solid #cca000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: '70%', height: '1px', background: '#997300' }} />
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px' }}>YUDING</span>
                </div>

                <div
                  style={{
                    fontSize: '1.35rem',
                    letterSpacing: '3px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Titulaire</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {cardHolder || 'NOM DU CLIENT'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Expire</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace' }}>
                      {expiry || 'MM/AA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Back */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #021817 0%, #062523 100%)',
                  color: '#ffffff',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                  paddingTop: '1.75rem',
                }}
              >
                <div style={{ width: '100%', height: '42px', background: '#000000', marginBottom: '1.25rem' }} />
                <div style={{ padding: '0 1.75rem' }}>
                  <div style={{ fontSize: '0.7rem', textAlign: 'right', marginBottom: '0.25rem', opacity: 0.8 }}>CVV</div>
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#000000',
                      height: '36px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      padding: '0 1rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '1rem',
                      letterSpacing: '2px',
                    }}
                  >
                    {cvv ? '•••' : '123'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '1rem', textAlign: 'center' }}>
                    Yuding Sandbox Payment Security • Aucun prélèvement réel
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handlePay}>
        {activeTab === 'card' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                Numéro de Carte
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                Nom sur la Carte
              </label>
              <input
                type="text"
                placeholder="JEAN DUPONT"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  Date d&apos;expiration
                </label>
                <input
                  type="text"
                  placeholder="MM/AA"
                  value={expiry}
                  onChange={handleExpiryChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  CVV / CVC
                </label>
                <input
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={handleCvvChange}
                  onFocus={() => setIsFlipped(true)}
                  onBlur={() => setIsFlipped(false)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '2rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', color: '#0070BA', marginBottom: '1rem' }}>
              <i className="fab fa-paypal" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Paiement Sécurisé via PayPal Sandbox
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
              Vous serez redirigé vers l&apos;environnement PayPal Sandbox pour confirmer la transaction en toute sécurité.
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <i className="fas fa-vial" style={{ marginRight: '0.4rem' }} />
              Sandbox v2 REST Checkout
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '2rem',
            width: '100%',
            padding: '1rem',
            borderRadius: '10px',
            background: activeTab === 'paypal' ? '#0070BA' : '#01796F',
            color: '#ffffff',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            transition: 'background 0.2s ease',
          }}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin" />
              <span>Traitement sécurisé en cours...</span>
            </>
          ) : (
            <>
              <i className="fas fa-lock" />
              <span>Payer {formattedAmount}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
