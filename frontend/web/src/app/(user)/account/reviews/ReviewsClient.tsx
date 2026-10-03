'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService, type MyReview, type ReviewTarget } from '@/services/review.service';
import { useMyBookings } from '@/hooks/queries/useBookingQueries';
import { ReviewDialog } from '../bookings/ReviewDialog';

const targetLabels: Record<ReviewTarget, string> = {
  ACCOMMODATION: 'Hébergement', ACTIVITY: 'Activité', FLIGHT: 'Vol',
  TRANSFER: 'Transfert', TRAIN: 'Train', PLATFORM: 'Yuding', EXPERIENCE: 'Expérience',
};

const statusLabels: Record<MyReview['status'], string> = {
  APPROVED: 'Publié', PENDING_MODERATION: 'En cours de modération',
  REJECTED: 'Non publié', DELETED: 'Supprimé',
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date);
}

export default function ReviewsClient() {
  const client = useQueryClient();
  const reviews = useQuery({ queryKey: ['reviews', 'all-mine'], queryFn: reviewService.allMine });
  const platform = useQuery({
    queryKey: ['reviews', 'platform-mine'], queryFn: reviewService.platformMine,
    retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const bookings = useMyBookings({ enabled: reviews.isSuccess });
  const [selected, setSelected] = useState<MyReview | { reference: string; entityName: string } | 'platform' | null>(null);
  const visibleReviews = reviews.data?.filter(review => review.status !== 'DELETED' && review.entityType !== 'PLATFORM') || [];
  const platformReview = platform.data || null;
  const candidates = useMemo(() => {
    const reviewed = new Set(reviews.data?.map(review => review.bookingReference).filter(Boolean));
    return (bookings.data || []).filter(booking =>
      (booking.status === 'CONFIRMED' || booking.status === 'PAID') &&
      !reviewed.has(booking.bookingReference));
  }, [bookings.data, reviews.data]);
  const eligibility = useQueries({ queries: candidates.map(booking => ({
    queryKey: ['reviews', 'eligibility', booking.bookingReference],
    queryFn: () => reviewService.eligibility(booking.bookingReference),
    staleTime: 60_000,
  })) });
  const existingByBooking = useQueries({ queries: candidates.map(booking => ({
    queryKey: ['reviews', 'mine', booking.bookingReference],
    queryFn: () => reviewService.mine(booking.bookingReference),
    staleTime: 60_000,
  })) });
  const pending = candidates.flatMap((booking, index) => eligibility[index]?.data?.eligible && existingByBooking[index]?.isSuccess && !existingByBooking[index].data
    ? [{ booking, target: eligibility[index].data! }] : []);
  const pendingLoading = bookings.isPending || eligibility.some(query => query.isPending) || existingByBooking.some(query => query.isPending);
  const pendingError = bookings.isError || eligibility.some(query => query.isError) || existingByBooking.some(query => query.isError);
  const pendingSelection = selected && selected !== 'platform' && 'reference' in selected ? selected : null;
  const existingSelection = selected && selected !== 'platform' && 'id' in selected ? selected : null;

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['reviews', 'all-mine'] });
    client.invalidateQueries({ queryKey: ['reviews', 'platform-mine'] });
    client.invalidateQueries({ queryKey: ['reviews', 'public'] });
    const reference = pendingSelection?.reference || existingSelection?.bookingReference;
    if (reference) {
      client.invalidateQueries({ queryKey: ['reviews', 'mine', reference] });
    }
  };

  return <main className="account-empty-page account-reviews-page">
    <header className="account-page-header">
      <div><h1>Mes Avis</h1><p>Retrouvez vos impressions de voyage et partagez votre expérience avec Yuding.</p></div>
      <span className="account-header-mark"><i className="fas fa-star" aria-hidden="true" /></span>
    </header>

    <section className="account-review-platform" aria-labelledby="platform-review-title">
      <div>
        <h2 id="platform-review-title">Votre expérience avec Yuding</h2>
        <p>Un avis sur la plateforme nous aide à améliorer le parcours de voyage. Une note suffit ; quelques mots sont facultatifs.</p>
        {platformReview && platformReview.status !== 'DELETED' && <span className="account-review-rating" aria-label={`${platformReview.rating} étoiles sur 5`}>{'★'.repeat(platformReview.rating)}{'☆'.repeat(5 - platformReview.rating)}</span>}
      </div>
      {platform.isPending ? <span className="account-review-muted">Chargement…</span> : platform.isError ?
        <div className="account-review-error" role="alert">Votre avis Yuding ne peut pas être chargé pour le moment.
          <button type="button" onClick={() => platform.refetch()}>Réessayer</button>
        </div> :
        platformReview?.status === 'DELETED' ? <span className="account-review-muted">Votre avis a été supprimé.</span> :
        <button type="button" className="account-primary-action" onClick={() => setSelected('platform')}>
          <i className="fas fa-star" aria-hidden="true" /> {platformReview ? 'Voir mon avis Yuding' : 'Donner mon avis sur Yuding'}
        </button>}
    </section>

    <section className="account-review-pending" aria-labelledby="review-pending-title">
      <div className="account-review-section-head"><h2 id="review-pending-title">À donner</h2></div>
      <p className="account-review-section-intro">Ces voyages sont terminés et peuvent recevoir votre avis. Une note suffit, et vous pouvez ajouter un commentaire si vous le souhaitez.</p>
      {reviews.isSuccess && pendingLoading && <p className="account-review-muted" role="status">Recherche de vos voyages à évaluer…</p>}
      {reviews.isSuccess && pendingError && <div className="account-review-error" role="alert">Impossible de vérifier toutes vos réservations pour le moment.
        <button type="button" onClick={() => {
          if (bookings.isError) bookings.refetch();
          eligibility.forEach(query => { if (query.isError) query.refetch(); });
          existingByBooking.forEach(query => { if (query.isError) query.refetch(); });
        }}>Réessayer</button></div>}
      {pending.map(({ booking, target }) => <article className="account-review-row" key={booking.bookingReference}>
        <div className="account-review-row-main">
          <span className="account-review-category">{target.entityType ? targetLabels[target.entityType] : booking.productType}</span>
          <h3>{target.entityName || `${booking.productType} · ${booking.bookingReference}`}</h3>
          <p className="account-review-prompt">Si vous le souhaitez, racontez-nous comment s’est passé ce voyage.</p>
          <div className="account-review-meta"><span>Réservation {booking.bookingReference}</span></div>
        </div>
        <button type="button" className="btn-secondary-sm" onClick={() => setSelected({ reference: booking.bookingReference,
          entityName: target.entityName || 'votre voyage' })}>Donner mon avis</button>
      </article>)}
      {reviews.isSuccess && !pendingLoading && !pendingError && pending.length === 0 &&
        <p className="account-review-muted account-review-none">Aucun voyage à évaluer pour le moment.</p>}
    </section>

    <section className="account-review-history" aria-labelledby="review-history-title">
      <div className="account-review-section-head"><h2 id="review-history-title">Mes avis de voyage</h2>
        <Link href="/account/bookings">Voir mes réservations <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div>
      {reviews.isPending && <p className="account-review-muted" role="status">Chargement de vos avis…</p>}
      {reviews.isError && <div className="account-review-error" role="alert">Vos avis sont momentanément indisponibles.
        <button type="button" onClick={() => reviews.refetch()}>Réessayer</button></div>}
      {reviews.isSuccess && visibleReviews.length === 0 && <div className="account-review-empty">
        <i className="far fa-comment-dots" aria-hidden="true" />
        <div><h3>Pas encore d’avis de voyage</h3><p>Après votre voyage, une invitation apparaîtra sur la réservation concernée si elle peut être évaluée.</p></div>
      </div>}
      {visibleReviews.length > 0 && <div className="account-review-list">{visibleReviews.map(review =>
        <article className="account-review-row" key={review.id}>
          <div className="account-review-row-main">
            <span className="account-review-category">{targetLabels[review.entityType] || 'Voyage'}</span>
            <h3>{review.entityName || targetLabels[review.entityType]}</h3>
            <span className="account-review-rating" aria-label={`${review.rating} étoiles sur 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            {review.content && <p>{review.content}</p>}
            <div className="account-review-meta"><span>{statusLabels[review.status]}</span>
              {formatDate(review.updatedAt) && <time dateTime={review.updatedAt}>{formatDate(review.updatedAt)}</time>}
              {review.bookingReference && <span>Réservation {review.bookingReference}</span>}</div>
          </div>
          <button type="button" className="btn-secondary-sm" onClick={() => setSelected(review)}>Voir / modifier</button>
        </article>
      )}</div>}
    </section>
    {selected && <ReviewDialog key={selected === 'platform' ? 'platform' : pendingSelection?.reference || existingSelection?.id}
      platform={selected === 'platform'}
      reference={pendingSelection?.reference || existingSelection?.bookingReference || undefined}
      entityName={selected === 'platform' ? 'Yuding' : pendingSelection?.entityName || existingSelection?.entityName || 'votre voyage'}
      review={selected === 'platform' ? platformReview : existingSelection}
      onClose={() => setSelected(null)} onChanged={refresh} />}
  </main>;
}
