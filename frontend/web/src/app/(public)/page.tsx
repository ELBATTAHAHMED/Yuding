'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';
import { HomeReviews } from '@/components/travel/HomeReviews';
import { AirportSelector } from '@/components/travel/AirportSelector';
import { StationSelector } from '@/components/travel/StationSelector';
import { TransferLocationSelector } from '@/components/travel/TransferLocationSelector';
import { useAirportsQuery } from '@/hooks/queries/useTravelQueries';
import { travelService } from '@/services/travel.service';
import type { Airport, TrainStation } from '@/types/travel.types';

gsap.registerPlugin(useGSAP, ScrollTrigger);

type TravelMode = 'hotels' | 'flights' | 'activities' | 'transfers' | 'trains';

const modes: { id: TravelMode; label: string; icon: string; href: string; action: string; description: string }[] = [
  { id: 'hotels', label: 'Hébergements', icon: 'fa-bed', href: '/hotels', action: 'Trouver un séjour', description: 'Des lieux où se sentir ailleurs, à votre rythme.' },
  { id: 'flights', label: 'Vols', icon: 'fa-plane', href: '/flights', action: 'Rechercher un vol', description: 'Choisissez un départ, une arrivée et les dates qui vous vont.' },
  { id: 'activities', label: 'Activités', icon: 'fa-person-hiking', href: '/activities', action: 'Explorer les activités', description: 'Les expériences qui donnent du relief au voyage.' },
  { id: 'transfers', label: 'Transferts', icon: 'fa-car-side', href: '/transfers', action: 'Organiser un transfert', description: 'Reliez les étapes de votre itinéraire.' },
  { id: 'trains', label: 'Trains', icon: 'fa-train', href: '/trains', action: 'Chercher un train', description: 'Voyagez d’une gare à l’autre.' },
];

const places = [
  { name: 'Dakhla', country: 'Maroc', label: 'Entre les dunes et l’océan', image: '/image/Dakhla.jpg', alt: 'Lagune et dunes à Dakhla', href: '/hotels?destination=Dakhla&countryCode=MA' },
  { name: 'Séoul', country: 'Corée du Sud', label: 'Une ville à plusieurs vitesses', image: '/image/Seoul.jpg', alt: 'Palais et paysage urbain de Séoul', href: '/hotels?destination=Seoul&countryCode=KR' },
  { name: 'Chefchaouen', country: 'Maroc', label: 'Se perdre dans le bleu', image: '/image/chefchaoun.jpeg', alt: 'Ruelle bleue de Chefchaouen', href: '/activities?destination=Chefchaouen&countryCode=MA' },
];

