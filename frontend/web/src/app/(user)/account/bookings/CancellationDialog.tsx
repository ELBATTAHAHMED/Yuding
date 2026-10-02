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
      <div className="cancellation-dialog" role="dialog" aria-modal="true" aria-labelledby="cancellation-title">
        <header className="cancellation-dialog-head">
          <span className="cancellation-dialog-icon" aria-hidden="true"><i className="fas fa-calendar-xmark" /></span>
          <div className="cancellation-dialog-heading">
            <span className="cancellation-kicker">RÉSERVATION · {reference}</span>
            <h2 id="cancellation-title">Annuler ce voyage&nbsp;?</h2>
            <p>Vérifiez les conditions de votre dossier avant de confirmer.</p>
          </div>
          <button type="button" className="cancellation-close" onClick={onClose} disabled={mutation.isPending} aria-label="Fermer"><i className="fas fa-xmark" aria-hidden="true" /></button>
        </header>
        {result ? (
          <div className="cancellation-dialog-body" role="status">
            <div className={`cancellation-result-icon${result.cancellationStatus === 'PROVIDER_FAILED' ? ' is-error' : ''}`} aria-hidden="true"><i className={result.cancellationStatus === 'PROVIDER_FAILED' ? 'fas fa-circle-exclamation' : 'fas fa-circle-check'} /></div>
            <h3 className="cancellation-result">{cancellationResultCopy(result)}</h3>
            {result.refundAmount != null && result.refundStatus !== 'NOT_APPLICABLE' && (
              <p className="cancellation-result-amount">{result.refundStatus === 'REFUNDED' ? 'Montant remboursé en simulation' : 'Montant prévu'} <strong>{money(result.refundAmount, result.currency)}</strong></p>
            )}
            <button type="button" className="cancellation-done" onClick={onClose}>Voir mes réservations</button>
          </div>
        ) : (
          <>
            <div className="cancellation-dialog-body">
              {policy.isPending && <p className="cancellation-loading" role="status"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Vérification des conditions d’annulation…</p>}
              {policy.isError && <p className="cancellation-error" role="alert">Conditions indisponibles. Réessayez dans un instant.</p>}
              {policy.data && <>
                <div className="cancellation-policy-card">
                  <span className="cancellation-policy-label">CONDITIONS DE L’OFFRE</span>
                  <p className="cancellation-policy-reason">{policy.data.reason}</p>
                </div>
                {policy.data.refundType === 'FULL' && <div className="cancellation-refund-card"><span><i className="fas fa-rotate-left" aria-hidden="true" /> Remboursement intégral</span><strong>{money(policy.data.refundAmount, policy.data.currency)}</strong></div>}
                {policy.data.refundType === 'PARTIAL' && <>
                  <div className="cancellation-refund-card"><span><i className="fas fa-rotate-left" aria-hidden="true" /> Remboursement partiel</span><strong>{money(policy.data.refundAmount, policy.data.currency)}</strong></div>
                  <p className="cancellation-fee">Frais d’annulation <strong>{money(policy.data.cancellationFee, policy.data.currency)}</strong></p>
                </>}
                {policy.data.refundType === 'NON_REFUNDABLE' && <p className="cancellation-policy-alert"><i className="fas fa-circle-info" aria-hidden="true" /> Cette réservation n’est pas remboursable.</p>}
                {policy.data.refundType === 'UNKNOWN' && <p className="cancellation-policy-alert"><i className="fas fa-circle-info" aria-hidden="true" /> Les conditions de remboursement ne peuvent pas être déterminées automatiquement.</p>}
                {policy.data.refundType === 'NOT_APPLICABLE' && <p className="cancellation-policy-alert"><i className="fas fa-circle-info" aria-hidden="true" /> Aucun paiement à rembourser.</p>}
                {policy.data.deadline && <p className="cancellation-deadline"><i className="far fa-clock" aria-hidden="true" /> Limite indiquée : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(policy.data.deadline))}</p>}
                {policy.data.cancellable && <label className="cancellation-reason"><span className="cancellation-reason-label">Motif de l’annulation <em>(facultatif)</em></span>
                  <textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Vous pouvez préciser votre raison ici" />
                </label>}
                <p className="cancellation-policy-note"><i className="fas fa-shield-halved" aria-hidden="true" /> Réservation de démonstration Yuding. Aucun fournisseur réel ne sera contacté.</p>
              </>}
              {mutation.isError && <p className="cancellation-error" role="alert">L’annulation n’a pas pu être effectuée. Vérifiez l’état du dossier puis réessayez.</p>}
            </div>
            <footer className="cancellation-dialog-actions">
              <button type="button" className="cancellation-back" onClick={onClose} disabled={mutation.isPending}>Garder ma réservation</button>
              {policy.data?.cancellable && <button type="button" className="cancellation-confirm" onClick={confirm} disabled={mutation.isPending}>
                <i className={mutation.isPending ? 'fas fa-spinner fa-spin' : 'fas fa-calendar-xmark'} aria-hidden="true" /> {mutation.isPending ? 'Annulation en cours…' : 'Confirmer l’annulation'}
              </button>}
            </footer>
          </>
        )}
      </div>
    </div>, document.body);
}
