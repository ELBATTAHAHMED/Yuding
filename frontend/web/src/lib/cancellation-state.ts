import type { BookingResponseDto, CancellationStatusDto } from '../types/booking.types.ts';

export function canRequestCancellation(booking: BookingResponseDto): boolean {
  return !booking.cancellation && [
    'DRAFT', 'PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID',
    'PENDING_PROVIDER_CONFIRMATION', 'CONFIRMED',
  ].includes(booking.status);
}

export function cancellationOutcomeLabel(result?: CancellationStatusDto | null): string | null {
  if (!result) return null;
  if (result.cancellationStatus === 'PROVIDER_FAILED') return 'Échec de l’annulation';
  if (result.refundStatus === 'REFUND_FAILED') return 'Échec du remboursement';
  if (result.refundStatus === 'PENDING' || result.refundStatus === 'PROCESSING') return 'Remboursement en cours';
  if (result.cancellationStatus === 'PROCESSING') return 'Annulation en cours';
  return null;
}

export function cancellationResultCopy(result: CancellationStatusDto): string {
  if (result.cancellationStatus === 'PROVIDER_FAILED') return 'L’annulation du fournisseur de démonstration a échoué. Votre réservation reste active.';
  if (result.cancellationStatus === 'PROCESSING') return 'Votre demande est en cours de traitement. Son état est conservé dans votre dossier.';
  if (result.refundStatus === 'REFUND_FAILED') return 'La réservation est annulée, mais le remboursement sandbox a échoué. Consultez votre dossier.';
  if (result.refundStatus === 'PENDING' || result.refundStatus === 'PROCESSING') return 'La réservation est annulée. Le remboursement sandbox est en cours.';
  if (result.refundStatus === 'REFUNDED') return 'Réservation annulée et remboursement de démonstration effectué.';
  return 'La réservation a été annulée. Aucun remboursement n’est applicable.';
}
