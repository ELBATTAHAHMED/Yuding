'use client';

import { useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import { useMyBookings } from '@/hooks/queries/useBookingQueries';
import { reviewService, type BookableReviewTarget } from '@/services/review.service';
import { ReviewDialog } from '@/app/(user)/account/bookings/ReviewDialog';

const productType: Record<BookableReviewTarget, string> = {
  ACCOMMODATION: 'HOTEL', ACTIVITY: 'ACTIVITY', FLIGHT: 'FLIGHT', TRANSFER: 'TRANSFER', TRAIN: 'TRAIN',
};

export function ExperiencedReviewCTA({ type, provider, reference }: { type: BookableReviewTarget; provider: string; reference: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const bookings = useMyBookings({ enabled: !isLoading && isAuthenticated });
  const candidates = (bookings.data || []).filter(booking => booking.productType === productType[type]
    && (booking.status === 'CONFIRMED' || booking.status === 'PAID'));
  const eligibility = useQueries({ queries: candidates.map(booking => ({
    queryKey: ['reviews', 'eligibility', booking.bookingReference],
    queryFn: () => reviewService.eligibility(booking.bookingReference),
    staleTime: 60_000,
  })) });
  const match = eligibility.map(result => result.data).find(target => target?.eligible && target.entityType === type
    && target.entityReference === reference && target.provider?.toUpperCase() === provider.toUpperCase());
  const mine = useQuery({ queryKey: ['reviews', 'mine', match?.bookingReference],
    queryFn: () => reviewService.mine(match!.bookingReference), enabled: Boolean(match) });
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  if (!match || mine.isPending || mine.isError) return null;
  return <div className="experienced-review-cta">
    <div><span className="review-kicker">VOTRE EXPÉRIENCE</span><strong>Vous avez vécu cette expérience.</strong><p>{match.entityName || 'Ce voyage'} fait partie de vos voyages terminés.</p></div>
    <button type="button" onClick={() => setOpen(true)}>{mine.data ? 'Voir mon avis' : 'Partager mon avis'} <i className="fas fa-arrow-right" aria-hidden="true" /></button>
    {open && <ReviewDialog reference={match.bookingReference} entityName={match.entityName || 'ce voyage'} review={mine.data || null}
      onClose={() => setOpen(false)} onChanged={() => {
        client.invalidateQueries({ queryKey: ['reviews', 'mine', match.bookingReference] });
        client.invalidateQueries({ queryKey: ['reviews', 'all-mine'] });
        client.invalidateQueries({ queryKey: ['reviews', 'public'] });
      }} />}
  </div>;
}
