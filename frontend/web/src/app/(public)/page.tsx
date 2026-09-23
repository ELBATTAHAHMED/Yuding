'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';
import { imageService } from '@/services/image.service';
import type { ImageAsset } from '@/types/image.types';
import { useDestinationImages } from '@/hooks/queries/useDestinationImages';

type TravelMode = {
  id: 'all' | 'hotels' | 'flights' | 'activities' | 'transfers' | 'trains';
  label: string;
  shortLabel: string;
  icon: string;
  href: string;
};

const modes: TravelMode[] = [
  { id: 'all', label: 'Tous les voyages', shortLabel: 'Tout', icon: 'fa-compass', href: '/hotels' },
  { id: 'hotels', label: 'Hébergements', shortLabel: 'Séjours', icon: 'fa-bed', href: '/hotels' },
  { id: 'flights', label: 'Vols', shortLabel: 'Vols', icon: 'fa-plane-departure', href: '/flights' },
  { id: 'activities', label: 'Activités', shortLabel: 'À faire', icon: 'fa-person-hiking', href: '/activities' },
  { id: 'transfers', label: 'Transferts', shortLabel: 'Transferts', icon: 'fa-car-side', href: '/transfers' },
  { id: 'trains', label: 'Trains', shortLabel: 'Trains', icon: 'fa-train', href: '/trains' },
];

