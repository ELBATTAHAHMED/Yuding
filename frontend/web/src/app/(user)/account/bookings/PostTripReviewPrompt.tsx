'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { BookingResponseDto } from '@/types/booking.types';
import { reviewService } from '@/services/review.service';
import { ReviewDialog } from './ReviewDialog';

const DELAY_BETWEEN_PROMPTS = 30 * 24 * 60 * 60 * 1000;

export function PostTripReviewPrompt({ bookings }: { bookings: BookingResponseDto[] }) {
  const candidates = useMemo(() => bookings.filter(booking => booking.status === 'CONFIRMED' || booking.status === 'PAID').slice(0, 12), [bookings]);
  const eligibility = useQueries({ queries: candidates.map(booking => ({
    queryKey: ['reviews', 'eligibility', booking.bookingReference],
    queryFn: () => reviewService.eligibility(booking.bookingReference), staleTime: 60_000,
  })) });
  const eligible = eligibility.map(query => query.data).filter(item => item?.eligible);
  const mine = useQueries({ queries: eligible.map(item => ({
    queryKey: ['reviews', 'mine', item!.bookingReference],
    queryFn: () => reviewService.mine(item!.bookingReference), staleTime: 60_000,
  })) });
  const target = eligible.find((item, index) => mine[index]?.isSuccess && !mine[index]?.data);
  const [open, setOpen] = useState(false);
  const client = useQueryClient();

  useEffect(() => {
    if (!target || document.visibilityState !== 'visible') return;
    const key = `yuding:review-prompt:${target.bookingReference}`;
    try {
      if (Date.now() - Number(localStorage.getItem(key) || 0) < DELAY_BETWEEN_PROMPTS) return;
    } catch { return; }
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      try { localStorage.setItem(key, String(Date.now())); } catch { return; }
      setOpen(true);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [target]);

  if (!open || !target) return null;
  return <ReviewDialog reference={target.bookingReference} entityName={target.entityName || 'votre voyage'} review={null}
    onClose={() => setOpen(false)} onChanged={() => {
      client.invalidateQueries({ queryKey: ['reviews', 'mine', target.bookingReference] });
      client.invalidateQueries({ queryKey: ['reviews', 'all-mine'] });
      setOpen(false);
    }} />;
}
