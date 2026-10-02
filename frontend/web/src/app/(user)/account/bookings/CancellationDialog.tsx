'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '@/services/booking.service';
import { queryKeys } from '@/lib/query-keys';
import type { CancellationStatusDto } from '@/types/booking.types';
import { cancellationResultCopy } from '@/lib/cancellation-state';

function money(amount: number | null, currency: string | null): string | null {
  if (amount == null || !currency) return null;
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount); }
  catch { return `${amount} ${currency}`; }
}

export function CancellationDialog({ reference, onClose }: { reference: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<CancellationStatusDto | null>(null);
  const submitting = useRef(false);
  const queryClient = useQueryClient();
  const policy = useQuery({
    queryKey: queryKeys.booking.cancellationPolicy(reference),
    queryFn: () => bookingService.getCancellationPolicy(reference),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => bookingService.cancelBooking(reference, reason),
    onSuccess: async (value) => {
      setResult(value);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.my() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.detail(reference) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.cancellation(reference) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.cancellationPolicy(reference) }),
      ]);
    },
    onSettled: () => { submitting.current = false; },
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !mutation.isPending) onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [onClose, mutation.isPending]);

  const confirm = () => {
    if (submitting.current || !policy.data?.cancellable || result) return;
    submitting.current = true;
    mutation.mutate();
  };

  return createPortal(
    <div className="cancellation-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !mutation.isPending) onClose();
    }}>
      <section className="cancellation-dialog" role="dialog" aria-modal="true" aria-labelledby="cancellation-title">
        <header className="cancellation-dialog-head">
          <div><span className="account-kicker">RÉSERVATION {reference}</span><h2 id="cancellation-title">Annuler la réservation</h2></div>
          <button type="button" className="cancellation-close" onClick={onClose} disabled={mutation.isPending} aria-label="Fermer">×</button>
        </header>
        {result ? (
          <div className="cancellation-dialog-body" role="status">
            <p className="cancellation-result">{cancellationResultCopy(result)}</p>
            {result.refundAmount != null && result.refundStatus !== 'NOT_APPLICABLE' && (
              <p>{result.refundStatus === 'REFUNDED' ? 'Montant remboursé en simulation :' : 'Montant prévu :'} <strong>{money(result.refundAmount, result.currency)}</strong></p>
            )}
            <button type="button" className="btn-primary-sm" onClick={onClose}>Voir mes réservations</button>
          </div>
        ) : (
          <>
            <div className="cancellation-dialog-body">
              {policy.isPending && <p role="status">Vérification des conditions d’annulation…</p>}
              {policy.isError && <p className="cancellation-error" role="alert">Conditions indisponibles. Réessayez dans un instant.</p>}
              {policy.data && <>
                <p className="cancellation-policy-reason">{policy.data.reason}</p>
                <p className="cancellation-policy-note">Cette action concerne le dossier de démonstration Yuding. Aucun fournisseur réel ne sera contacté.</p>
                {policy.data.refundType === 'FULL' && <p className="cancellation-policy-amount">Remboursement intégral : <strong>{money(policy.data.refundAmount, policy.data.currency)}</strong></p>}
                {policy.data.refundType === 'PARTIAL' && <>
                  <p className="cancellation-policy-amount">Remboursement partiel : <strong>{money(policy.data.refundAmount, policy.data.currency)}</strong></p>
                  <p>Frais d’annulation : {money(policy.data.cancellationFee, policy.data.currency)}</p>
                </>}
                {policy.data.refundType === 'NON_REFUNDABLE' && <p className="cancellation-policy-amount">Cette réservation n’est pas remboursable.</p>}
                {policy.data.refundType === 'UNKNOWN' && <p className="cancellation-policy-amount">Les conditions de remboursement ne peuvent pas être déterminées automatiquement.</p>}
                {policy.data.refundType === 'NOT_APPLICABLE' && <p className="cancellation-policy-amount">Aucun paiement à rembourser.</p>}
                {policy.data.deadline && <p>Limite indiquée : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(policy.data.deadline))}</p>}
                {policy.data.cancellable && <label className="cancellation-reason">Motif (facultatif)
                  <textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Pourquoi annulez-vous ce voyage ?" />
                </label>}
              </>}
              {mutation.isError && <p className="cancellation-error" role="alert">L’annulation n’a pas pu être effectuée. Vérifiez l’état du dossier puis réessayez.</p>}
            </div>
            <footer className="cancellation-dialog-actions">
              <button type="button" className="btn-secondary-sm" onClick={onClose} disabled={mutation.isPending}>Retour</button>
              {policy.data?.cancellable && <button type="button" className="btn-primary-sm" onClick={confirm} disabled={mutation.isPending}>
                {mutation.isPending ? 'Annulation en cours…' : 'Confirmer l’annulation'}
              </button>}
            </footer>
          </>
        )}
      </section>
    </div>, document.body);
}
