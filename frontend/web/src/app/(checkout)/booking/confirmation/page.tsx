'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatConfirmationAmount, getConfirmationPresentation, getConfirmationReference } from '@/lib/confirmation-state';
import { bookingService } from '@/services/booking.service';
import type { BookingConfirmationDto } from '@/types/booking.types';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

const MAX_PENDING_RECHECKS = 10;
const PENDING_RECHECK_DELAY_MS = 2_000;

function formatServerTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function paymentProviderLabel(provider?: string | null): string | null {
  if (!provider) return null;
  if (provider.toUpperCase().includes('PAYPAL')) return 'PayPal Sandbox';
  if (provider.toUpperCase().includes('MOCK')) return 'Paiement test — Mock';
  return provider;
}

function renderSummaryValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return null;
}

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  // The reference identifies a server resource only. Every other query value is deliberately ignored.
  const reference = getConfirmationReference(searchParams);
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
    if (!reference) {
      setLoading(false);
      return;
    }
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

  const recheck = () => {
    setRechecks(0);
    void loadConfirmation(true);
  };

  if (!reference) {
    return <ConfirmationShell icon="fa-info-circle" tone="neutral" title="Aucun dossier sélectionné">
      <p>Utilisez une référence de réservation Yuding pour consulter son état serveur.</p>
      <ConfirmationActions />
    </ConfirmationShell>;
  }

  if (loading && !confirmation) {
    return <ConfirmationShell icon="fa-spinner fa-spin" tone="pending" title="Vérification du dossier…">
      <p>Lecture de l’état de paiement et de réservation auprès du serveur.</p>
    </ConfirmationShell>;
  }

  if (fetchError || !confirmation || !presentation) {
    return <ConfirmationShell icon="fa-triangle-exclamation" tone="danger" title="Statut indisponible">
      <p>{fetchError || 'Le statut du dossier ne peut pas être affiché de manière fiable.'}</p>
      <button type="button" onClick={recheck} className="btn-booking">Réessayer</button>
    </ConfirmationShell>;
  }

  const amount = formatConfirmationAmount(confirmation.authoritativeAmount, confirmation.currency);
  const provider = paymentProviderLabel(confirmation.paymentProvider);
  const verifiedAt = formatServerTimestamp(confirmation.paymentVerifiedAt);
  const isPollingTimedOut = presentation.shouldPoll && rechecks >= MAX_PENDING_RECHECKS;
  const summaryEntries = Object.entries(confirmation.productSummary || {})
    .map(([key, value]) => [key, renderSummaryValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  return (
    <ConfirmationShell icon={presentation.icon} tone={presentation.tone} title={presentation.title}>
      <p>{presentation.description}</p>

      {isPollingTimedOut && (
        <p className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-100">
          Le paiement est toujours en cours de vérification. Vous pouvez actualiser son statut sans relancer le paiement.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-900">
        <ReceiptRow label="Référence dossier" value={confirmation.bookingReference} strong />
        <ReceiptRow label="Statut réservation" value={confirmation.bookingStatus} />
        {confirmation.paymentReference && <ReceiptRow label="Référence paiement" value={confirmation.paymentReference} />}
        {confirmation.paymentStatus && <ReceiptRow label="Statut paiement" value={confirmation.paymentStatus} />}
        {provider && <ReceiptRow label="Prestataire" value={provider} />}
        {amount && <ReceiptRow label="Montant réglé" value={amount} strong />}
        {verifiedAt && <ReceiptRow label="Vérifié le" value={verifiedAt} />}
      </div>

      {provider && (
        <span className="mt-4 inline-flex rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-bold tracking-wide text-teal-800 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-200">
          SANDBOX / TEST — {provider}
        </span>
      )}

      {summaryEntries.length > 0 && (
        <div className="mt-6 text-left">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Prestation sélectionnée</h2>
          <dl className="mt-2 grid gap-2 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
            {summaryEntries.map(([key, value]) => <ReceiptRow key={key} label={key} value={value} />)}
          </dl>
        </div>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {presentation.shouldPoll && <button type="button" onClick={recheck} className="btn-booking" disabled={refreshing}>
          <i className={refreshing ? 'fas fa-spinner fa-spin mr-2' : 'fas fa-sync-alt mr-2'} />
          Actualiser le statut
        </button>}
        {presentation.canRetryPayment && <Link href={`/booking/${confirmation.bookingReference}/payment`} className="btn-booking">Procéder au paiement</Link>}
        <ConfirmationActions />
      </div>
    </ConfirmationShell>
  );
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 py-2 last:border-0 dark:border-slate-700">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={strong ? 'font-bold text-teal-700 dark:text-teal-300' : 'font-medium text-slate-800 dark:text-slate-100'}>{value}</dd>
  </div>;
}

function ConfirmationActions() {
  return <>
    <Link href="/account/bookings" className="rounded-lg border border-teal-700 px-4 py-2 font-semibold text-teal-700 dark:border-teal-400 dark:text-teal-300">Mes réservations</Link>
    <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">Retour à l’accueil</Link>
  </>;
}

function ConfirmationShell({ icon, tone, title, children }: { icon: string; tone: 'pending' | 'success' | 'danger' | 'neutral'; title: string; children: React.ReactNode }) {
  const iconClass = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : tone === 'pending' ? 'text-teal-600' : 'text-slate-600';
  return <main className="mx-auto flex min-h-[75vh] max-w-2xl items-center px-4 py-12">
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-[#151c1b]">
      <i className={`fas ${icon} text-5xl ${iconClass}`} aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  </main>;
}

export default function BookingConfirmationPage() {
  return <ProtectedRoute>
    <Suspense fallback={<main className="flex min-h-[75vh] items-center justify-center"><i className="fas fa-spinner fa-spin text-2xl text-teal-700" /></main>}>
      <BookingConfirmationContent />
    </Suspense>
  </ProtectedRoute>;
}
