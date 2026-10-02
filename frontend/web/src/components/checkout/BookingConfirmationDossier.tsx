'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { formatConfirmationAmount, getConfirmationPresentation } from '@/lib/confirmation-state';
import type { ConfirmationPresentation } from '@/lib/confirmation-state';
import { bookingService } from '@/services/booking.service';
import type { BookingConfirmationDto, BookingStatus, PaymentStatus } from '@/types/booking.types';

const MAX_PENDING_RECHECKS = 10;
const PENDING_RECHECK_DELAY_MS = 2_000;

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente de paiement',
  PAID: 'Payée',
  PAYMENT_FAILED: 'Paiement échoué',
  PENDING_PROVIDER_CONFIRMATION: 'Confirmation fournisseur en cours',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  REFUNDED: 'Remboursée',
  EXPIRED: 'Expirée',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  INITIATED: 'Initié',
  REQUIRES_ACTION: 'Action requise',
  AWAITING_WEBHOOK: 'Vérification en cours',
  SUCCEEDED: 'Validé',
  FAILED: 'Échoué',
  REFUNDED: 'Remboursé',
};

function formatServerTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function paymentProviderLabel(provider?: string | null): string | null {
  if (!provider) return null;
  if (provider.toUpperCase().includes('PAYPAL')) return 'PayPal Sandbox';
  if (provider.toUpperCase().includes('MOCK') || provider.toUpperCase().includes('DEMO')) return 'Démo / Mock';
  return provider;
}

function renderSummaryValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return null;
}