const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function HomePage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TravelMode>('hotels');
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [departure, setDeparture] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [destination, setDestination] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: airports = [] } = useAirportsQuery();
  const [stations, setStations] = useState<TrainStation[]>([]);
  const [originAirport, setOriginAirport] = useState<Airport | null>(null);
  const [destinationAirport, setDestinationAirport] = useState<Airport | null>(null);
  const [originStation, setOriginStation] = useState<TrainStation | null>(null);
  const [destinationStation, setDestinationStation] = useState<TrainStation | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [travelClass, setTravelClass] = useState('ECONOMY');
  const today = useMemo(() => dateString(new Date()), []);
  const minReturn = useMemo(() => {
    if (!departure) return today;
    const next = new Date(`${departure}T12:00:00`);
    next.setDate(next.getDate() + 1);
    return dateString(next);
  }, [departure, today]);
  const activeMode = modes.find((item) => item.id === mode) || modes[0];
  useEffect(() => {
    if (mode !== 'trains') return;
    let active = true;
    travelService.getTrainStations().then((items) => { if (active) setStations(items); }).catch(() => {});
    return () => { active = false; };
  }, [mode]);

  // Keep the floating assistant away from touch controls on narrow screens.
  useEffect(() => {
    const targets = ['.home-v3__search', '.home-v3__destination-stage', '.home-v3__reviews', '.yuding-footer']
      .map((selector) => document.querySelector(selector)).filter((element): element is Element => Boolean(element));
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      document.body.classList.toggle('home-controls-visible', visible.size > 0);
    }, { threshold: 0 });
    targets.forEach((target) => observer.observe(target));
    return () => { observer.disconnect(); document.body.classList.remove('home-controls-visible'); };
  }, []);

  // transitions.dev panel reveal: an interruptible handoff when changing search verticals.
  useEffect(() => {
    setPanelOpen(false);
    const frame = requestAnimationFrame(() => setPanelOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.home-v3__hero-word', { y: 52, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.1 });
      gsap.from('.home-v3__hero-deck, .home-v3__hero-index', { y: 18, duration: 0.8, ease: 'power2.out', stagger: 0.1, delay: 0.55 });
      gsap.to('.home-v3__hero-media img', {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: '.home-v3__hero', start: 'top top', end: 'bottom top', scrub: 0.7 },
      });
      gsap.from('.home-v3__planner-photo img', {
        scale: 1.12, duration: 1.5, ease: 'power2.out',
        scrollTrigger: { trigger: '.home-v3__planner', start: 'top 75%', once: true },
      });
      gsap.utils.toArray<HTMLElement>('.home-v3__reveal').forEach((element) => {
        gsap.from(element, {
          y: 34, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
      });
    });
    return () => mm.revert();
  }, { scope: rootRef });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.home-v3__destination-current > *', { y: 16, opacity: 0, duration: .45, stagger: .055, ease: 'power2.out' });
    });
    return () => mm.revert();
  }, { scope: rootRef, dependencies: [destination], revertOnUpdate: true });

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checkIn = String(form.get('checkIn') || form.get('date') || '');
    const checkOut = String(form.get('checkOut') || '');
    if ((mode === 'hotels' || mode === 'activities') && !place) { setError('Sélectionnez une ville dans les suggestions.'); return; }
    if (mode === 'hotels' && checkIn && checkOut && checkOut <= checkIn) {
      setError('La date de départ doit suivre la date d’arrivée.');
      return;
    }
    const params = new URLSearchParams();
    if (mode === 'hotels' || mode === 'activities') {
      const selected = place!;
      params.set('destination', selected.city || selected.name);
      if (selected.countryCode) params.set('countryCode', selected.countryCode);
      if (selected.country) params.set('country', selected.country);
    }
    if (mode === 'hotels') {
      params.set('adults', travelers);
      params.set('checkIn', checkIn);
      params.set('checkOut', checkOut);
    } else if (mode === 'activities') {
      params.set('travelers', travelers);
      if (checkIn) params.set('date', checkIn);
    } else if (mode === 'flights') {
      if (!originAirport || !destinationAirport) { setError('Sélectionnez les deux aéroports dans les suggestions.'); return; }
      if (originAirport.code === destinationAirport.code) { setError('Choisissez deux aéroports différents.'); return; }
      params.set('origin', originAirport.code);
      params.set('destination', destinationAirport.code);
      params.set('departureDate', checkIn);
      params.set('adults', travelers);
      params.set('travelClass', travelClass);
    } else if (mode === 'transfers') {
      if (!pickup.trim() || !dropoff.trim()) { setError('Indiquez le départ et l’arrivée du transfert.'); return; }
      params.set('pickup', pickup.trim());
      params.set('dropoff', dropoff.trim());
      params.set('date', checkIn);
      params.set('time', String(form.get('time') || '12:00'));
      params.set('passengers', travelers);
    } else {
      if (!originStation || !destinationStation) { setError('Sélectionnez les deux gares dans les suggestions.'); return; }
      if (originStation.id === destinationStation.id) { setError('Choisissez deux gares différentes.'); return; }
      params.set('originId', originStation.id);
      params.set('origin', originStation.name);
      params.set('destinationId', destinationStation.id);
      params.set('destination', destinationStation.name);
      params.set('date', checkIn);
      params.set('passengers', travelers);
    }
    params.set('rerun', '1');
    router.push(`${activeMode.href}?${params.toString()}`);
  };

  return (
    <div className="home-v3" ref={rootRef}>
      <section className="home-v3__hero" aria-labelledby="home-title">
        <div className="home-v3__hero-media" aria-hidden="true"><Image src="/image/yuding-hero-atlas.png" alt="" fill priority sizes="100vw" /></div>
        <div className="home-v3__hero-shade" aria-hidden="true" />
        <div className="home-v3__hero-body home-v3__frame">
          <div className="home-v3__hero-index"><span>YUDING <b>·</b> VOYAGES À VOTRE RYTHME</span><span>01 / L&apos;ENVIE</span></div>
          <div className="home-v3__hero-copy">
            <h1 id="home-title"><span className="home-v3__hero-word">Partez.</span><span className="home-v3__hero-word">Le monde <em>vous attend.</em></span></h1>
            <p className="home-v3__hero-deck">Un séjour à imaginer, une ville à traverser, des moments à vivre. Votre prochain voyage prend forme ici.</p>
            <a className="home-v3__hero-scroll" href="#home-search"><span>Commencer le voyage</span><i className="fas fa-arrow-down" aria-hidden="true" /></a>
          </div>
          <div className="home-v3__hero-bottom"><span>ATLAS, MAROC</span><a href="#home-search">SCROLLEZ POUR EXPLORER <i className="fas fa-arrow-down" aria-hidden="true" /></a></div>
        </div>
      </section>

      <section className="home-v3__search" id="home-search" aria-labelledby="search-title">
        <div className="home-v3__frame">
          <div className="home-v3__search-top"><div><span className="home-v3__kicker">VOTRE POINT DE DÉPART</span><h2 id="search-title">On commence où ?</h2></div><p>Choisissez une façon de partir, puis donnez-nous une destination.</p></div>
          <div className="home-v3__search-shell"><div className="home-v3__mode-list" role="group" aria-label="Choisir un service de voyage">
            {modes.map((item, index) => <button key={item.id} type="button" className="home-v3__mode" aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setDeparture(''); setError(null); }}><span className="home-v3__mode-num">0{index + 1}</span><i className={`fas ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></button>)}
          </div>
          <span className="home-v3__mode-hint" aria-hidden="true">5 services · faites glisser pour explorer <i className="fas fa-arrow-right" /></span>
          <div key={mode} className="home-v3__search-panel t-panel-slide" data-open={panelOpen}>
            <form onSubmit={submitSearch}>
              <p className="home-v3__search-prompt">{activeMode.description}</p>
              <div className={`home-v3__fields home-v3__fields--${mode}`}>
                {(mode === 'hotels' || mode === 'activities') && <div className="home-v3__geo"><GeoPlaceSelector id="home-destination" label="Destination" placeholder="Ville ou destination" type="city" selectedPlace={place} onSelect={(next) => { setPlace(next); setError(null); }} error={error && !place ? error : null} required /></div>}
                {mode === 'flights' && <><div className="home-v3__selector"><AirportSelector id="home-flight-origin" label="Départ" icon="fas fa-plane-departure" airports={airports} selectedAirport={originAirport} onSelect={setOriginAirport} /></div><div className="home-v3__selector"><AirportSelector id="home-flight-destination" label="Arrivée" icon="fas fa-plane-arrival" airports={airports} selectedAirport={destinationAirport} onSelect={setDestinationAirport} /></div></>}
                {mode === 'trains' && <><div className="home-v3__selector"><StationSelector id="home-train-origin" label="Gare de départ" stations={stations} selectedStation={originStation} onSelect={setOriginStation} /></div><div className="home-v3__selector"><StationSelector id="home-train-destination" label="Gare d’arrivée" stations={stations} selectedStation={destinationStation} onSelect={setDestinationStation} /></div></>}
                {mode === 'transfers' && <><div className="home-v3__selector"><TransferLocationSelector id="home-transfer-pickup" label="Départ" value={pickup} onChange={setPickup} suggestions={[]} /></div><div className="home-v3__selector"><TransferLocationSelector id="home-transfer-dropoff" label="Arrivée" value={dropoff} onChange={setDropoff} suggestions={[]} /></div></>}
                <label><span>{mode === 'hotels' ? 'Arrivée' : 'Date'}</span><input type="date" name="checkIn" min={today} required={mode !== 'activities'} onInput={(event) => { setDeparture(event.currentTarget.value); setError(null); }} /></label>
                {mode === 'hotels' && <label><span>Départ</span><input type="date" name="checkOut" min={minReturn} required onInput={() => setError(null)} /></label>}
                {mode === 'transfers' && <label><span>Heure</span><input type="time" name="time" defaultValue="12:00" required /></label>}
                {mode === 'flights' && <label><span>Classe</span><select value={travelClass} onChange={(event) => setTravelClass(event.target.value)}><option value="ECONOMY">Économique</option><option value="PREMIUM_ECONOMY">Premium éco.</option><option value="BUSINESS">Affaires</option><option value="FIRST">Première</option></select></label>}
                <label><span>Voyageurs</span><select value={travelers} onChange={(event) => setTravelers(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'voyageur' : 'voyageurs'}</option>)}</select></label>
                <button className="home-v3__submit" type="submit"><span>{activeMode.action}</span><i className="fas fa-arrow-right" aria-hidden="true" /></button>
              </div>
              {error && <p className="home-v3__error" role="alert">{error}</p>}
            </form>
          </div>
          </div><p className="home-v3__search-foot">Disponibilités et tarifs vérifiés lors de la recherche.</p>
        </div>
      </section>

      <section className="home-v3__planner" aria-labelledby="planner-title">
        <div className="home-v3__planner-side"><div className="home-v3__planner-photo"><Image src="/image/galerie2.jpg" alt="Voyageuse sur le quai d’une gare" fill sizes="(max-width: 900px) 100vw, 52vw" /></div><span className="home-v3__planner-aside">L&apos;ART DE COMPOSER SON VOYAGE</span></div>
        <div className="home-v3__planner-main"><span className="home-v3__chapter">02 / L&apos;IDÉE DEVIENT UN ITINÉRAIRE</span><div className="home-v3__reveal"><h2 id="planner-title">Vous avez une envie.<br /><em>On trace la route.</em></h2><p>Quelques mots suffisent pour commencer. Le Smart Trip Planner transforme vos envies en un parcours que vous pouvez explorer et ajuster.</p><Link className="home-v3__planner-cta" href="/planifier">Imaginer mon voyage <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div><div className="home-v3__planner-trace" aria-hidden="true"><span>IMAGINER</span><span>COMPOSER</span><span>PARTIR</span></div></div>
      </section>

      <section className="home-v3__destinations" aria-labelledby="destinations-title">
        <div className="home-v3__frame home-v3__destination-intro home-v3__reveal"><span className="home-v3__chapter">03 / AILLEURS VOUS APPELLE</span><p>Trois horizons. À vous de choisir le premier.</p></div>
        <div className="home-v3__destination-stage">
          {places.map((item, index) => <div key={item.name} className={`home-v3__destination-photo${destination === index ? ' is-active' : ''}`} aria-hidden={destination !== index}><Image src={item.image} alt={destination === index ? item.alt : ''} fill sizes="100vw" /></div>)}
          <div className="home-v3__destination-overlay" />
          <div className="home-v3__destination-content home-v3__frame">
            <div className="home-v3__destination-story"><h2 id="destinations-title">Une autre lumière.<br /><em>Une autre histoire.</em></h2><div className="home-v3__destination-current" key={places[destination].name}><span>0{destination + 1} / 03 &nbsp;·&nbsp; {places[destination].country.toUpperCase()}</span><h3>{places[destination].name}</h3><p>{places[destination].label}</p><Link href={places[destination].href}>Explorer {places[destination].name} <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div></div>
            <div className="home-v3__destination-choices" role="group" aria-label="Choisir une destination">{places.map((item, index) => <button key={item.name} type="button" aria-pressed={destination === index} onClick={() => setDestination(index)}><span className="home-v3__destination-thumb"><Image src={item.image} alt="" fill sizes="90px" /></span><span className="home-v3__destination-choice-copy"><small>0{index + 1} / {item.country}</small><strong>{item.name}</strong></span><i className="fas fa-arrow-right" aria-hidden="true" /></button>)}</div>
          </div>
        </div>
        <p className="home-v3__destination-note home-v3__frame">Images d&apos;inspiration. Explorez les offres pour connaître les disponibilités et tarifs actuels.</p>
      </section>

      <HomeReviews />

      <section className="home-v3__end" aria-labelledby="end-title"><div className="home-v3__end-photo"><Image src="/image/home1.jpg" alt="Village au-dessus de la mer au crépuscule" fill sizes="100vw" /></div><div className="home-v3__end-shade" /><div className="home-v3__frame home-v3__end-content home-v3__reveal"><span className="home-v3__chapter">LE MONDE N&apos;ATTEND PAS</span><h2 id="end-title">Et si c&apos;était <em>maintenant ?</em></h2><div><p>Une destination en tête, ou seulement l&apos;envie de partir ?</p><a href="#home-search">Lancer une recherche <i className="fas fa-arrow-up" aria-hidden="true" /></a></div></div></section>
    </div>
  );
}
