'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { imageService } from '@/services/image.service';
import { displayFeaturedText } from '@/lib/featured-destinations';

interface FeaturedDestination {
  id: string;
  city: string;
  country: string;
  countryLabel: string;
  imageId?: string | null;
  imageUrl?: string | null;
  line: string;
  detail: string;
  targetUrl: string;
}

const safeImage = (url?: string | null) => url && !url.includes('\\') && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : undefined;
const safeDestination = (url: string) => /^\/(?!\/)/.test(url) && !url.includes('\\') ? url : '/hotels';
const cityName = (city: string) => city === 'Lisbon' ? 'Lisbonne' : city;

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomeDestinations() {
  const section = useRef<HTMLElement>(null);
  const entries = useRef<(HTMLElement | null)[]>([]);
  const [loadPhotos, setLoadPhotos] = useState(false);
  const [active, setActive] = useState(0);
  const destinations = useQuery({
    queryKey: ['travel', 'featured-destinations'],
    queryFn: () => apiClient.get<FeaturedDestination[]>('/travel/destinations/featured'),
    staleTime: 60_000,
    retry: false,
  });
  const chapters = destinations.data ?? [];
  const chapterKey = chapters.map(chapter => chapter.id).join('|');
  const photos = useQueries({ queries: chapters.map((chapter) => ({
    queryKey: queryKeys.travel.destinationImages(chapter.city, chapter.country, 8),
    queryFn: () => imageService.getDestinationImages({ city: chapter.city, country: chapter.country, limit: 8 }),
    enabled: loadPhotos && !safeImage(chapter.imageUrl),
    staleTime: 30 * 60_000,
    retry: 1,
  })) });

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoadPhotos(true); observer.disconnect(); } }, { rootMargin: '700px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActive(0);
    entries.current.length = chapters.length;
    const ratios = new Map<Element, number>();
    let selected = 0;
    const observer = new IntersectionObserver((changes) => {
      changes.forEach(change => ratios.set(change.target, change.isIntersecting ? change.intersectionRatio : 0));
      const current = entries.current[selected];
      const currentRatio = current ? ratios.get(current) ?? 0 : 0;
      const best = Array.from(ratios.entries()).reduce<[Element | null, number]>((result, entry) => entry[1] > result[1] ? entry : result, [null, 0]);
      if (best[0] && best[1] > currentRatio + 0.05) {
        const next = Number((best[0] as HTMLElement).dataset.chapter);
        if (next !== selected) { selected = next; setActive(next); }
      }
    }, { rootMargin: '-28% 0px -28% 0px', threshold: [0, .25, .5, .75] });
    entries.current.forEach(element => { if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [chapterKey, chapters.length]);

  const selected = Math.min(active, Math.max(0, chapters.length - 1));
  const imageFor = (chapter: FeaturedDestination, index: number) => {
    const images = photos[index]?.data?.images;
    return safeImage(chapter.imageUrl) || safeImage(images?.find(image => chapter.imageId && (image.sourceAssetId === chapter.imageId || image.id.includes(chapter.imageId)))?.url) || safeImage(images?.[0]?.url);
  };
  const photoKey = chapters.map((chapter, index) => imageFor(chapter, index) ?? '').join('|');

  useGSAP(() => {
    if (!chapters.length) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Destination data can arrive after the section has entered the viewport;
      // keep this reveal positional so late initialization never hides content.
      gsap.from('.home-journey__heading, .home-journey__chapter', {
        y: 22,
        duration: .7,
        ease: 'power2.out',
        stagger: .08,
        scrollTrigger: { trigger: section.current, start: 'top 74%', once: true },
      });
    });
    return () => mm.revert();
  }, { scope: section, dependencies: [chapterKey, photoKey], revertOnUpdate: true });

  const indexLabel = (index: number) => String(index + 1).padStart(2, '0');

  return <section ref={section} className="home-v3__destinations home-journey" aria-labelledby="destinations-title">
    <div className="home-v3__frame home-journey__heading"><span className="home-v3__chapter">03 / SUR LA ROUTE</span><h2 id="destinations-title">Et si vous suiviez<br /><em>l’envie du moment ?</em></h2><p>Des horizons et autant de façons de se laisser surprendre.</p></div>
    {destinations.isLoading ? <p className="home-v3__frame" role="status">Chargement des destinations…</p> : destinations.isError ? <p className="home-v3__frame" role="status">Les destinations sont momentanément indisponibles.</p> : chapters.length === 0 ? <p className="home-v3__frame">De nouvelles destinations arrivent bientôt.</p> :
    <div className="home-v3__frame home-journey__layout">
      <div className="home-journey__stage" aria-hidden="true">
        {chapters.map((chapter, index) => <div key={chapter.id} className={`home-journey__photo${selected === index ? ' is-active' : ''}`}>
          {imageFor(chapter, index) && <Image src={imageFor(chapter, index)!} alt="" fill sizes="(max-width: 900px) 100vw, 55vw" />}
        </div>)}
        <span className="home-journey__index">{indexLabel(selected)} <span>/ {String(chapters.length).padStart(2, '0')}</span></span>
      </div>
      <div className="home-journey__chapters">
        {chapters.map((chapter, index) => <article key={chapter.id} className={`home-journey__chapter${selected === index ? ' is-active' : ''}`} data-chapter={index} ref={element => { entries.current[index] = element; }}>
          <div className="home-journey__mobile-photo">{imageFor(chapter, index) && <Image src={imageFor(chapter, index)!} alt={`${cityName(chapter.city)}, ${chapter.countryLabel}`} fill sizes="100vw" />}</div>
          <span className="home-journey__eyebrow">{indexLabel(index)} / {cityName(chapter.city).toUpperCase()} · {chapter.countryLabel.toUpperCase()}</span>
          <h3>{displayFeaturedText(chapter.line)}</h3><p>{displayFeaturedText(chapter.detail)}</p>
          <Link prefetch={false} href={safeDestination(chapter.targetUrl)}>Découvrir {cityName(chapter.city)} <i className="fas fa-arrow-up-right" aria-hidden="true" /></Link>
        </article>)}
      </div>
    </div>}
  </section>;
}
