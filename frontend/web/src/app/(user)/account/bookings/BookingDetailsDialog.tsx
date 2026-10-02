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
    .slice(0, 8) : [];
  const snapshot = booking?.offerSnapshot;

  return createPortal(
    <div className="booking-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={dialogRef} className="booking-dialog" role="dialog" aria-modal="true"
        aria-labelledby="booking-dialog-title" onKeyDown={onKeyDown}>
        <header className="booking-dialog-header">
          <div>
            <span className="booking-dialog-kicker">{view === 'receipt' ? 'DOCUMENT DE PAIEMENT' : 'VOTRE RÉSERVATION'}</span>
            <h2 id="booking-dialog-title">{view === 'receipt' ? 'Reçu' : 'Dossier de voyage'}</h2>
            <p>Référence {reference}</p>
          </div>
          <button ref={closeRef} type="button" className="booking-dialog-close" onClick={onClose} aria-label="Fermer">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </header>
        <div className="booking-dialog-body">
          {loading && <p className="booking-dialog-message">Chargement du document…</p>}
          {error && <p className="booking-dialog-message booking-dialog-error" role="alert">{error}</p>}
          {!loading && confirmation && presentation && <>
            <div className="booking-dialog-status">
              <i className={`fas ${presentation.icon}`} aria-hidden="true" />
              <div><strong>{presentation.title}</strong><span>{presentation.description}</span></div>
            </div>
            <dl className="booking-dialog-details">
              <div><dt>Référence</dt><dd>{confirmation.bookingReference}</dd></div>
              <div><dt>Prestation</dt><dd>{productLabels[confirmation.productType]}</dd></div>
              {formatDate(confirmation.createdAt) && <div><dt>Créée le</dt><dd>{formatDate(confirmation.createdAt)}</dd></div>}
              {confirmation.paymentReference && <div><dt>Référence paiement</dt><dd>{confirmation.paymentReference}</dd></div>}
              {confirmation.paymentStatus && <div><dt>Statut du paiement</dt><dd>{paymentLabels[confirmation.paymentStatus]}</dd></div>}
              {confirmation.paymentProvider && <div><dt>Prestataire de paiement</dt><dd>{confirmation.paymentProvider}</dd></div>}
              {amount && <div className="booking-dialog-total"><dt>Montant</dt><dd>{amount}</dd></div>}
              {view === 'dossier' && snapshot?.provider && <div><dt>Fournisseur du voyage</dt><dd>{snapshot.provider}</dd></div>}
              {view === 'dossier' && summary.map(([key, value]) => <div key={key}><dt>{detailLabel(key)}</dt><dd>{value}</dd></div>)}
            </dl>
            {view === 'receipt' && <p className="booking-dialog-note">Document établi à partir du statut vérifié par Yuding.</p>}
          </>}
        </div>
        <footer className="booking-dialog-footer">
          <button type="button" onClick={onClose}>Fermer</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
