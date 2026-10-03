'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';
import { ReviewDialog } from './ReviewDialog';

export function BookingReviewAction({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const eligibility = useQuery({ queryKey: ['reviews', 'eligibility', reference],
    queryFn: () => reviewService.eligibility(reference) });
  const mine = useQuery({ queryKey: ['reviews', 'mine', reference],
    queryFn: () => reviewService.mine(reference), enabled: eligibility.isSuccess });
  const review = mine.data;
  if (eligibility.isError || mine.isError) return <span className="review-unavailable">Avis momentanément indisponibles</span>;
  if (!eligibility.data?.eligible && !review) return null;
  return <>
    <button type="button" className="booking-review-action" onClick={() => setOpen(true)}
      aria-label={review ? `Voir mon avis pour la réservation ${reference}` : `Laisser un avis pour la réservation ${reference}`}>
      <i className="fas fa-star" aria-hidden="true" /> {review ? 'Mon avis' : 'Avis'}
    </button>
    {open && <ReviewDialog reference={reference} entityName={eligibility.data?.entityName || 'votre voyage'}
      review={review || null} onClose={() => setOpen(false)} onChanged={() => {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'mine', reference] });
        queryClient.invalidateQueries({ queryKey: ['reviews', 'public'] });
      }} />}
  </>;
}
