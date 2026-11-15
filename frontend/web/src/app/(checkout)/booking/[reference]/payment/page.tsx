'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { PriceChangeModal } from '@/components/checkout/PriceChangeModal';
import { bookingService } from '@/services/booking.service';
import { preparePayment, priceRevalidatedBooking, type PaymentReadiness } from '@/lib/payment-readiness';
import type { BookingPricingResponseDto, BookingRevalidationResponseDto } from '@/types/booking.types';

export default function BookingPaymentPage() {
  const params = useParams();
  const reference = (params?.reference as string) || '';
  const [pricing, setPricing] = useState<BookingPricingResponseDto | null>(null);
  const [priceChange, setPriceChange] = useState<BookingRevalidationResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [bookingReturnPath, setBookingReturnPath] = useState<string | null>(null);
  const inFlight = useRef<{ reference: string; retry: number; promise: Promise<PaymentReadiness> } | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`yuding_booking_return_${reference}`);
      if (saved) {
        const destination = new URL(saved, window.location.origin);
        if (destination.origin === window.location.origin && destination.pathname === '/booking') {
          const selectionRef = destination.searchParams.get('selectionRef') || destination.searchParams.get('offerId') || destination.searchParams.get('serviceId');
          if (selectionRef) sessionStorage.setItem(`yuding_booking_draft_${selectionRef}`, reference);
          destination.searchParams.set('draftReference', reference);
          setBookingReturnPath(destination.pathname + destination.search);
        }
      }
    } catch { /* Direct payment links still return to their dossier. */ }
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setUnavailable(null);
    setPriceChange(null);
    setPricing(null);

    // React StrictMode remounts effects in development. Share this payment preparation
    // so it never triggers two live provider revalidations for one visit.
    if (!inFlight.current || inFlight.current.reference !== reference || inFlight.current.retry !== retry) {
      inFlight.current = { reference, retry, promise: preparePayment(reference) };
    }
    inFlight.current.promise.then((result) => {
      if (!isMounted) return;
      if (result.kind === 'ready') setPricing(result.pricing);
      else if (result.kind === 'price_changed') setPriceChange(result.revalidation);
      else setUnavailable(result.message);
    }).catch(() => {
      if (isMounted) setError('Impossible de vérifier le tarif pour le moment. Veuillez réessayer.');
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [reference, retry]);

  const acceptPriceChange = async () => {
    if (!priceChange || isAccepting) return;
    setIsAccepting(true);
    setError(null);
    try {
      await bookingService.acceptPriceChange(reference);
      const result = await priceRevalidatedBooking(reference);
      setPriceChange(null);
      if (result.kind === 'ready') setPricing(result.pricing);
      else if (result.kind === 'unavailable') setUnavailable(result.message);
    } catch {
      setPriceChange(null);
      setError('Le tarif a expiré pendant la confirmation. Relancez la vérification.');
    } finally {
      setIsAccepting(false);
    }
  };

  const dossierPath = `/bookings/${encodeURIComponent(reference)}`;
  const backPath = bookingReturnPath || dossierPath;
  return <ProtectedRoute><div className="checkout-page">
    <CheckoutSteps current="payment" bookingHref={backPath} />
    <header className="checkout-heading">
      <div><p className="checkout-kicker">PAIEMENT</p><h1>Régler votre réservation</h1><p>Choisissez votre moyen de paiement. Le montant affiché provient du serveur.</p></div>
      <span className="checkout-heading__context"><i className="fas fa-lock" aria-hidden="true" /> Dossier {reference}</span>
    </header>
    <Link className="checkout-back" href={backPath}><i className="fas fa-arrow-left" aria-hidden="true" /> {bookingReturnPath ? 'Retour à la réservation' : 'Voir le dossier'}</Link>

    {isLoading && <div className="checkout-state" role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" /><div><h2>Vérification du tarif</h2><p>Nous vérifions à nouveau la disponibilité et le montant auprès du fournisseur.</p></div></div>}
    {!isLoading && error && <div className="checkout-state checkout-state--error" role="alert"><i className="fas fa-circle-exclamation" aria-hidden="true" /><div><h2>Impossible de vérifier le tarif</h2><p>{error}</p><button type="button" className="checkout-button" onClick={() => setRetry((count) => count + 1)}>Réessayer</button></div></div>}
    {!isLoading && !error && unavailable && <div className="checkout-state checkout-state--warning" role="status"><i className="fas fa-circle-info" aria-hidden="true" /><div><h2>Paiement indisponible</h2><p>{unavailable}</p><Link className="checkout-button" href={dossierPath}>Voir le dossier</Link></div></div>}
    {!isLoading && !error && pricing && <PaymentForm bookingReference={reference} pricing={pricing} />}
    <PriceChangeModal isOpen={!!priceChange} previousAmount={priceChange?.previousProviderAmount} previousCurrency={priceChange?.previousProviderCurrency} currentAmount={priceChange?.currentProviderAmount} currentCurrency={priceChange?.currentProviderCurrency} isProcessing={isAccepting} onAccept={() => { void acceptPriceChange(); }} onCancel={() => { setPriceChange(null); setUnavailable('Le nouveau tarif n’a pas été accepté. Le paiement reste en attente.'); }} />
  </div></ProtectedRoute>;
}