const inspiration = [
  { city: 'Marrakech', country: 'Maroc', image: '/image/marrakech.jpg', note: 'Culture & lumière', href: '/hotels?destination=Marrakech&countryCode=MA' },
  { city: 'Chefchaouen', country: 'Maroc', image: '/image/chefchaoun.jpeg', note: 'Escapade bleue', href: '/hotels?destination=Chefchaouen&countryCode=MA' },
  { city: 'Dakhla', country: 'Maroc', image: '/image/Dakhla.jpg', note: 'Mer & désert', href: '/activities?destination=Dakhla&countryCode=MA' },
  { city: 'New York', country: 'États-Unis', image: '/image/NewYork.jpg', note: 'City break', href: '/hotels?destination=New%20York&countryCode=US' },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default function HomePage() {
  const router = useRouter();
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [error, setError] = useState<string | null>(null);
  const [destinationImage, setDestinationImage] = useState<ImageAsset | null>(null);
  const [destinationImageLoading, setDestinationImageLoading] = useState(false);
  const { data: newYorkImages } = useDestinationImages({ city: 'New York', country: 'United States', limit: 1 });
  const newYorkImage = newYorkImages?.images?.[0];

  const today = useMemo(() => formatDate(new Date()), []);
  const minReturn = useMemo(() => {
    if (!departure) return today;
    const next = new Date(departure + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    return formatDate(next);
  }, [departure, today]);

  useEffect(() => {
    let active = true;
    if (!place) {
      setDestinationImage(null);
      return () => { active = false; };
    }
    setDestinationImageLoading(true);
    imageService.getDestinationImages({
      city: place.city || place.name,
      country: place.country,
      countryCode: place.countryCode,
      limit: 1,
    }).then((response) => {
      if (active) setDestinationImage(response.images?.[0] || null);
    }).catch(() => {
      if (active) setDestinationImage(null);
    }).finally(() => {
      if (active) setDestinationImageLoading(false);
    });
    return () => { active = false; };
  }, [place]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!place) {
      setError('Sélectionnez une destination pour lancer la recherche.');
      return;
    }
    if (departure && returnDate && returnDate <= departure) {
      setError('La date de retour doit suivre la date de départ.');
      return;
    }
    const params = new URLSearchParams({
      destination: place.city || place.name,
      countryCode: place.countryCode || '',
      adults: travelers,
    });
    if (place.country) params.set('country', place.country);
    if (departure) params.set('checkIn', departure);
    if (returnDate) params.set('checkOut', returnDate);
    router.push('/hotels?' + params.toString());
  };

  return (
    <div className="home-rebuild">
      <section className="departure-hero" aria-labelledby="departure-title">
        <video className="departure-hero__video" autoPlay muted loop playsInline preload="metadata" poster="/image/home1.jpg" aria-hidden="true">
          <source src="/image/video.mp4" type="video/mp4" />
        </video>
        <div className="departure-hero__shade" />
        <div className="departure-hero__route" aria-hidden="true"><span /><span /><span /></div>
        <div className="home-frame departure-hero__frame">
          <div className="departure-hero__copy">
            <p className="departure-overline"><span className="departure-pulse" /> YUDING / VOTRE DÉPART COMMENCE ICI</p>
            <h1 id="departure-title">Partez avec une longueur d’avance.</h1>
            <p className="departure-hero__sub">Séjours, vols, expériences et trajets : trouvez la bonne façon de partir, au même endroit.</p>
            <div className="departure-hero__signals"><span><i className="fas fa-location-arrow" aria-hidden="true" /> Destination</span><span><i className="fas fa-calendar" aria-hidden="true" /> Vos dates</span><span><i className="fas fa-compass" aria-hidden="true" /> Cinq façons de voyager</span></div>
          </div>
          <div className="departure-board" aria-label="Inspiration de départs">
            <div className="departure-board__top"><span>PROCHAINES IDÉES</span><i className="fas fa-ellipsis" aria-hidden="true" /></div>
            <div className="departure-board__line"><span className="departure-board__code">RAK</span><strong>Marrakech</strong><small>Maroc</small><b>À explorer</b></div>
            <div className="departure-board__line"><span className="departure-board__code">CDG</span><strong>Paris</strong><small>France</small><b>À composer</b></div>
            <div className="departure-board__line"><span className="departure-board__code">VIL</span><strong>Dakhla</strong><small>Maroc</small><b>À ressentir</b></div>
            <div className="departure-board__foot"><span className="departure-board__dot" /> Votre prochaine destination reste ouverte.</div>
          </div>
        </div>

        <div className="home-frame search-dock" id="home-search">
          <div className="search-dock__intro"><p>PLANIFIER UN DÉPART</p><h2>Où allez-vous ?</h2></div>
          <nav className="search-dock__modes" aria-label="Autres recherches de voyage">
            {modes.slice(1).map((item) => item.id === 'hotels'
              ? <span key={item.id} className="is-active" aria-current="page"><i className={'fas ' + item.icon} aria-hidden="true" /><span className="search-dock__mode-label">{item.label}</span><span className="search-dock__mode-short">{item.shortLabel}</span></span>
              : <Link key={item.id} href={item.href}><i className={'fas ' + item.icon} aria-hidden="true" /><span className="search-dock__mode-label">{item.label}</span><span className="search-dock__mode-short">{item.shortLabel}</span></Link>)}
          </nav>
          <form className="search-dock__form" onSubmit={submitSearch}>
            <div className="dock-field dock-field--destination"><GeoPlaceSelector id="home-destination" label="Destination" placeholder="Ville ou lieu" type="city" selectedPlace={place} onSelect={(next) => { setPlace(next); setError(null); }} error={error && !place ? error : null} required /></div>
            <div className="dock-field"><label htmlFor="home-departure"><i className="fas fa-calendar-day" aria-hidden="true" /> Départ</label><input id="home-departure" type="date" min={today} value={departure} onChange={(event) => { setDeparture(event.target.value); setError(null); }} /></div>
            <div className="dock-field"><label htmlFor="home-return"><i className="fas fa-calendar-check" aria-hidden="true" /> Retour</label><input id="home-return" type="date" min={minReturn} value={returnDate} onChange={(event) => { setReturnDate(event.target.value); setError(null); }} /></div>
            <div className="dock-field"><label htmlFor="home-passengers"><i className="fas fa-user-group" aria-hidden="true" /> Voyageurs</label><select id="home-passengers" value={travelers} onChange={(event) => setTravelers(event.target.value)}><option value="1">1 voyageur</option><option value="2">2 voyageurs</option><option value="3">3 voyageurs</option><option value="4">4 voyageurs</option><option value="5">5 voyageurs</option><option value="6">6 voyageurs</option></select></div>
            <button className="dock-submit" type="submit"><span>Voir les séjours</span><i className="fas fa-arrow-right" aria-hidden="true" /></button>
          </form>
          {error && place && <p className="dock-error" role="alert">{error}</p>}
        </div>
      </section>

      {place && (destinationImage || destinationImageLoading) && (
        <section className="selected-destination" aria-live="polite">
          <div className="home-frame selected-destination__inner">
            <div><p className="departure-overline">DESTINATION SÉLECTIONNÉE</p><h2>{place.city || place.name}</h2><p>{place.country || 'Destination'}</p></div>
            {destinationImageLoading ? <div className="selected-destination__loading">Chargement de l’image de destination…</div> : destinationImage ? <div className="selected-destination__image"><img src={destinationImage.url} alt={destinationImage.altText || 'Image contextuelle de destination'} /><small>Photo contextuelle : {destinationImage.photographerName || 'photographe'} · <a href={destinationImage.photographerUrl || destinationImage.sourcePageUrl || 'https://www.pexels.com'} target="_blank" rel="noopener noreferrer">Pexels</a></small></div> : null}
          </div>
        </section>
      )}

      <section className="inspiration-section" aria-labelledby="inspiration-title">
        <div className="home-frame">
          <div className="section-intro"><div><p className="departure-overline">CHOISIR UNE DIRECTION</p><h2 id="inspiration-title">Les départs commencent par une envie.</h2></div><p>Quelques repères visuels pour ouvrir la recherche.</p></div>
          <div className="inspiration-rail">
            {inspiration.map((item, index) => {
              const contextualImage = item.city === 'New York' ? newYorkImage : null;
              return <article key={item.city} className={'inspiration-stop inspiration-stop--' + (index + 1)}>
                <Link href={item.href} className="inspiration-stop__link">
                  <div className="inspiration-stop__image"><Image src={contextualImage?.url || item.image} alt={item.city + ', ' + item.country} fill sizes="(max-width: 720px) 75vw, 25vw" /></div>
                  <div className="inspiration-stop__meta"><span>{item.note}</span><strong>{item.city}</strong><small>{item.country} <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></small></div>
                </Link>
                {contextualImage && <a className="inspiration-stop__credit" href={contextualImage.photographerUrl || contextualImage.sourcePageUrl || 'https://www.pexels.com'} target="_blank" rel="noopener noreferrer">Photo : {contextualImage.photographerName || 'photographe'} / Pexels</a>}
              </article>;
            })}
          </div>
        </div>
      </section>

      <section className="travel-rhythm" aria-label="Les possibilités Yuding">
        <div className="travel-rhythm__ticker"><span>HÉBERGEMENTS</span><i className="fas fa-bed" aria-hidden="true" /><span>VOLS</span><i className="fas fa-plane" aria-hidden="true" /><span>ACTIVITÉS</span><i className="fas fa-compass" aria-hidden="true" /><span>TRANSFERTS</span><i className="fas fa-car" aria-hidden="true" /><span>TRAINS</span><i className="fas fa-train" aria-hidden="true" /></div>
        <div className="home-frame travel-rhythm__inner"><div className="travel-rhythm__headline"><p className="departure-overline">UNE SEULE INTERFACE</p><h2>Tout le trajet<br /><em>en mouvement.</em></h2></div><div className="travel-rhythm__list">{modes.slice(1).map((item, index) => <Link key={item.id} href={item.href}><span>0{index + 1}</span><i className={'fas ' + item.icon} aria-hidden="true" /><strong>{item.label}</strong><b><i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></b></Link>)}</div></div>
      </section>

      <section className="last-call" aria-label="Lancer une recherche"><div className="home-frame last-call__inner"><div><p className="departure-overline">YUDING V2</p><h2>La prochaine étape<br /><em>vous appartient.</em></h2></div><Link href="#home-search" className="last-call__button">Commencer <i className="fas fa-arrow-up" aria-hidden="true" /></Link></div></section>
    </div>
  );
}
