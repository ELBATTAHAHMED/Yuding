'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { reviewService, type FeaturedReview } from '@/services/review.service';

const labels: Record<FeaturedReview['entityType'], string> = {
  ACCOMMODATION: 'Un séjour', ACTIVITY: 'Une activité', FLIGHT: 'Un vol', TRANSFER: 'Un transfert',
  TRAIN: 'Un trajet en train', PLATFORM: 'Yuding', EXPERIENCE: 'Une expérience',
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'Y';

export function HomeReviews() {
  const root = useRef<HTMLElement>(null);
  const startX = useRef<number | null>(null);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [manualUntil, setManualUntil] = useState(0);

  useEffect(() => {
    let live = true;
    reviewService.featured().then(items => { if (live) setReviews(items.filter(item => item.content?.trim())); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .22 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [reviews.length]);

  useEffect(() => {
    if (reviews.length < 2 || !inView || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => { if (Date.now() > manualUntil) setIndex(current => (current + 1) % reviews.length); }, 6200);
    return () => window.clearInterval(timer);
  }, [reviews.length, inView, paused, manualUntil]);

  useGSAP(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.home-stories__active', { opacity: .35, y: 13 }, { opacity: 1, y: 0, duration: .55, ease: 'power2.out' });
  }, { scope: root, dependencies: [index], revertOnUpdate: true });

  const change = (next: number) => { setManualUntil(Date.now() + 12000); setIndex((next + reviews.length) % reviews.length); };
  if (reviews.length === 0) return null;
  const active = reviews[index];
  const next = reviews[(index + 1) % reviews.length];

  return <section ref={root} className="home-v3__reviews home-stories" aria-labelledby="home-reviews-title"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    onTouchStart={event => { startX.current = event.touches[0]?.clientX ?? null; }}
    onTouchEnd={event => { if (startX.current === null) return; const delta = event.changedTouches[0]?.clientX - startX.current; if (Math.abs(delta) > 45) change(index + (delta < 0 ? 1 : -1)); startX.current = null; }}>
    <div className="home-v3__frame home-stories__layout">
      <header className="home-stories__intro"><span className="home-v3__chapter">04 / PAROLES DE VOYAGEURS</span>
        <h2 id="home-reviews-title">Ils sont partis.<br /><em>Ils racontent.</em></h2>
        <p>Des expériences partagées après le retour, publiées par de vrais voyageurs.</p>
        <Link href="/account/reviews">Votre expérience à raconter ? <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
      </header>
      <div className="home-stories__stage">
        <article className="home-stories__active" key={`${active.createdAt}-${index}`}>
          <div className="home-stories__top"><span className="home-stories__kind">{labels[active.entityType]}</span><span className="home-stories__rating" aria-label={`${active.rating} étoiles sur 5`}>{'★'.repeat(active.rating)}<span>{'☆'.repeat(5 - active.rating)}</span></span></div>
          <blockquote>« {active.content} »</blockquote>
          <div className="home-stories__person"><span className={`home-stories__avatar home-stories__avatar--${index % 4}`} aria-hidden="true">{initials(active.displayName)}</span>
            <span><strong>{active.displayName}</strong><small>{active.entityName}{active.verifiedBooking ? ' · Expérience vérifiée' : ''}</small></span></div>
        </article>
        <nav className="home-stories__controls" aria-label="Parcourir les récits">
          <span className="home-stories__count">{String(index + 1).padStart(2, '0')} <span>/</span> {String(reviews.length).padStart(2, '0')}</span>
          {reviews.length > 1 && <>
            <button type="button" className="home-stories__next" onClick={() => change(index + 1)} aria-label={`Lire l’avis de ${next.displayName}`}>
              <span>À suivre <strong>{next.displayName}</strong><small>{labels[next.entityType]}</small></span><span aria-hidden="true">↗</span>
            </button>
            <div className="home-stories__arrows"><button type="button" aria-label="Avis précédent" onClick={() => change(index - 1)}>←</button><button type="button" aria-label="Avis suivant" onClick={() => change(index + 1)}>→</button></div>
          </>}
        </nav>
      </div>
    </div>
  </section>;
}
