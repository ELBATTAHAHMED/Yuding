'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { PriceChangeModal } from '@/components/checkout/PriceChangeModal';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { BookingProductType } from '@/types/booking.types';

const productLabels: Record<string, string> = {
  HOTEL: 'Hébergement', FLIGHT: 'Vol', ACTIVITY: 'Activité', TRANSFER: 'Transfert', TRAIN: 'Train',
};

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const serviceType = (searchParams.get('serviceType') || 'HOTEL').toUpperCase() as BookingProductType;
  const selectionRef = searchParams.get('selectionRef') || searchParams.get('offerId') || searchParams.get('serviceId') || '';
  const serviceTitle = searchParams.get('serviceTitle') || 'Votre voyage';
  const rawPrice = searchParams.get('price');
  const parsedPrice = rawPrice ? parseFloat(rawPrice) : NaN;
  const isPriced = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const basePrice = isPriced ? parsedPrice : null;
  const currency = (searchParams.get('currency') || 'EUR').trim().toUpperCase();

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState(Math.max(1, Number(searchParams.get('travelers')) || 1));
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    isProcessing, statusMessage, error: flowError, revalidationData, pricingData,
    isPriceChangeModalOpen, startBookingFlow, handleAcceptPriceChange, handleCancelPriceChange,
  } = useBookingFlow();

  const hasAuthoritativePrice = pricingData?.totalAmount != null && pricingData.totalAmount > 0;
  const displayTotal = hasAuthoritativePrice
    ? `${pricingData.totalAmount} ${pricingData.currency || currency}`
    : isPriced && basePrice != null
      ? `${(basePrice * (serviceType === 'HOTEL' ? 1 : quantity)).toFixed(2).replace(/\.00$/, '')} ${currency}`
      : 'Tarif indisponible';
  const displayUnitPrice = isPriced && basePrice != null
    ? `${basePrice.toFixed(2).replace(/\.00$/, '')} ${currency}`
    : 'Tarif indisponible';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    await startBookingFlow({ productType: serviceType, selectionRef: selectionRef || undefined });
  };

  return (
    <div className="checkout-page">
      <CheckoutSteps current="booking" />
      <header className="checkout-heading">
        <div>
          <p className="checkout-kicker">VOTRE RÉSERVATION</p>
          <h1>Finaliser votre réservation</h1>
          <p>Vérifiez votre sélection et préparez votre dossier avant le paiement.</p>
        </div>
        <span className="checkout-heading__context"><i className="fas fa-lock" aria-hidden="true" /> Parcours sécurisé</span>
      </header>

      {(flowError || localError) && <div className="checkout-notice checkout-notice--error" role="alert">
        <i className="fas fa-circle-exclamation" aria-hidden="true" />
        <div><strong>Impossible de poursuivre</strong><p>{flowError || localError}</p><Link href="/">Retour aux recherches</Link></div>
      </div>}
      {isProcessing && statusMessage && <div className="checkout-notice" role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" />{statusMessage}</div>}

      <div className="checkout-grid">
        <form className="checkout-primary" onSubmit={handleSubmit}>
          <section className="checkout-section">
            <div className="checkout-section__heading"><span>01</span><div><h2>Voyageur principal</h2><p>Coordonnées pour le suivi de votre réservation.</p></div></div>
            <div className="checkout-fields checkout-fields--two">
              <label>Prénom<input type="text" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
              <label>Nom<input type="text" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
              <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Téléphone<input type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            </div>
          </section>

          <section className="checkout-section">
            <div className="checkout-section__heading"><span>02</span><div><h2>Détails du voyage</h2><p>Retrouvez les informations de votre sélection.</p></div></div>
            <div className="checkout-fields checkout-fields--two">
              <label>Date de début<input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
              <label>Date de fin<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
              <label>Nombre de personnes<input type="number" min="1" max="20" required value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} /></label>
            </div>
            <div className="checkout-fields"><label><span>Demandes particulières <small>(optionnel)</small></span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Arrivée tardive, lit bébé, régime alimentaire..." /></label></div>
          </section>

          <div className="checkout-actions">
            <p>Le montant définitif sera validé par le serveur avant tout paiement.</p>
            <button type="submit" className="checkout-button" disabled={isProcessing}>
              {isProcessing ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" />{statusMessage || 'Traitement en cours...'}</> : <>{isPriced ? 'Continuer vers le paiement' : 'Valider et tarifier le dossier'}<i className="fas fa-arrow-right" aria-hidden="true" /></>}
            </button>
          </div>
        </form>

        <aside className="checkout-aside" aria-label="Récapitulatif de la sélection">
          <div className="checkout-summary">
            <p className="checkout-kicker">RÉCAPITULATIF</p>
            <h2>Votre sélection</h2>
            <div className="checkout-summary__product"><span>{productLabels[serviceType] || serviceType}</span><h3>{serviceTitle}</h3></div>
            <dl className="checkout-summary__rows">
              <div><dt>{serviceType === 'HOTEL' ? 'Prix indicatif du séjour' : 'Prix indicatif unitaire'}</dt><dd>{displayUnitPrice}</dd></div>
              <div><dt>Voyageurs</dt><dd>{quantity}</dd></div>
              <div><dt>Frais de dossier &amp; taxes</dt><dd>Inclus</dd></div>
            </dl>
            <div className="checkout-summary__total"><span>{hasAuthoritativePrice ? 'Total certifié' : 'Total estimé'}</span><strong>{displayTotal}</strong></div>
            <p className="checkout-summary__note">Prix indicatif. Le tarif contractuel est établi côté serveur avant le règlement.</p>
          </div>
        </aside>
      </div>

      <PriceChangeModal isOpen={isPriceChangeModalOpen} previousAmount={revalidationData?.previousProviderAmount} previousCurrency={revalidationData?.previousProviderCurrency} currentAmount={revalidationData?.currentProviderAmount} currentCurrency={revalidationData?.currentProviderCurrency} isProcessing={isProcessing} onAccept={handleAcceptPriceChange} onCancel={handleCancelPriceChange} />
    </div>
  );
}

export default function BookingPage() {
  return <Suspense fallback={<div className="checkout-page checkout-loading" role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Chargement du dossier…</div>}><BookingContent /></Suspense>;
}
