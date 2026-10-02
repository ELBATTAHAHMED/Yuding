'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { getConfirmationPresentation, formatConfirmationAmount } from '@/lib/confirmation-state';
import { bookingService } from '@/services/booking.service';
import type { BookingConfirmationDto, BookingResponseDto } from '@/types/booking.types';

type DialogView = 'receipt' | 'dossier';

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function detailValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return null;
}

const productLabels = {
  HOTEL: 'Hébergement', FLIGHT: 'Vol', ACTIVITY: 'Activité',
  TRANSFER: 'Transfert', TRAIN: 'Train',
};

const paymentLabels = {
  INITIATED: 'Initié', REQUIRES_ACTION: 'Action requise',
  AWAITING_WEBHOOK: 'En cours de vérification', SUCCEEDED: 'Validé',
  FAILED: 'Échoué', REFUNDED: 'Remboursé',
};

function detailLabel(key: string): string {
  const labels: Record<string, string> = {
    hotelName: 'Hébergement', title: 'Prestation', name: 'Nom',
    origin: 'Départ', destination: 'Destination', city: 'Ville',
    checkIn: 'Arrivée', checkOut: 'Départ', provider: 'Fournisseur',
  };
  return labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function providerLabel(provider?: string | null): string | null {
  if (!provider) return null;
  if (/mock|demo/i.test(provider)) return 'Paiement démo';
  if (/paypal/i.test(provider)) return 'PayPal';
  return provider;
}

export function BookingDetailsDialog({ reference, view, onClose }: {
  reference: string;
  view: DialogView;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState<BookingConfirmationDto | null>(null);
  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setConfirmation(null);
    setBooking(null);
    Promise.all([
      bookingService.getConfirmation(reference),
      view === 'dossier' ? bookingService.getBookingByReference(reference) : Promise.resolve(null),
    ]).then(([result, detail]) => {
      if (!cancelled) {
        setConfirmation(result);
        setBooking(detail);
      }
    }).catch(() => {
      if (!cancelled) setError('Impossible de charger ce document. Réessayez dans un instant.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reference, view]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const presentation = confirmation ? getConfirmationPresentation(confirmation) : null;
  const amount = confirmation ? formatConfirmationAmount(confirmation.authoritativeAmount, confirmation.currency) : null;
  const summary = confirmation ? Object.entries(confirmation.productSummary || {})
    .map(([key, value]) => [key, detailValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null)
    .filter(([key]) => !['title', 'name', 'hotelName', 'provider'].includes(key))
    .slice(0, 5) : [];
  const snapshot = booking?.offerSnapshot;
  const serviceName = detailValue(snapshot?.selectedDetails?.title)
    || detailValue(snapshot?.selectedDetails?.hotelName)
    || detailValue(snapshot?.selectedDetails?.name)
    || detailValue(confirmation?.productSummary?.title)
    || detailValue(confirmation?.productSummary?.hotelName)
    || (confirmation ? productLabels[confirmation.productType] : '');
  const isReceipt = view === 'receipt';

  return createPortal(
    <div className="booking-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={dialogRef} className={`booking-dialog booking-dialog--${view}`} role="dialog" aria-modal="true"
        aria-labelledby="booking-dialog-title" onKeyDown={onKeyDown}>
        <header className="booking-dialog-header">
          <span className="booking-dialog-icon" aria-hidden="true">
            <i className={isReceipt ? 'fas fa-receipt' : 'fas fa-suitcase-rolling'} />
          </span>
          <div className="booking-dialog-heading">
            <span className="booking-dialog-kicker">{isReceipt ? 'PAIEMENT' : 'RÉSERVATION'}</span>
            <h2 id="booking-dialog-title">{isReceipt ? 'Reçu' : 'Dossier de voyage'}</h2>
          </div>
          <button ref={closeRef} type="button" className="booking-dialog-close" onClick={onClose} aria-label="Fermer">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </header>
        <div className="booking-dialog-body">
          {loading && <p className="booking-dialog-message">Chargement du document…</p>}
          {error && <p className="booking-dialog-message booking-dialog-error" role="alert">{error}</p>}
          {!loading && confirmation && presentation && (isReceipt ? <>
            <div className="booking-receipt-total">
              <span>Montant enregistré</span>
              <strong>{amount || 'Montant indisponible'}</strong>
              {confirmation.paymentStatus && <span className="booking-receipt-paid">
                <i className={`fas ${presentation.icon}`} aria-hidden="true" />
                {paymentLabels[confirmation.paymentStatus]}
              </span>}
            </div>
            <dl className="booking-receipt-facts">
              <div><dt>Référence</dt><dd>{confirmation.bookingReference}</dd></div>
              <div><dt>Prestation</dt><dd>{productLabels[confirmation.productType]}</dd></div>
              {formatDate(confirmation.createdAt) && <div><dt>Date</dt><dd>{formatDate(confirmation.createdAt)}</dd></div>}
              {confirmation.paymentReference && <div><dt>Transaction</dt><dd>{confirmation.paymentReference}</dd></div>}
              {confirmation.paymentProvider && <div><dt>Paiement</dt><dd>{providerLabel(confirmation.paymentProvider)}</dd></div>}
            </dl>
            <p className="booking-dialog-state" data-tone={presentation.tone}>
              <i className={`fas ${presentation.icon}`} aria-hidden="true" />
              <span><strong>{presentation.title}</strong>{presentation.description}</span>
            </p>
          </> : <>
            <div className="booking-dossier-service">
              <span>{productLabels[confirmation.productType]}</span>
              <strong>{serviceName}</strong>
              {snapshot?.provider && <small>Fournisseur : {snapshot.provider}</small>}
            </div>
            <p className="booking-dialog-state" data-tone={presentation.tone}>
              <i className={`fas ${presentation.icon}`} aria-hidden="true" />
              <span><strong>{presentation.title}</strong>{presentation.description}</span>
            </p>
            <dl className="booking-dossier-facts">
              <div><dt>Référence</dt><dd>{confirmation.bookingReference}</dd></div>
              {formatDate(confirmation.createdAt) && <div><dt>Créé le</dt><dd>{formatDate(confirmation.createdAt)}</dd></div>}
              {confirmation.paymentStatus && <div><dt>Paiement</dt><dd>{paymentLabels[confirmation.paymentStatus]}</dd></div>}
              {amount && <div><dt>Montant</dt><dd>{amount}</dd></div>}
            </dl>
            {summary.length > 0 && <div className="booking-dossier-more">
              <h3>Détails du voyage</h3>
              <dl>{summary.map(([key, value]) => <div key={key}><dt>{detailLabel(key)}</dt><dd>{value}</dd></div>)}</dl>
            </div>}
          </>)}
        </div>
        <button className="booking-dialog-dismiss" type="button" onClick={onClose}>Fermer</button>
      </div>
    </div>,
    document.body,
  );
}
