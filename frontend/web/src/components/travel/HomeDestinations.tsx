'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDestinationImages } from '@/hooks/queries/useDestinationImages';
import type { ImageAsset } from '@/types/image.types';

const chapters = [
  { city: 'Dakhla', country: 'Morocco', countryLabel: 'Maroc', imageId: '30560213', line: 'Là où la terre laisse passer l’océan.', detail: 'Le vent, la lagune et des journées qui s’étirent sans programme.', href: '/hotels?destination=Dakhla&countryCode=MA', number: '01' },
  { city: 'Lisbon', country: 'Portugal', countryLabel: 'Portugal', imageId: '26824153', line: 'Perdez une rue. Trouvez une autre lumière.', detail: 'Lisbonne se découvre à pied, colline après colline.', href: '/hotels?destination=Lisbon&countryCode=PT', number: '02' },
  { city: 'Kyoto', country: 'Japan', countryLabel: 'Japon', imageId: '37943558', line: 'Le détour devient le voyage.', detail: 'À Kyoto, ralentir est souvent la plus belle façon d’avancer.', href: '/hotels?destination=Kyoto&countryCode=JP', number: '03' },
] as const;

function useChapterPhoto(city: string, country: string, preferredId: string, enabled: boolean): ImageAsset | undefined {
  const { data } = useDestinationImages(enabled ? { city, country, limit: 8 } : null);
  return data?.images.find(image => image.sourceAssetId === preferredId || image.id.includes(preferredId)) || data?.images[0];
}

export function HomeDestinations() {
  const section = useRef<HTMLElement>(null);
  const [loadPhotos, setLoadPhotos] = useState(false);
  const photos = [
    useChapterPhoto('Dakhla', 'Morocco', chapters[0].imageId, loadPhotos),
    useChapterPhoto('Lisbon', 'Portugal', chapters[1].imageId, loadPhotos),
    useChapterPhoto('Kyoto', 'Japan', chapters[2].imageId, loadPhotos),
  ];
  const [active, setActive] = useState(0);
  const entries = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoadPhotos(true); observer.disconnect(); } }, { rootMargin: '700px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((changes) => {
      const inView = changes.filter(change => change.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (inView) setActive(Number((inView.target as HTMLElement).dataset.chapter));
    }, { rootMargin: '-28% 0px -28% 0px', threshold: [0, .25, .5, .75] });
    entries.current.forEach(element => { if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, []);

  return <section ref={section} className="home-v3__destinations home-journey" aria-labelledby="destinations-title">
    <div className="home-v3__frame home-journey__heading"><span className="home-v3__chapter">03 / SUR LA ROUTE</span><h2 id="destinations-title">Et si vous suiviez<br /><em>l’envie du moment ?</em></h2><p>Trois horizons. Trois façons de se laisser surprendre.</p></div>
    <div className="home-v3__frame home-journey__layout">
      <div className="home-journey__stage" aria-hidden="true">
        {chapters.map((chapter, index) => <div key={chapter.city} className={`home-journey__photo${active === index ? ' is-active' : ''}`}>
          {photos[index] && <Image src={photos[index]!.url} alt="" fill sizes="(max-width: 900px) 100vw, 55vw" />}
        </div>)}
        <span className="home-journey__index">{chapters[active].number} <span>/ 03</span></span>
        <span className="home-journey__place">{chapters[active].city === 'Lisbon' ? 'Lisbonne' : chapters[active].city}</span>
      </div>
      <div className="home-journey__chapters">
        {chapters.map((chapter, index) => <article key={chapter.city} className={`home-journey__chapter${active === index ? ' is-active' : ''}`} data-chapter={index} ref={element => { entries.current[index] = element; }}>
          <div className="home-journey__mobile-photo">{photos[index] && <Image src={photos[index]!.url} alt={photos[index]!.altText || `${chapter.city}, ${chapter.countryLabel}`} fill sizes="100vw" />}</div>
          <span className="home-journey__eyebrow">{chapter.number} / {chapter.city === 'Lisbon' ? 'LISBONNE' : chapter.city.toUpperCase()} · {chapter.countryLabel.toUpperCase()}</span>
          <h3>{chapter.line}</h3><p>{chapter.detail}</p>
          <Link href={chapter.href}>Découvrir {chapter.city === 'Lisbon' ? 'Lisbonne' : chapter.city} <i className="fas fa-arrow-up-right" aria-hidden="true" /></Link>
        </article>)}
      </div>
    </div>
  </section>;
}
