'use client';

import { useEffect, useRef, useState } from 'react';
import { reviewService, type FeaturedReview } from '@/services/review.service';

const contextLabel = (type: FeaturedReview['entityType']) => ({
  ACCOMMODATION: 'Hébergement', ACTIVITY: 'Activité', PLATFORM: 'Yuding', EXPERIENCE: 'Expérience',
})[type] || 'Voyage';
const initials = (name: string) => name === 'Voyageur vérifié' ? 'V' : name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export function HomeReviews() {
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let live = true;
    reviewService.featured().then(items => {
      if (live) { setReviews(items); setState('ready'); }
    }).catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (reviews.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const bounds = sectionRef.current?.getBoundingClientRect();
      if (document.visibilityState === 'visible' && bounds && bounds.top < window.innerHeight && bounds.bottom > 0) {
        setIndex(current => (current + 1) % reviews.length);
      }
    }, 9000);
    return () => window.clearInterval(timer);
  }, [paused, reviews.length]);

  const active = reviews[index];
  const change = (next: number) => { setIndex((next + reviews.length) % reviews.length); setPaused(true); };

  return <section ref={sectionRef} className="home-v3__reviews" aria-labelledby="home-reviews-title"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="home-v3__frame home-v3__review-journey">
      <div className="home-v3__review-lead"><span className="home-v3__chapter">04 / LES VOYAGES VÉCUS</span><h2 id="home-reviews-title">Le voyage continue<br /><em>dans leurs mots.</em></h2><p>Des récits publiés après une réservation vérifiée.</p></div>
      <div className="home-v3__review-content" aria-live="polite">
        {state === 'loading' && <p className="home-v3__review-state">Les récits arrivent…</p>}
        {state === 'error' && <p className="home-v3__review-state">Les avis sont momentanément indisponibles.</p>}
        {state === 'ready' && reviews.length === 0 && <p className="home-v3__review-state">Les premiers récits seront bientôt publiés ici.</p>}
        {active && <>
          <div className="home-v3__review-top"><span>PAROLES DE VOYAGEURS</span><span>{String(index + 1).padStart(2, '0')} <small>/ {String(reviews.length).padStart(2, '0')}</small></span></div>
          <blockquote key={`${active.createdAt}-${index}`} className="home-v3__review-quote"><div className="home-v3__review-rating" aria-label={`${active.rating} étoiles sur 5`}>{'★'.repeat(active.rating)}<span>{'☆'.repeat(5 - active.rating)}</span></div><p>« {active.content} »</p></blockquote>
          <div className="home-v3__review-person"><span className="home-v3__review-avatar" role="img" aria-label={`Avatar de ${active.displayName}`}>{initials(active.displayName)}</span><div><strong>{active.displayName}</strong><span>{active.entityName} · {contextLabel(active.entityType)}</span></div><span className="home-v3__review-verified"><i className="fas fa-check-circle" aria-hidden="true" /> Voyage vérifié</span></div>
        </>}
      </div>
      {reviews.length > 1 && <div className="home-v3__review-track" role="group" aria-label="Parcours des avis"><div className="home-v3__review-track-list">{reviews.map((review, itemIndex) => <button key={`${review.createdAt}-${itemIndex}`} type="button" aria-label={`Afficher l’avis de ${review.displayName}`} aria-current={index === itemIndex ? 'true' : undefined} onClick={() => change(itemIndex)}><span className="home-v3__review-track-avatar">{initials(review.displayName)}</span><span><strong>{review.displayName}</strong><small>{contextLabel(review.entityType)}</small></span></button>)}</div><div className="home-v3__review-arrows"><button type="button" aria-label="Avis précédent" onClick={() => change(index - 1)}>←</button><button type="button" aria-label="Avis suivant" onClick={() => change(index + 1)}>→</button></div></div>}
    </div>
  </section>;
}
