'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';
import { imageService } from '@/services/image.service';
import type { ImageAsset } from '@/types/image.types';

type TravelMode = {
  id: 'hotels' | 'flights' | 'activities' | 'transfers' | 'trains';
  label: string;
  icon: string;
  href: string;
  action: string;
};

const modes: TravelMode[] = [
  { id: 'hotels', label: 'Hébergements', icon: 'fa-bed', href: '/hotels', action: 'Voir les séjours' },
  { id: 'flights', label: 'Vols', icon: 'fa-plane-departure', href: '/flights', action: 'Trouver un vol' },
  { id: 'activities', label: 'Activités', icon: 'fa-person-hiking', href: '/activities', action: 'Trouver une activité' },
  { id: 'transfers', label: 'Transferts', icon: 'fa-car-side', href: '/transfers', action: 'Organiser un transfert' },
  { id: 'trains', label: 'Trains', icon: 'fa-train', href: '/trains', action: 'Chercher un train' },
];

const destinations = [
  { city: 'Marrakech', country: 'Maroc', kicker: 'Lumière oblique', image: '/image/marrakech.jpg', href: '/hotels?destination=Marrakech&countryCode=MA', size: 'wide' },
  { city: 'Kyoto', country: 'Japon', kicker: 'Rituels du matin', image: '/image/Seoul.jpg', href: '/activities?destination=Kyoto', size: 'tall' },
  { city: 'Dakhla', country: 'Maroc', kicker: 'Vent du large', image: '/image/Dakhla.jpg', href: '/activities?destination=Dakhla&countryCode=MA', size: 'small' },
  { city: 'New York', country: 'États-Unis', kicker: 'Après la dernière rame', image: '/image/NewYork.jpg', href: '/hotels?destination=New%20York&countryCode=US', size: 'small' },
];

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<TravelMode['id']>('hotels');
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [departure, setDeparture] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [error, setError] = useState<string | null>(null);
  const [destinationImage, setDestinationImage] = useState<ImageAsset | null>(null);
  const [destinationImageLoading, setDestinationImageLoading] = useState(false);

  const today = useMemo(() => formatDate(new Date()), []);
  const minReturn = useMemo(() => {
    if (!departure) return today;
    const next = new Date(departure + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    return formatDate(next);
  }, [departure, today]);
  const activeMode = modes.find((item) => item.id === mode) || modes[0];

  useEffect(() => {
    let active = true;
    if (!place) {
      setDestinationImage(null);
      return () => { active = false; };
    }
    setDestinationImageLoading(true);
    imageService.getDestinationImages({ city: place.city || place.name, country: place.country, countryCode: place.countryCode, limit: 1 })
      .then((response) => { if (active) setDestinationImage(response.images?.[0] || null); })
      .catch(() => { if (active) setDestinationImage(null); })
      .finally(() => { if (active) setDestinationImageLoading(false); });
    return () => { active = false; };
  }, [place]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!place) {
      setError('Choisissez une destination pour commencer.');
      return;
    }
    if (departure && returnDate && returnDate <= departure) {
      setError('La date de retour doit suivre la date de départ.');
      return;
    }
    const params = new URLSearchParams({ destination: place.city || place.name, countryCode: place.countryCode || '', adults: travelers });
    if (place.country) params.set('country', place.country);
    if (departure) params.set('checkIn', departure);
    if (returnDate) params.set('checkOut', returnDate);
    router.push(activeMode.href + '?' + params.toString());
  };

  return (
    <div className="home-v2">
      <section className="home-v2__hero" aria-labelledby="home-title">
        <video className="home-v2__video" autoPlay muted loop playsInline preload="metadata" poster="/image/home1.jpg" aria-hidden="true">
          <source src="/image/video.mp4" type="video/mp4" />
        </video>
        <div className="home-v2__veil" aria-hidden="true" />
        <div className="home-v2__grain" aria-hidden="true" />
        <div className="home-v2__hero-inner home-v2__frame">
          <div className="home-v2__hero-copy">
            <p className="home-v2__eyebrow"><span className="home-v2__eyebrow-dot" /> Yuding / carnet de départ</p>
            <h1 id="home-title">Partir<br /><em>change</em> tout.</h1>
            <p className="home-v2__lede">Une destination, un rythme, une vraie façon d’y arriver.</p>
            <a className="home-v2__scroll" href="#quick-search"><span>Faire défiler</span><i className="fas fa-arrow-down" aria-hidden="true" /></a>
          </div>
          <div className="home-v2__hero-note" aria-label="Note éditoriale">
            <span className="home-v2__note-line" />
            <p>Le monde est vaste.<br />La première piste est simple.</p>
            <small>YUDING / 2026</small>
          </div>
        </div>

        <div className="quick-search home-v2__frame" id="quick-search">
          <div className="quick-search__header">
            <div><p className="home-v2__label">Commencer ici</p><h2>Votre prochaine escale</h2></div>
            <span className="quick-search__hint">Recherche rapide · détails ensuite</span>
          </div>
          <div className="quick-search__tabs" role="tablist" aria-label="Type de voyage">
            {modes.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => { setMode(item.id); setError(null); }}><i className={'fas ' + item.icon} aria-hidden="true" /><span>{item.label}</span></button>)}
          </div>
          <form className="quick-search__form" onSubmit={submitSearch}>
            <div className="quick-search__field quick-search__field--destination"><GeoPlaceSelector id="home-destination" label="Destination" placeholder="Une ville, une région…" type="city" selectedPlace={place} onSelect={(next) => { setPlace(next); setError(null); }} error={error && !place ? error : null} required /></div>
            <label className="quick-search__field"><span><i className="fas fa-calendar-day" aria-hidden="true" /> Départ</span><input type="date" min={today} value={departure} onChange={(event) => { setDeparture(event.target.value); setError(null); }} /></label>
            <label className="quick-search__field"><span><i className="fas fa-calendar-check" aria-hidden="true" /> Retour</span><input type="date" min={minReturn} value={returnDate} onChange={(event) => { setReturnDate(event.target.value); setError(null); }} /></label>
            <label className="quick-search__field"><span><i className="fas fa-user-group" aria-hidden="true" /> Voyageurs</span><select value={travelers} onChange={(event) => setTravelers(event.target.value)}><option value="1">1 voyageur</option><option value="2">2 voyageurs</option><option value="3">3 voyageurs</option><option value="4">4 voyageurs</option><option value="5">5 voyageurs</option><option value="6">6 voyageurs</option></select></label>
            <button className="quick-search__submit" type="submit"><span>{activeMode.action}</span><i className="fas fa-arrow-right" aria-hidden="true" /></button>
          </form>
          {error && place && <p className="quick-search__error" role="alert">{error}</p>}
        </div>
      </section>

      {place && (destinationImage || destinationImageLoading) && <section className="route-preview" aria-live="polite"><div className="home-v2__frame route-preview__inner"><div><p className="home-v2__label">Votre piste</p><h2>{place.city || place.name}</h2><p>{place.country || 'Destination sélectionnée'}</p></div>{destinationImageLoading ? <span className="route-preview__loading">Recherche d’une ambiance…</span> : destinationImage ? <div className="route-preview__image"><img src={destinationImage.url} alt={destinationImage.altText || ('Ambiance de ' + (place.city || place.name))} /><small>Photo contextuelle · <a href={destinationImage.photographerUrl || 'https://www.pexels.com'} target="_blank" rel="noopener noreferrer">Pexels</a></small></div> : null}</div></section>}

      <section className="atlas" aria-labelledby="atlas-title">
        <div className="home-v2__frame">
          <div className="atlas__intro"><div><p className="home-v2__label">Atlas ouvert</p><h2 id="atlas-title">Une envie,<br /><em>plusieurs horizons.</em></h2></div><p>Des idées pour orienter la recherche. Les disponibilités se vérifient ensuite, quand vous êtes prêt.</p></div>
          <div className="atlas__grid">
            {destinations.map((destination, index) => <Link href={destination.href} key={destination.city} className={'atlas-card atlas-card--' + destination.size}><Image src={destination.image} alt={destination.city + ', ' + destination.country} fill sizes="(max-width: 720px) 86vw, (max-width: 1100px) 45vw, 30vw" priority={index === 0} /><span className="atlas-card__wash" /><span className="atlas-card__meta"><small>{destination.kicker}</small><strong>{destination.city}</strong><span>{destination.country} <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></span></span></Link>)}
            <div className="atlas__stamp" aria-hidden="true"><span>Y</span><small>YUDING<br />TRAVEL NOTES</small></div>
          </div>
        </div>
      </section>

      <section className="field-notes" aria-labelledby="field-notes-title">
        <div className="home-v2__frame field-notes__grid"><div className="field-notes__title"><p className="home-v2__label">À votre rythme</p><h2 id="field-notes-title">Composez le<br /><em>bon mouvement.</em></h2><p>Yuding rassemble le départ, le séjour et ce qu’on fait entre les deux. Une recherche claire, puis de la place pour l’imprévu.</p></div><div className="field-notes__list"><div><span>01</span><strong>Le bon point de départ</strong><p>Une destination ou une intuition suffit pour ouvrir une piste.</p></div><div><span>02</span><strong>Le bon tempo</strong><p>Dates, voyageurs et détails restent simples jusqu’à la recherche.</p></div><div><span>03</span><strong>Le bon détour</strong><p>Hébergements, trajets et activités se rejoignent quand vous le décidez.</p></div></div></div>
      </section>

      <section className="home-v2__closing"><div className="home-v2__frame home-v2__closing-inner"><p className="home-v2__label">Yuding / carnet de départ</p><p className="home-v2__closing-word">À bientôt<br /><em>ailleurs.</em></p><a href="#quick-search" className="home-v2__backtop">Revenir à la recherche <i className="fas fa-arrow-up" aria-hidden="true" /></a></div></section>
    </div>
  );
}
