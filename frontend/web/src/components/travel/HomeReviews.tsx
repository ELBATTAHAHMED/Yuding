'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { homepageReviewFixtures } from './homepageReviewFixtures';

export function HomeReviews() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const bounds = sectionRef.current?.getBoundingClientRect();
      if (document.visibilityState === 'visible' && bounds && bounds.top < window.innerHeight && bounds.bottom > 0) {
        setIndex((current) => (current + 1) % homepageReviewFixtures.length);
      }
    }, 7500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const active = homepageReviewFixtures[index];
  return <section ref={sectionRef} className="home-v3__reviews" aria-labelledby="home-reviews-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="home-v3__frame home-v3__reviews-grid">
      <div className="home-v3__reviews-intro"><span className="home-v3__chapter">04 / CARNETS DE VOYAGE</span><h2 id="home-reviews-title">Quelques mots<br /><em>du voyage.</em></h2><p>Des exemples de récits pour imaginer ce que vous pourriez vivre.</p><span className="home-v3__reviews-disclosure">Avis de démonstration · contenu fictif</span></div>
      <div className="home-v3__reviews-feature">
        <div className="home-v3__reviews-image">{homepageReviewFixtures.map((item, i) => <div key={item.destination} className={i === index ? 'is-active' : ''}><Image src={item.image} alt="" fill sizes="(max-width: 900px) 100vw, 30vw" /></div>)}</div>
        <div className="home-v3__reviews-story"><span className="home-v3__review-place">{String(index + 1).padStart(2, '0')} / {String(homepageReviewFixtures.length).padStart(2, '0')} &nbsp;·&nbsp; {active.destination}</span><span className="home-v3__reviews-example">Exemple fictif · non publié</span><blockquote key={index} className="home-v3__review-quote"><p>« {active.content} »</p><footer>{active.name} (exemple) <span aria-label={`${active.rating} étoiles sur 5`}>· {'★'.repeat(active.rating)}</span></footer></blockquote><div className="home-v3__review-controls" aria-label="Parcourir les exemples d’avis"><button type="button" aria-label="Avis précédent" onClick={() => setIndex((current) => (current - 1 + homepageReviewFixtures.length) % homepageReviewFixtures.length)}><i className="fas fa-arrow-left" aria-hidden="true" /></button><button type="button" aria-label="Avis suivant" onClick={() => setIndex((current) => (current + 1) % homepageReviewFixtures.length)}><i className="fas fa-arrow-right" aria-hidden="true" /></button></div></div>
      </div>
    </div>
  </section>;
}
