'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { paymentService } from '@/services/payment.service';
import { bookingService } from '@/services/booking.service';
import { getBookingDossierPath } from '@/lib/confirmation-state';
import { BookingPricingResponseDto } from '@/types/booking.types';
import { PaymentOrderResponseDto } from '@/types/payment.types';
import { CardPreview } from './CardPreview';
import { PaymentBrandMark } from './PaymentBrandMark';

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
  const gridRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const asideContentRef = useRef<HTMLDivElement>(null);

  // Visa and Mastercard are visual demo card modes backed by MockPaymentProvider.
  // PayPal is the provider-backed Sandbox flow.
  const [selectedMethod, setSelectedMethod] = useState<'visa' | 'mastercard' | 'paypal'>('visa');
  const [isFlipped, setIsFlipped] = useState(false);
  const [demoCard, setDemoCard] = useState<DemoCardState>(EMPTY_DEMO_CARD_STATE);
  const [rememberMethod, setRememberMethod] = useState(false);

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PaymentOrderResponseDto | null>(null);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);
  const [webhookTimeout, setWebhookTimeout] = useState(false);

  useEffect(() => {
    const grid = gridRef.current;
    const aside = asideRef.current;
    const content = asideContentRef.current;
    if (!grid || !aside || !content) return;

    // The form can be shorter than the preview, so CSS sticky alone runs out of scroll range.
    let frame = 0;
    const syncAside = () => {
      const asideRect = aside.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      aside.style.minHeight = `${content.offsetHeight}px`;
      const pinned = window.innerWidth > 900 && asideRect.top < 124 && gridRect.bottom > 124;
      content.classList.toggle('is-pinned', pinned);
      content.style.left = pinned ? `${asideRect.left}px` : '';
      content.style.width = pinned ? `${asideRect.width}px` : '';
    };
    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncAside);
    };
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(content);
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    syncAside();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      aside.style.minHeight = '';
      content.classList.remove('is-pinned');
      content.style.left = '';
      content.style.width = '';
    };
  }, []);

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

  // Restore preferred payment method brand if saved in localStorage (brand only, never card data)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yuding_preferred_payment_method');
      if (saved === 'VISA') {
        setSelectedMethod('visa');
        setRememberMethod(true);
      } else if (saved === 'MASTERCARD') {
        setSelectedMethod('mastercard');
        setRememberMethod(true);
      }
    } catch {
      // Ignore localStorage read errors in restricted environments
    }
  }, []);

  const isCardMode = selectedMethod === 'visa' || selectedMethod === 'mastercard';

  // Handle Submission (Demo Card via MockPaymentProvider or PayPal Sandbox)
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Save or clear preferred payment method brand only (ZERO card data)
      if (typeof window !== 'undefined') {
        try {
          if (rememberMethod && isCardMode) {
            localStorage.setItem('yuding_preferred_payment_method', selectedMethod.toUpperCase());
          } else if (!rememberMethod) {
            localStorage.removeItem('yuding_preferred_payment_method');
          }
        } catch {
          // Ignore localStorage errors
        }
      }

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

      const paymentMode = isCardMode ? 'DEMO_CARD' : undefined;

      const order = await paymentService.initiatePaymentOrder(
        bookingReference,
        returnUrl,
        cancelUrl,
        createOrderIdempotencyKeyRef.current,
        paymentMode
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

  const clearDemoCard = () => {
    setDemoCard(EMPTY_DEMO_CARD_STATE);
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

  return (
    <div ref={gridRef} className="checkout-grid checkout-grid--payment">
      <section className="checkout-primary checkout-payment">
        <div className="checkout-section__heading"><span>02</span><div><h2>Moyen de paiement</h2><p>Sélectionnez une option pour régler le tarif confirmé.</p></div></div>

        <div className="checkout-payment__methods" role="group" aria-label="Moyen de paiement">
          <button type="button" className={`checkout-payment__method checkout-payment__method--visa${selectedMethod === 'visa' ? ' is-selected' : ''}`} aria-pressed={selectedMethod === 'visa'} onClick={() => selectPaymentMethod('visa')}><PaymentBrandMark brand="visa" /><span>Visa</span><small>Démo</small></button>
          <button type="button" className={`checkout-payment__method checkout-payment__method--mastercard${selectedMethod === 'mastercard' ? ' is-selected' : ''}`} aria-pressed={selectedMethod === 'mastercard'} onClick={() => selectPaymentMethod('mastercard')}><PaymentBrandMark brand="mastercard" /><span>Mastercard</span><small>Démo</small></button>
          <button type="button" className={`checkout-payment__method checkout-payment__method--paypal${selectedMethod === 'paypal' ? ' is-selected' : ''}`} aria-pressed={selectedMethod === 'paypal'} onClick={() => selectPaymentMethod('paypal')}><PaymentBrandMark brand="paypal" /><span>PayPal</span><small>Sandbox</small></button>
        </div>

        {error && <div className="checkout-notice checkout-notice--error" role="alert"><i className="fas fa-circle-exclamation" aria-hidden="true" />{error}</div>}

        <form onSubmit={handlePay} className="checkout-payment__form">
          {isCardMode ? <>
            <div className="checkout-payment__intro"><div><p className="checkout-kicker">MODE DÉMO</p><h3>Carte {selectedMethod === 'visa' ? 'Visa' : 'Mastercard'} de démonstration</h3><p>Cette simulation n'utilise aucune carte réelle.</p></div><span className="checkout-payment__tag">Mode démo</span></div>
            <div className="checkout-fields">
              <label>Nom du titulaire<input value={demoCard.holderName} onChange={(event) => setDemoCard((current) => ({ ...current, holderName: event.target.value }))} placeholder="VOTRE NOM" autoComplete="off" data-demo-card-field="holder" /></label>
              <label>Numéro de carte de démonstration<input value={demoCard.displayNumber} onChange={(event) => setDemoCard((current) => ({ ...current, displayNumber: formatDemoNumber(event.target.value) }))} placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="off" data-demo-card-field="number" /></label>
            </div>
            <div className="checkout-fields checkout-fields--two">
              <label>Date d'expiration<input value={demoCard.expiry} onChange={(event) => setDemoCard((current) => ({ ...current, expiry: formatDemoExpiry(event.target.value) }))} placeholder="MM/AA" inputMode="numeric" autoComplete="off" data-demo-card-field="expiry" /></label>
              <label>CVC / CVV<input type="password" value={demoCard.cvc} onChange={(event) => setDemoCard((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, '').slice(0, 3) }))} onFocus={() => setIsFlipped(true)} onBlur={() => setIsFlipped(false)} placeholder="•••" inputMode="numeric" maxLength={3} autoComplete="off" data-demo-card-field="cvc" /></label>
            </div>
            <label className="checkout-check"><input type="checkbox" checked={rememberMethod} onChange={(event) => setRememberMethod(event.target.checked)} />Mémoriser ce mode de paiement</label>
            <p className="checkout-payment__privacy"><i className="fas fa-shield-halved" aria-hidden="true" /> Zéro Stockage PAN / CVC. Les valeurs de démonstration restent uniquement dans cette page.</p>
          </> : <div className="checkout-payment__paypal-info"><PaymentBrandMark brand="paypal" /><div><p className="checkout-kicker">PAYPAL SANDBOX</p><h3>Règlement via PayPal</h3><p>Après avoir continué, vous confirmerez le montant de <strong>{formattedAmount}</strong> dans l'environnement de test PayPal.</p></div></div>}

          {waitingForWebhook ? <div className="checkout-notice" role="status"><i className={webhookTimeout ? 'fas fa-clock' : 'fas fa-spinner fa-spin'} aria-hidden="true" /><div><strong>{webhookTimeout ? 'Paiement en cours de vérification' : 'Confirmation du paiement en cours…'}</strong><p>{webhookTimeout ? 'Vous pouvez actualiser le statut ou retrouver le dossier dans vos réservations.' : 'Nous attendons la confirmation finale du prestataire.'}</p>{webhookTimeout && <div className="checkout-payment__links"><button type="button" onClick={() => window.location.reload()}>Actualiser</button><Link href="/account/bookings">Mes réservations</Link></div>}</div></div> : <div className="checkout-actions"><p>Le règlement est associé au dossier {bookingReference}.</p><button type="submit" className="checkout-button" disabled={isLoading}>{isLoading ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Traitement en cours...</> : isCardMode ? <>Payer {formattedAmount} en mode démo <i className="fas fa-arrow-right" aria-hidden="true" /></> : <>Payer avec PayPal ({formattedAmount}) <i className="fas fa-arrow-right" aria-hidden="true" /></>}</button>{isCardMode && <button type="button" className="checkout-text-button" onClick={clearDemoCard}>Réinitialiser les champs</button>}</div>}
        </form>
      </section>

      <aside ref={asideRef} className="checkout-aside" aria-label="Aperçu et montant du paiement"><div ref={asideContentRef} className="checkout-payment__aside-content">
        {isCardMode && <div className="checkout-payment__card-stage"><CardPreview isFlipped={isFlipped} brand={selectedMethod} demoCard={demoCard} onToggleFlip={() => setIsFlipped(!isFlipped)} /><p>Aperçu de la carte de démonstration</p></div>}
        <div className="checkout-summary"><p className="checkout-kicker">TARIF CONFIRMÉ</p><h2>Votre dossier</h2><p className="checkout-summary__reference">Référence {bookingReference}</p><dl className="checkout-summary__rows"><div><dt>Prestation</dt><dd>{pricing.productType || 'Voyage'}</dd></div><div><dt>Fournisseur</dt><dd>{pricing.provider || 'Intégration directe'}</dd></div>{formattedBase && <div><dt>Prix de base</dt><dd>{formattedBase}</dd></div>}{formattedTaxes && <div><dt>Taxes</dt><dd>{formattedTaxes}</dd></div>}{formattedFees && <div><dt>Frais</dt><dd>{formattedFees}</dd></div>}</dl><div className="checkout-summary__total"><span>Total à régler</span><strong>{formattedAmount}</strong></div><p className="checkout-summary__note">Montant calculé et confirmé par le serveur. Aucun détail de carte réelle n'est conservé par Yuding.</p>{pendingOrder && <p className="checkout-summary__reference">Paiement {pendingOrder.paymentReference}</p>}</div>
      </div></aside>
    </div>
  );
};
