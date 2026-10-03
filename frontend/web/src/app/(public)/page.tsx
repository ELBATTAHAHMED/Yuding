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
import { HomeDestinations } from '@/components/travel/HomeDestinations';
import { HomeFinalCta } from '@/components/travel/HomeFinalCta';
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

const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function HomePage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TravelMode>('hotels');
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [departure, setDeparture] = useState('');
  const [travelers, setTravelers] = useState('2');
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
    const targets = ['.home-v3__search', '.home-v3__destinations', '.home-v3__reviews', '.home-v3__end', '.yuding-footer']
      .map((selector) => document.querySelector(selector)).filter((element): element is Element => Boolean(element));
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      document.body.classList.toggle('home-controls-visible', visible.size > 0);
      document.body.classList.toggle('home-footer-visible', Array.from(visible).some(element => element.matches('.yuding-footer')));
    }, { threshold: 0 });
    targets.forEach((target) => observer.observe(target));
    return () => { observer.disconnect(); document.body.classList.remove('home-controls-visible', 'home-footer-visible'); };
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.home-v3__hero-word', { y: 52, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.1 });
      gsap.from('.home-v3__hero-deck, .home-v3__hero-index', { y: 18, duration: 0.8, ease: 'power2.out', stagger: 0.1, delay: 0.55 });
      gsap.from('.home-v3__planner-photo img', {
        scale: 1.12, duration: 1.5, ease: 'power2.out',
        scrollTrigger: { trigger: '.home-v3__planner', start: 'top 75%', once: true },
      });
      gsap.from('.home-journey__stage', {
        y: 24, opacity: 0, duration: .85, ease: 'power2.out',
        scrollTrigger: { trigger: '.home-v3__destinations', start: 'top 78%', once: true },
      });
      gsap.from('.home-v3__end-content h2', {
        y: 42, duration: 1.05, ease: 'power3.out',
        scrollTrigger: { trigger: '.home-v3__end', start: 'top 78%', once: true },
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
        <div className="home-v3__hero-media" aria-hidden="true">
          <Image className="home-v3__hero-image--light" src="/image/yuding-hero-atlas.png" alt="" fill priority sizes="100vw" />
          <Image className="home-v3__hero-image--dark" src="/image/home-hero-atlas-night.webp" alt="" fill loading="eager" sizes="100vw" />
        </div>
        <div className="home-v3__hero-shade home-v3__hero-shade--light" aria-hidden="true" />
        <div className="home-v3__hero-shade home-v3__hero-shade--dark" aria-hidden="true" />
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
          <div key={mode} className="home-v3__search-panel t-panel-slide">
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

      <HomeDestinations />

      <HomeReviews />

      <HomeFinalCta />
    </div>
  );
}