export function BookingConfirmationDossier({ reference }: { reference: string }) {
  const [confirmation, setConfirmation] = useState<BookingConfirmationDto | null>(null);
  const [loading, setLoading] = useState(Boolean(reference));
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rechecks, setRechecks] = useState(0);

  const loadConfirmation = useCallback(async (showSpinner: boolean) => {
    if (!reference) return;
    if (showSpinner) setRefreshing(true);
    try {
      const projection = await bookingService.getConfirmation(reference);
      setConfirmation(projection);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Impossible de vérifier le statut du dossier.');
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, [reference]);

  useEffect(() => {
    if (!reference) { setLoading(false); return; }
    void loadConfirmation(false);
  }, [loadConfirmation, reference]);

  const presentation = confirmation ? getConfirmationPresentation(confirmation) : null;

  useEffect(() => {
    if (!presentation?.shouldPoll || rechecks >= MAX_PENDING_RECHECKS) return;
    const timer = window.setTimeout(() => {
      setRechecks((attempt) => attempt + 1);
      void loadConfirmation(false);
    }, PENDING_RECHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loadConfirmation, presentation?.shouldPoll, rechecks]);

  const recheck = () => { setRechecks(0); void loadConfirmation(true); };

  if (!reference) return <ConfirmationFrame tone="neutral" icon="fa-circle-info" title="Aucun dossier sélectionné"><p>Ouvrez une réservation pour consulter son état.</p><ConfirmationActions /></ConfirmationFrame>;
  if (loading && !confirmation) return <ConfirmationFrame reference={reference} tone="pending" icon="fa-spinner fa-spin" title="Vérification du dossier"><p>Lecture de l'état de paiement et de réservation auprès du serveur.</p></ConfirmationFrame>;
  if (fetchError || !confirmation || !presentation) return <ConfirmationFrame reference={reference} tone="danger" icon="fa-triangle-exclamation" title="Statut indisponible"><p>{fetchError || 'Le statut du dossier ne peut pas être affiché de manière fiable.'}</p><button type="button" onClick={recheck} className="checkout-button">Réessayer</button></ConfirmationFrame>;

  return <ConfirmationDetails confirmation={confirmation} presentation={presentation} rechecks={rechecks} refreshing={refreshing} onRecheck={recheck} />;
}

function ConfirmationDetails({ confirmation, presentation, rechecks = 0, refreshing = false, onRecheck = () => {} }: { confirmation: BookingConfirmationDto; presentation: ConfirmationPresentation; rechecks?: number; refreshing?: boolean; onRecheck?: () => void }) {
  const reference = confirmation.bookingReference;
  const amount = formatConfirmationAmount(confirmation.authoritativeAmount, confirmation.currency);
  const provider = paymentProviderLabel(confirmation.paymentProvider);
  const verifiedAt = formatServerTimestamp(confirmation.paymentVerifiedAt);
  const isPollingTimedOut = presentation.shouldPoll && rechecks >= MAX_PENDING_RECHECKS;
  const summaryEntries = Object.entries(confirmation.productSummary || {})
    .map(([key, value]) => [key, renderSummaryValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  return <ConfirmationFrame reference={reference} tone={presentation.tone} icon={presentation.icon} title="Votre dossier de voyage">
    <div className="checkout-confirmation__hero" role="status">
      <span className="checkout-confirmation__hero-icon"><i className={`fas ${presentation.icon}`} aria-hidden="true" /></span>
      <div><p className="checkout-kicker">ÉTAT DU DOSSIER</p><h2>{presentation.title}</h2><p>{presentation.description}</p></div>
    </div>
    {isPollingTimedOut && <div className="checkout-notice" role="status">La vérification est encore en cours. Actualisez le statut sans relancer le paiement.</div>}
    <div className="checkout-grid checkout-grid--confirmation">
      <div className="checkout-primary checkout-confirmation__details">
        <section className="checkout-confirmation__block">
          <div className="checkout-confirmation__block-heading"><h2>Réservation</h2><span>01</span></div>
          <dl className="checkout-detail-list"><ReceiptRow label="État du voyage" value={BOOKING_STATUS_LABELS[confirmation.bookingStatus] || confirmation.bookingStatus} strong /></dl>
        </section>
        <section className="checkout-confirmation__block">
          <div className="checkout-confirmation__block-heading"><h2>Paiement</h2><span>02</span></div>
          <dl className="checkout-detail-list">
            <ReceiptRow label="État du paiement" value={confirmation.paymentStatus ? PAYMENT_STATUS_LABELS[confirmation.paymentStatus] || confirmation.paymentStatus : confirmation.confirmationState === 'AWAITING_PAYMENT' ? 'En attente' : 'À vérifier'} strong />
            {verifiedAt && <ReceiptRow label="Paiement vérifié le" value={verifiedAt} />}
            {confirmation.paymentReference && <ReceiptRow label="Référence paiement" value={confirmation.paymentReference} />}
            {provider && <ReceiptRow label="Moyen de paiement" value={provider} />}
          </dl>
        </section>
        <div className="checkout-confirmation__actions">
          {presentation.shouldPoll && <button type="button" onClick={onRecheck} className="checkout-button" disabled={refreshing}><i className={refreshing ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'} aria-hidden="true" />Actualiser le statut</button>}
          {presentation.canRetryPayment && <Link href={`/booking/${confirmation.bookingReference}/payment`} className="checkout-button">Procéder au paiement</Link>}
          <ConfirmationActions />
        </div>
      </div>

      <aside className="checkout-aside"><div className="checkout-summary"><p className="checkout-kicker">VOTRE VOYAGE</p><h2>Récapitulatif</h2>{summaryEntries.length > 0 && <dl className="checkout-summary__rows">{summaryEntries.map(([key, value]) => <ReceiptRow key={key} label={key} value={value} />)}</dl>}<div className="checkout-summary__total"><span>Montant du dossier</span><strong>{amount || 'Indisponible'}</strong></div><p className="checkout-summary__note">Tarif et état transmis par le serveur.</p></div></aside>
    </div>
  </ConfirmationFrame>;
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><dt>{label}</dt><dd className={strong ? 'is-strong' : undefined}>{value}</dd></div>;
}

function ConfirmationActions() {
  return <><Link href="/account/bookings" className="checkout-button checkout-button--secondary">Mes réservations</Link><Link href="/" className="checkout-text-button">Retour à l'accueil</Link></>;
}

function ConfirmationFrame({ reference, icon, tone, title, children }: { reference?: string; icon: string; tone: 'pending' | 'success' | 'danger' | 'neutral'; title: string; children: React.ReactNode }) {
  return <div className={`checkout-page checkout-confirmation checkout-confirmation--${tone}`}>
    <CheckoutSteps current="confirmation" />
    <header className="checkout-heading"><div><p className="checkout-kicker">CONFIRMATION</p><h1>{title}</h1><p>Suivez votre réservation et son paiement.</p></div>{reference && <span className="checkout-heading__context"><i className={`fas ${icon}`} aria-hidden="true" /> Référence {reference}</span>}</header>
    {children}
  </div>;
}
