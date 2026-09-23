'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';

type TravelMode = {
  id: 'all' | 'hotels' | 'flights' | 'activities' | 'transfers' | 'trains';
  label: string;
  shortLabel: string;
  icon: string;
  href: string;
};

const travelModes: TravelMode[] = [
  { id: 'all', label: 'Tout le voyage', shortLabel: 'Tout', icon: 'fa-compass', href: '/' },
  { id: 'hotels', label: 'Hébergements', shortLabel: 'Séjours', icon: 'fa-bed', href: '/hotels' },
  { id: 'flights', label: 'Vols', shortLabel: 'Vols', icon: 'fa-plane', href: '/flights' },
  { id: 'activities', label: 'Activités', shortLabel: 'À faire', icon: 'fa-hiking', href: '/activities' },
  { id: 'transfers', label: 'Transferts', shortLabel: 'Transferts', icon: 'fa-taxi', href: '/transfers' },
  { id: 'trains', label: 'Trains', shortLabel: 'Trains', icon: 'fa-train', href: '/trains' },
];

const destinations = [
  { name: 'Marrakech', country: 'Maroc', image: '/image/marrakech.jpg', description: 'Lumière chaude, médina vivante et escapades dans l’Atlas.', href: '/hotels?destination=Marrakech', className: 'home-destination-card home-destination-card--large' },
  { name: 'Chefchaouen', country: 'Maroc', image: '/image/chefchaoun.jpeg', description: 'Une parenthèse bleue au cœur du Rif.', href: '/hotels?destination=Chefchaouen', className: 'home-destination-card' },
  { name: 'Dakhla', country: 'Maroc', image: '/image/Dakhla.jpg', description: 'Désert, lagon et horizon ouvert.', href: '/activities?destination=Dakhla', className: 'home-destination-card' },
];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<TravelMode['id']>('all');
  const [selectedPlace, setSelectedPlace] = useState<GeoPlace | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => formatDate(new Date()), []);
  const minEndDate = useMemo(() => {
    if (!startDate) return today;
    const next = new Date(startDate + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    return formatDate(next);
  }, [startDate, today]);

  const selectedMode = travelModes.find((mode) => mode.id === activeMode) || travelModes[0];

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && endDate <= value) {
      const next = new Date(value + 'T12:00:00');
      next.setDate(next.getDate() + 1);
      setEndDate(formatDate(next));
    }
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlace) {
      setError('Choisissez une destination dans les suggestions pour continuer.');
      return;
    }
    if (startDate && endDate && endDate <= startDate) {
      setError('La date de départ doit suivre la date d’arrivée.');
      return;
    }

    const target = activeMode === 'all' ? '/hotels' : selectedMode.href;
    const params = new URLSearchParams({
      destination: selectedPlace.city || selectedPlace.name,
      countryCode: selectedPlace.countryCode || '',
      travelers,
    });
    if (startDate) params.set('date', startDate);
    if (endDate) params.set('returnDate', endDate);
    router.push(target + '?' + params.toString());
  };

  return (
    <div className="home-redesign">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <Image src="/image/home1.jpg" alt="Vue sur une ville côtière au coucher du soleil" fill priority sizes="100vw" className="home-hero__image" />
        <div className="home-hero__veil" />
        <div className="home-hero__grain" aria-hidden="true" />
        <div className="home-shell home-hero__inner">
          <div className="home-hero__copy">
            <p className="home-eyebrow"><span /> Le voyage, à votre rythme</p>
            <h1 id="home-hero-title">Le prochain départ commence ici.</h1>
            <p className="home-hero__lede">Comparez les possibilités d’un voyage et trouvez le bon point de départ — un séjour, un vol, une expérience, un transfert ou un train.</p>
            <a className="home-hero__jump" href="#home-search"><span>Rechercher un voyage</span><i className="fas fa-arrow-down" aria-hidden="true" /></a>
          </div>
          <div className="home-hero__aside" aria-label="À propos de Yuding"><span className="home-hero__aside-line" /><p>Des données de recherche connectées à l’architecture Yuding et à ses fournisseurs.</p></div>
        </div>
      </section>

      <section className="home-search-wrap" id="home-search" aria-labelledby="home-search-title">
        <div className="home-shell">
          <div className="home-search-panel">
            <div className="home-search-heading">
              <div><p className="home-kicker">Commencer une recherche</p><h2 id="home-search-title">Où allez-vous ?</h2></div>
              <p className="home-search-note">Les disponibilités et prix sont vérifiés par les services Yuding.</p>
            </div>
            <div className="home-mode-tabs" role="tablist" aria-label="Type de voyage">
              {travelModes.map((mode) => (
                <button key={mode.id} type="button" role="tab" aria-selected={activeMode === mode.id} className={activeMode === mode.id ? 'is-active' : ''} onClick={() => { setActiveMode(mode.id); setError(null); }}>
                  <i className={'fas ' + mode.icon} aria-hidden="true" /><span className="home-mode-tabs__full">{mode.label}</span><span className="home-mode-tabs__short">{mode.shortLabel}</span>
                </button>
              ))}
            </div>
            <form className="home-search-form" onSubmit={handleSubmit}>
              <div className="home-search-field home-search-field--destination">
                <GeoPlaceSelector id="home-destination" label="Destination" placeholder="Ville, région ou aéroport" type="city" selectedPlace={selectedPlace} onSelect={(place) => { setSelectedPlace(place); setError(null); }} error={error && !selectedPlace ? error : null} required />
              </div>
              <div className="home-search-field"><label htmlFor="home-start-date"><i className="fas fa-calendar-alt" aria-hidden="true" /> Départ</label><input id="home-start-date" type="date" min={today} value={startDate} onChange={(event) => handleStartDateChange(event.target.value)} /></div>
              <div className="home-search-field"><label htmlFor="home-end-date"><i className="fas fa-calendar-check" aria-hidden="true" /> Retour</label><input id="home-end-date" type="date" min={minEndDate} value={endDate} onChange={(event) => { setEndDate(event.target.value); setError(null); }} /></div>
              <div className="home-search-field home-search-field--travelers"><label htmlFor="home-travelers"><i className="fas fa-user-friends" aria-hidden="true" /> Voyageurs</label><select id="home-travelers" value={travelers} onChange={(event) => setTravelers(event.target.value)}><option value="1">1 voyageur</option><option value="2">2 voyageurs</option><option value="3">3 voyageurs</option><option value="4">4 voyageurs</option><option value="5">5 voyageurs</option><option value="6">6 voyageurs</option></select></div>
              <button type="submit" className="home-search-submit">Rechercher <i className="fas fa-arrow-right" aria-hidden="true" /></button>
            </form>
            {error && selectedPlace && <p className="home-search-error" role="alert">{error}</p>}
            <p className="home-search-caption">Préparez votre recherche de {selectedMode.label.toLowerCase()}.</p>
          </div>
        </div>
      </section>

      <main>
        <section className="home-section home-section--discovery" aria-labelledby="discovery-title">
          <div className="home-shell">
            <div className="home-section-heading"><div><p className="home-kicker">Carnet de départ</p><h2 id="discovery-title">Une idée suffit pour commencer.</h2></div><p>Des destinations choisies pour donner une direction à votre prochaine recherche.</p></div>
            <div className="home-destination-grid">
              {destinations.map((destination) => (
                <Link key={destination.name} href={destination.href} className={destination.className}>
                  <Image src={destination.image} alt={destination.name + ', ' + destination.country} fill sizes={destination.name === 'Marrakech' ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 25vw'} />
                  <span className="home-destination-card__veil" /><span className="home-destination-card__content"><span className="home-destination-card__country">{destination.country}</span><strong>{destination.name}</strong><span className="home-destination-card__description">{destination.description}</span><span className="home-destination-card__link">Explorer <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></span></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section home-section--modes" aria-labelledby="modes-title">
          <div className="home-shell">
            <div className="home-section-heading home-section-heading--compact"><div><p className="home-kicker">Un seul point de départ</p><h2 id="modes-title">Tout ce qui compose un voyage.</h2></div><p>Choisissez votre prochaine étape, puis laissez chaque service faire son travail.</p></div>
            <div className="home-mode-grid">
              {travelModes.slice(1).map((mode) => <Link key={mode.id} href={mode.href} className="home-mode-card"><span className="home-mode-card__icon"><i className={'fas ' + mode.icon} aria-hidden="true" /></span><span><strong>{mode.label}</strong><small>Ouvrir la recherche <i className="fas fa-arrow-right" aria-hidden="true" /></small></span></Link>)}
            </div>
          </div>
        </section>

        <section className="home-editorial" aria-labelledby="editorial-title">
          <div className="home-shell home-editorial__grid">
            <div className="home-editorial__image"><Image src="/image/Dakhla.jpg" alt="Lagon et dunes de Dakhla" fill sizes="(max-width: 768px) 100vw, 42vw" /><span>Yuding / Destination contextuelle</span></div>
            <div className="home-editorial__copy"><p className="home-kicker">Pensé pour explorer</p><h2 id="editorial-title">Une interface claire pour des données qui bougent.</h2><p>Yuding rassemble plusieurs façons de partir dans une même expérience : la recherche fournisseur, les données de destination et un parcours de réservation lisible.</p>
              <div className="home-editorial__points"><div><span>01</span><p><strong>Recherche réelle</strong><br />Les résultats viennent des services configurés pour chaque verticale.</p></div><div><span>02</span><p><strong>Contexte utile</strong><br />Les images et informations de destination servent l’inspiration sans se faire passer pour une offre.</p></div><div><span>03</span><p><strong>Parcours cohérent</strong><br />Une navigation stable de la découverte jusqu’aux détails d’une offre.</p></div></div>
            </div>
          </div>
        </section>

        <section className="home-cta" aria-label="Prêt à partir"><div className="home-shell home-cta__inner"><div><p className="home-kicker">Votre prochaine recherche</p><h2>Commencez par une ville.</h2></div><Link href="#home-search" className="home-cta__button">Lancer une recherche <i className="fas fa-arrow-up" aria-hidden="true" /></Link></div></section>
      </main>
    </div>
  );
}
