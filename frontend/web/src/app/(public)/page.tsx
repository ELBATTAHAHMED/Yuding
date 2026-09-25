'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';
import { imageService } from '@/services/image.service';
import type { ImageAsset } from '@/types/image.types';

type TravelMode = { id: 'hotels' | 'flights' | 'activities' | 'transfers' | 'trains'; label: string; icon: string; href: string; action: string };
const modes: TravelMode[] = [
  { id: 'hotels', label: 'Hébergements', icon: 'fa-bed', href: '/hotels', action: 'Voir les séjours' },
  { id: 'flights', label: 'Vols', icon: 'fa-plane-departure', href: '/flights', action: 'Trouver un vol' },
  { id: 'activities', label: 'Activités', icon: 'fa-person-hiking', href: '/activities', action: 'Trouver une activité' },
  { id: 'transfers', label: 'Transferts', icon: 'fa-car-side', href: '/transfers', action: 'Organiser un transfert' },
  { id: 'trains', label: 'Trains', icon: 'fa-train', href: '/trains', action: 'Chercher un train' },
];
const intents = [
  { title: 'Se reposer', subtitle: 'Riads de charme et paysages apaisants.', image: '/image/marrakech.jpg', href: '/hotels?destination=Marrakech&countryCode=MA', icon: 'fa-spa', action: 'Voir nos séjours bien-être' },
  { title: 'Explorer', subtitle: 'Villes impériales, villages berbères et grands espaces.', image: '/image/chefchaoun.jpeg', href: '/activities?destination=Chefchaouen&countryCode=MA', icon: 'fa-landmark', action: 'Voir nos circuits découverte' },
  { title: 'Bouger', subtitle: 'Randonnées, vagues et activités de plein air.', image: '/image/Dakhla.jpg', href: '/activities?destination=Dakhla&countryCode=MA', icon: 'fa-person-hiking', action: 'Voir nos aventures actives' },
  { title: 'Se retrouver', subtitle: 'Voyages en famille ou entre amis.', image: '/image/ami.jpg', href: '/hotels?destination=Essaouira&countryCode=MA', icon: 'fa-users', action: 'Voir nos voyages à plusieurs' },
];
const itineraryStops = [
  { city: 'Marrakech', nights: '2 nuits', image: '/image/marrakech.jpg', href: '/hotels?destination=Marrakech&countryCode=MA' },
  { city: 'Vallée de l’Ourika', nights: '2 nuits', image: '/image/g7.jpg', href: '/activities?destination=Ourika&countryCode=MA' },
  { city: 'Essaouira', nights: '3 nuits', image: '/image/galerie9.jpeg', href: '/hotels?destination=Essaouira&countryCode=MA' },
];
const practical = [
  { title: 'Météo', text: 'Quand partir selon les régions ?', icon: 'fa-sun', href: '/activities', action: 'Voir nos conseils météo' },
  { title: 'Transferts', text: 'Rejoindre et se déplacer facilement.', icon: 'fa-plane', href: '/transfers', action: 'Découvrir les options' },
  { title: 'Budget', text: 'Astuces et repères de prix.', icon: 'fa-coins', href: '/hotels', action: 'Voir notre guide budget' },
  { title: 'Activités', text: 'Nos incontournables par région.', icon: 'fa-map', href: '/activities', action: 'Explorer les activités' },
];
const stories = [
  { eyebrow: 'Rencontres', title: 'Sur la route des kasbahs oubliées', text: 'À la rencontre de ceux qui font vivre un Maroc authentique, entre traditions et modernité.', image: '/image/g4.jpg', href: '/activities' },
  { eyebrow: 'Gastronomie', title: 'Les saveurs d’un Maroc généreux', text: 'Des marchés aux tables d’hôtes, un voyage au cœur des traditions culinaires.', image: '/image/activitee.jpg', href: '/activities' },
  { eyebrow: 'Lieux secrets', title: 'Ces villages qui méritent le détour', text: 'Nos pépites loin des sentiers battus, pour un Maroc plus intime.', image: '/image/chefchaoun.jpeg', href: '/hotels?destination=Chefchaouen&countryCode=MA' },
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
    if (!place) { setDestinationImage(null); return () => { active = false; }; }
    setDestinationImageLoading(true);
    imageService.getDestinationImages({ city: place.city || place.name, country: place.country, countryCode: place.countryCode, limit: 1 })
      .then((response) => { if (active) setDestinationImage(response.images?.[0] || null); })
      .catch(() => { if (active) setDestinationImage(null); })
      .finally(() => { if (active) setDestinationImageLoading(false); });
    return () => { active = false; };
  }, [place]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!place) { setError('Choisissez une destination pour commencer.'); return; }
    if (departure && returnDate && returnDate <= departure) { setError('La date de retour doit suivre la date de départ.'); return; }
    const params = new URLSearchParams({ destination: place.city || place.name, countryCode: place.countryCode || '', adults: travelers });
    if (place.country) params.set('country', place.country);
    if (departure) params.set('checkIn', departure);
    if (returnDate) params.set('checkOut', returnDate);
    router.push(activeMode.href + '?' + params.toString());
  };

  return (
    <div className="home-option1">
      <section className="home-option1__hero" aria-labelledby="home-option1-title">
        <Image src="/image/yuding-hero-atlas.png" alt="Paysage du sud marocain" fill priority className="home-option1__hero-image" sizes="100vw" />
        <div className="home-option1__hero-overlay" aria-hidden="true" />
        <div className="home-option1__route-note" aria-hidden="true"><span>Plus qu’un voyage,<br />une connexion.</span><i className="fas fa-location-dot" /></div>
        <div className="home-option1__frame home-option1__hero-content"><p className="home-option1__eyebrow">Maroc, grandeur nature <span /></p><h1 id="home-option1-title">Un voyage pensé<br /><em>autour de vous.</em></h1><p className="home-option1__hero-copy">Des villes impériales aux dunes infinies, vivez le Maroc autrement avec Yuding.</p></div>
        <div className="home-option1__search home-option1__frame" id="home-search">
          <div className="home-option1__search-tabs" role="tablist" aria-label="Type de voyage">{modes.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => { setMode(item.id); setError(null); }}><i className={'fas ' + item.icon} aria-hidden="true" /><span>{item.label}</span></button>)}</div>
          <form className="home-option1__search-form" onSubmit={submitSearch}>
            <div className="home-option1__search-field home-option1__search-field--destination"><GeoPlaceSelector id="home-destination" label="Destination" placeholder="Où voulez-vous aller ?" type="city" selectedPlace={place} onSelect={(next) => { setPlace(next); setError(null); }} error={error && !place ? error : null} required /></div>
            <label className="home-option1__search-field"><span><i className="fas fa-calendar-day" aria-hidden="true" /> Dates</span><input type="date" min={today} value={departure} onChange={(event) => { setDeparture(event.target.value); setError(null); }} /><small>{returnDate ? 'au ' + returnDate : 'Du — au'}</small></label>
            <label className="home-option1__search-field"><span><i className="fas fa-user-group" aria-hidden="true" /> Voyageurs</span><select value={travelers} onChange={(event) => setTravelers(event.target.value)}><option value="1">1 voyageur</option><option value="2">2 voyageurs</option><option value="3">3 voyageurs</option><option value="4">4 voyageurs</option><option value="5">5 voyageurs</option><option value="6">6 voyageurs</option></select></label>
            <button className="home-option1__search-submit" type="submit"><span>Rechercher</span><i className="fas fa-arrow-right" aria-hidden="true" /></button>
          </form>
          {error && place && <p className="home-option1__search-error" role="alert">{error}</p>}
        </div>
      </section>
      {place && (destinationImage || destinationImageLoading) && <section className="home-option1__selected" aria-live="polite"><div className="home-option1__frame home-option1__selected-inner"><div><p className="home-option1__label">Votre piste</p><h2>{place.city || place.name}</h2><p>{place.country || 'Destination sélectionnée'}</p></div>{destinationImageLoading ? <span>Recherche d’une ambiance…</span> : destinationImage ? <div className="home-option1__selected-image"><img src={destinationImage.url} alt={destinationImage.altText || 'Ambiance de ' + (place.city || place.name)} /><small>Photo contextuelle · <a href={destinationImage.photographerUrl || 'https://www.pexels.com'} target="_blank" rel="noopener noreferrer">Pexels</a></small></div> : null}</div></section>}
      <main className="home-option1__main">
        <section className="home-option1__section home-option1__intents" aria-labelledby="intents-title"><div className="home-option1__frame"><div className="home-option1__section-head"><div><p className="home-option1__label">Vos envies de voyage</p><h2 id="intents-title">Une envie, plusieurs façons de partir</h2></div><Link href="/activities">Voir toutes les expériences <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><p className="home-option1__section-lede">Que vous rêviez de calme, d’aventure ou de rencontres, chaque voyage au Maroc a sa propre histoire.</p><div className="home-option1__intent-grid">{intents.map((item) => <Link href={item.href} key={item.title} className="home-option1__intent"><div className="home-option1__intent-image"><Image src={item.image} alt={item.title} fill sizes="(max-width: 760px) 90vw, 25vw" /></div><div className="home-option1__intent-meta"><span><i className={'fas ' + item.icon} aria-hidden="true" /></span><h3>{item.title}</h3><p>{item.subtitle}</p><b>{item.action} <i className="fas fa-arrow-right" aria-hidden="true" /></b></div></Link>)}</div></div></section>
        <section className="home-option1__section home-option1__compose" aria-labelledby="compose-title"><div className="home-option1__frame"><div className="home-option1__section-head"><div><p className="home-option1__label">Votre itinéraire sur mesure</p><h2 id="compose-title">Assemblez votre escapade</h2></div><Link href="/hotels">Créer mon itinéraire <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><p className="home-option1__section-lede">Choisissez vos étapes, nous vous aidons à créer un voyage à votre image.</p><div className="home-option1__compose-grid"><div className="home-option1__compose-steps"><div><span><i className="fas fa-bed" /></span><strong>Où dormir</strong><small>Riads, hôtels de charme ou écolodges</small></div><div><span><i className="fas fa-car-side" /></span><strong>Comment bouger</strong><small>Transferts privés, location ou circuits accompagnés</small></div><div><span><i className="fas fa-camera" /></span><strong>Que vivre</strong><small>Activités, visites et expériences locales</small></div></div><div className="home-option1__itinerary"><p>Exemple d’itinéraire</p><div className="home-option1__itinerary-stops">{itineraryStops.map((stop, index) => <React.Fragment key={stop.city}><Link href={stop.href}><div className="home-option1__itinerary-image"><Image src={stop.image} alt={stop.city} fill sizes="180px" /></div><strong>{stop.city}</strong><small><i className="fas fa-location-dot" /> {stop.nights}</small></Link>{index < itineraryStops.length - 1 && <i className="fas fa-arrow-right home-option1__itinerary-arrow" aria-hidden="true" />}</React.Fragment>)}</div></div></div></div></section>
        <section className="home-option1__section home-option1__practical" aria-labelledby="practical-title"><div className="home-option1__frame"><div className="home-option1__section-head"><div><p className="home-option1__label">Conseils pratiques</p><h2 id="practical-title">Les détails qui changent tout</h2></div><Link href="/activities">Voir tous nos conseils <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><p className="home-option1__section-lede">Des informations fiables pour voyager l’esprit léger.</p><div className="home-option1__practical-grid">{practical.map((item) => <Link href={item.href} className="home-option1__practical-item" key={item.title}><span><i className={'fas ' + item.icon} aria-hidden="true" /></span><div><h3>{item.title}</h3><p>{item.text}</p><b>{item.action} <i className="fas fa-arrow-right" aria-hidden="true" /></b></div></Link>)}</div></div></section>
        <section className="home-option1__section home-option1__stories" aria-labelledby="stories-title"><div className="home-option1__frame"><div className="home-option1__section-head"><div><p className="home-option1__label">Inspiration</p><h2 id="stories-title">Le Maroc, autrement</h2></div><Link href="/activities">Voir tous nos articles <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><p className="home-option1__section-lede">Des rencontres, des lieux et des histoires qui donnent un autre regard sur le voyage.</p><div className="home-option1__stories-grid"><Link href={stories[0].href} className="home-option1__story home-option1__story--featured"><div className="home-option1__story-image"><Image src={stories[0].image} alt={stories[0].title} fill sizes="(max-width: 760px) 90vw, 55vw" /></div><div><small>{stories[0].eyebrow}</small><h3>{stories[0].title}</h3><p>{stories[0].text}</p><b>Lire l’article <i className="fas fa-arrow-right" /></b></div></Link><div className="home-option1__story-list">{stories.slice(1).map((story) => <Link href={story.href} className="home-option1__story-row" key={story.title}><div className="home-option1__story-thumb"><Image src={story.image} alt={story.title} fill sizes="160px" /></div><div><small>{story.eyebrow}</small><h3>{story.title}</h3><p>{story.text}</p><b>Lire l’article <i className="fas fa-arrow-right" /></b></div></Link>)}</div></div></div></section>
        <section className="home-option1__section home-option1__quotes" aria-labelledby="quotes-title"><div className="home-option1__frame"><div className="home-option1__section-head"><div><p className="home-option1__label">Ils ont voyagé avec Yuding</p><h2 id="quotes-title">Des voyageurs, de vraies idées</h2></div><Link href="/account/bookings">Voir tous les avis <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><div className="home-option1__quote-grid"><blockquote><p>“Un voyage parfaitement organisé, des paysages sublimes et des rencontres inoubliables. Yuding a su créer un itinéraire qui nous ressemble vraiment.”</p><footer>Camille L. <span>Vallée de l’Ourika</span> <b>★★★★★</b></footer></blockquote><blockquote><p>“Du début à la fin, une expérience fluide et authentique. Les hébergements étaient magnifiques et les conseils sur place nous ont permis de voyager sans stress.”</p><footer>Thomas B. <span>Essaouira</span> <b>★★★★★</b></footer></blockquote></div></div></section>
      </main>
      <section className="home-option1__cta"><div className="home-option1__cta-image" /><div className="home-option1__frame home-option1__cta-inner"><div><p className="home-option1__label">Un nouveau horizon vous attend</p><h2>Prêt pour la suite ?</h2><p>Explorez le Maroc avec Yuding et créez un voyage qui vous ressemble.</p></div><Link href="#home-search">Rechercher un voyage <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div></section>
    </div>
  );
}
