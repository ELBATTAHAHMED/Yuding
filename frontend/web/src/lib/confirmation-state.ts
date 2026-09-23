import type { BookingConfirmationDto, ConfirmationState } from '@/types/booking.types';

export type ConfirmationTone = 'pending' | 'success' | 'danger' | 'neutral';

export interface ConfirmationPresentation {
  title: string;
  description: string;
  tone: ConfirmationTone;
  icon: string;
  canRetryPayment: boolean;
  shouldPoll: boolean;
}

const PRESENTATIONS: Record<ConfirmationState, ConfirmationPresentation> = {
  AWAITING_PAYMENT: {
    title: 'Cette réservation n’a pas encore été payée.',
    description: 'Finalisez le paiement depuis le parcours sécurisé pour continuer.',
    tone: 'neutral', icon: 'fa-wallet', canRetryPayment: true, shouldPoll: false,
  },
  PAYMENT_VERIFICATION_PENDING: {
    title: 'Confirmation du paiement en cours…',
    description: 'Le paiement sandbox est en attente de vérification sécurisée par le webhook.',
    tone: 'pending', icon: 'fa-spinner fa-spin', canRetryPayment: false, shouldPoll: true,
  },
  PAYMENT_FAILED: {
    title: 'Le paiement n’a pas été validé.',
    description: 'Vous pouvez reprendre le parcours de paiement sécurisé si la réservation est encore éligible.',
    tone: 'danger', icon: 'fa-circle-xmark', canRetryPayment: true, shouldPoll: false,
  },
  PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION: {
    title: 'Paiement sandbox validé',
    description: 'Le paiement a été vérifié. La réservation fournisseur n’est pas encore confirmée.',
    tone: 'success', icon: 'fa-circle-check', canRetryPayment: false, shouldPoll: false,
  },
  PENDING_PROVIDER_CONFIRMATION: {
    title: 'Confirmation auprès du fournisseur en cours',
    description: 'Le paiement est vérifié, mais la confirmation fournisseur n’est pas encore disponible.',
    tone: 'pending', icon: 'fa-clock', canRetryPayment: false, shouldPoll: false,
  },
  CONFIRMED: {
    title: 'Réservation confirmée',
    description: 'La confirmation fournisseur a été enregistrée par le backend.',
    tone: 'success', icon: 'fa-circle-check', canRetryPayment: false, shouldPoll: false,
  },
  CANCELLED: {
    title: 'Réservation annulée',
    description: 'Cette réservation n’est plus active.',
    tone: 'neutral', icon: 'fa-ban', canRetryPayment: false, shouldPoll: false,
  },
  REFUNDED: {
    title: 'Paiement remboursé',
    description: 'Le remboursement est reflété dans l’état backend de cette réservation.',
    tone: 'neutral', icon: 'fa-rotate-left', canRetryPayment: false, shouldPoll: false,
  },
  EXPIRED: {
    title: 'Cette réservation a expiré.',
    description: 'Aucun paiement ni confirmation fournisseur ne peut être déduit de ce dossier.',
    tone: 'neutral', icon: 'fa-hourglass-end', canRetryPayment: false, shouldPoll: false,
  },
  INCONSISTENT_STATE: {
    title: 'Vérification du dossier requise',
    description: 'Les états de paiement et de réservation ne permettent pas d’afficher un reçu fiable.',
    tone: 'danger', icon: 'fa-triangle-exclamation', canRetryPayment: false, shouldPoll: false,
  },
};

export function getConfirmationPresentation(confirmation: BookingConfirmationDto): ConfirmationPresentation {
  return PRESENTATIONS[confirmation.confirmationState];
}

/**
 * The public booking reference is the only accepted client route input. In particular, callback
 * query values such as amount, currency, payment, status, or success can never affect the receipt.
 */
export function getConfirmationReference(searchParams: Pick<URLSearchParams, 'get'>): string {
  return searchParams.get('reference')?.trim() || '';
}

export function getBookingDossierPath(reference: string): string {
  return `/bookings/${encodeURIComponent(reference.trim())}`;
}

export function formatConfirmationAmount(amount?: number | null, currency?: string | null): string | null {
  if (amount == null || !currency) return null;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}
