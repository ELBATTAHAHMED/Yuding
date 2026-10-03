'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useDestinationImages } from '@/hooks/queries/useDestinationImages';

export function HomeFinalCta() {
  const section = useRef<HTMLElement>(null);
  const [loadPhotos, setLoadPhotos] = useState(false);
  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoadPhotos(true); observer.disconnect(); } }, { rootMargin: '700px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  const day = useDestinationImages(loadPhotos ? { city: 'Azores', country: 'Portugal', limit: 8 } : null).data?.images;
  const night = useDestinationImages(loadPhotos ? { city: 'Azores sunset', country: 'Portugal', limit: 8 } : null).data?.images;
  const dayPhoto = day?.find(image => image.sourceAssetId === '33515018' || image.id.includes('33515018')) || day?.[0];
  const nightPhoto = night?.find(image => image.sourceAssetId === '29765233' || image.id.includes('29765233')) || night?.[0];
  return <section ref={section} className="home-v3__end" aria-labelledby="end-title">
    <div className="home-v3__end-photo" aria-hidden="true">
      {dayPhoto && <Image className="home-v3__end-image--day" src={dayPhoto.url} alt="" fill sizes="100vw" />}
      {nightPhoto && <Image className="home-v3__end-image--night" src={nightPhoto.url} alt="" fill sizes="100vw" />}
    </div>
    <div className="home-v3__end-shade" />
    <div className="home-v3__frame home-v3__end-content home-v3__reveal"><span className="home-v3__chapter">À VOUS D&apos;ÉCRIRE LA SUITE</span><h2 id="end-title">La suite commence<br /><em>quelque part.</em></h2><div><p>Un lieu précis en tête, ou simplement l&apos;envie de partir : commencez par là.</p><a href="#home-search">Trouver mon prochain voyage <i className="fas fa-arrow-up" aria-hidden="true" /></a></div></div>
  </section>;
}
