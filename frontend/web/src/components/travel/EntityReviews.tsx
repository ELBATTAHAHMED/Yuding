'use client';

import { useQuery } from '@tanstack/react-query';
import { reviewService, type ReviewTarget } from '@/services/review.service';

export function EntityReviews({ type, provider, reference }: { type: ReviewTarget; provider: string; reference: string }) {
  const query = useQuery({ queryKey: ['reviews', 'public', type, provider, reference],
    queryFn: () => reviewService.public(type, provider, reference), enabled: Boolean(provider && reference) });
  return <section className="entity-reviews" aria-labelledby="entity-reviews-title">
    <div className="entity-reviews-head"><div><p className="review-kicker">AVIS YUDING</p><h2 id="entity-reviews-title">Retours des voyageurs</h2></div>
      {query.data && query.data.reviewCount > 0 && <strong><i className="fas fa-star" aria-hidden="true" /> {query.data.averageRating?.toFixed(1)} / 5
        <span> · {query.data.reviewCount} avis vérifié{query.data.reviewCount > 1 ? 's' : ''}</span></strong>}</div>
    {query.isPending && <p>Chargement des avis…</p>}
    {query.isError && <p>Les avis sont temporairement indisponibles.</p>}
    {query.data?.reviewCount === 0 && <p>Aucun avis Yuding publié pour le moment.</p>}
    {query.data?.reviews.map((review, index) => <article key={`${review.createdAt}-${index}`} className="entity-review">
      <div><strong>{review.displayName}</strong><span aria-label={`${review.rating} étoiles sur 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
      {review.content && <p>{review.content}</p>}
      <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('fr-FR')}</time>
    </article>)}
  </section>;
}
