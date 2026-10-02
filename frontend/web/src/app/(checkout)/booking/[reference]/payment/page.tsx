'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { bookingService } from '@/services/booking.service';
import { BookingPricingResponseDto } from '@/types/booking.types';

export default function BookingPaymentPage() {
  const params = useParams();
  const reference = (params?.reference as string) || '';
  const [pricing, setPricing] = useState<BookingPricingResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!reference) return;
    let isMounted = true;

    async function loadPricing() {
      setIsLoading(true);
      setError(null);
      try {
        let result: BookingPricingResponseDto;
        try {
          result = await bookingService.getAuthoritativePricing(reference);
        } catch {
          result = await bookingService.createAuthoritativePricing(reference);
        }
        if (isMounted) setPricing(result);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Impossible de récupérer le tarif du dossier.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadPricing();
    return () => { isMounted = false; };
  }, [reference, retry]);

  return <ProtectedRoute><div className="checkout-page">
    <CheckoutSteps current="payment" />
    <header className="checkout-heading">
      <div><p className="checkout-kicker">PAIEMENT</p><h1>Régler votre réservation</h1><p>Choisissez votre moyen de paiement. Le montant affiché provient du serveur.</p></div>
      <span className="checkout-heading__context"><i className="fas fa-lock" aria-hidden="true" /> Dossier {reference}</span>
    </header>
    <Link className="checkout-back" href={`/bookings/${reference}`}><i className="fas fa-arrow-left" aria-hidden="true" /> Voir le dossier</Link>

    {isLoading && <div className="checkout-state" role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" /><div><h2>Vérification du tarif</h2><p>Nous récupérons le montant confirmé par le serveur.</p></div></div>}
    {!isLoading && error && <div className="checkout-state checkout-state--error" role="alert"><i className="fas fa-circle-exclamation" aria-hidden="true" /><div><h2>Impossible de charger le dossier</h2><p>{error}</p><button type="button" className="checkout-button" onClick={() => setRetry((count) => count + 1)}>Réessayer</button></div></div>}
    {!isLoading && !error && pricing && (pricing.canProceedToPayment
      ? <PaymentForm bookingReference={reference} pricing={pricing} />
      : <div className="checkout-state checkout-state--warning"><i className="fas fa-circle-info" aria-hidden="true" /><div><h2>Paiement en ligne indisponible</h2><p>{pricing.message || 'Le tarif de cette prestation doit être revérifié avant le règlement.'}</p><Link className="checkout-button" href={`/booking/${reference}`}>Retour au dossier</Link></div></div>)}
  </div></ProtectedRoute>;
}
