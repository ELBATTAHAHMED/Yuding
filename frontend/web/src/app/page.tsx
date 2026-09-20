'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { HotelOffer } from '@/types/travel.types';
import { useAuth } from '@/features/auth/useAuth';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [results, setResults] = useState<HotelOffer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Comment form state
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);

  const destinations = travelService.getPopularDestinations();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearched(true);
    try {
      const data = await travelService.searchHotels(country, city);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentFeedback('Merci ! Votre commentaire a été enregistré avec succès.');
    setCommentContent('');
    setTimeout(() => setCommentFeedback(null), 4000);
  };

  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <section className="home" id="home" style={{ position: 'relative', overflow: 'hidden' }}>
        <video
          src="/image/video1.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="video"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 27, 26, 0.5)',
            zIndex: 1,
          }}
        />
        <div className="wrapper" style={{ position: 'relative', zIndex: 2, padding: '6rem 1rem 4rem' }}>
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <h2 className="home-title" style={{ fontSize: '3.5rem', color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
              <strong>YUDING</strong>
            </h2>
            <div className="home-subtitle" style={{ maxWidth: '750px', margin: '1.5rem auto 2.5rem', color: '#f0f0f0', fontSize: '1.15rem', lineHeight: '1.7' }}>
              <p>
                <strong>BIENVENUE</strong><br />
                Nous apprécions votre temps et souhaitons nous assurer que votre expérience avec nous est sans stress et fluide. Découvrez nos offres exclusives pour rendre vos réservations plus accessibles et mémorables.
              </p>
            </div>

            <div
              className="home-btns"
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a href="#searchHebergements" className="btn-booking" style={{ padding: '0.75rem 1.5rem', color: '#fff' }}>
                Hébergements
              </a>
              <Link href="/flights" className="btn-booking" style={{ padding: '0.75rem 1.5rem', color: '#fff' }}>
                Vols
              </Link>
              <Link href="/transfers" className="btn-booking" style={{ padding: '0.75rem 1.5rem', color: '#fff' }}>
                Taxi &amp; Trains
              </Link>
              <Link href="/activities" className="btn-booking" style={{ padding: '0.75rem 1.5rem', color: '#fff' }}>
                Activités
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SEARCH BAR ==================== */}
      <div className="touch-search" id="searchHebergements" style={{ padding: '2rem 1rem', background: 'var(--card, #fff)' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <form onSubmit={handleSearch} className="form" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="input-line" style={{ flex: '1 1 220px' }}>
              <label htmlFor="destination" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                Pays
              </label>
              <input
                type="text"
                id="destination"
                className="input-field"
                placeholder="Ex: Maroc, France"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="input-line" style={{ flex: '1 1 220px' }}>
              <label htmlFor="pax" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                Ville
              </label>
              <input
                type="text"
                id="pax"
                className="input-field"
                placeholder="Ex: Marrakech, Paris"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="input-line" style={{ flex: '1 1 140px' }}>
              <label htmlFor="number" className="input-label" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                Personnes
              </label>
              <input
                type="number"
                id="number"
                min="1"
                className="input-field"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div className="btns-line" style={{ flex: '0 0 auto' }}>
              <button
                type="submit"
                className="btn-booking"
                disabled={isSearching}
                style={{ padding: '0.75rem 2rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search" style={{ marginRight: '0.4rem' }}></i>}
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ==================== SEARCH RESULTS SECTION ==================== */}
      {searched && (
        <section id="search-results" className="search-results" style={{ padding: '3rem 1rem', background: 'var(--bg, #f9f9f9)' }}>
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="results-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 className="results-title" style={{ fontSize: '2rem', color: '#01796F' }}>Résultats de recherche</h2>
              <p className="results-subtitle" style={{ color: '#666' }}>Trouvez l&apos;hébergement parfait pour votre séjour</p>
            </div>

            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#01796F' }}></i>
                <p style={{ marginTop: '1rem', color: '#666' }}>Recherche des disponibilités en cours...</p>
              </div>
            ) : results.length > 0 ? (
              <div
                id="results-container"
                className="results-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {results.map((offer) => (
                  <div
                    key={offer.id}
                    className="accommodation-result-card"
                    style={{
                      background: 'var(--card, #fff)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: '180px', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={offer.imageUrl || '/image/hotels.jpg'}
                        alt={offer.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{offer.name}</h3>
                        <span style={{ color: '#01796F', fontWeight: 800, fontSize: '1.15rem' }}>
                          {offer.pricePerNight} €<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/nuit</span>
                        </span>
                      </div>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        <i className="fas fa-map-marker-alt" style={{ color: '#01796F', marginRight: '0.4rem' }}></i>
                        {offer.city}, {offer.country}
                      </p>
                      <div style={{ marginTop: 'auto' }}>
                        <Link
                          href={`/booking?serviceType=HOTEL&serviceId=${offer.id}&serviceTitle=${encodeURIComponent(offer.name)}&price=${offer.pricePerNight}`}
                          className="btn-booking"
                          style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '0.65rem 1rem',
                            borderRadius: '6px',
                            color: '#fff',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <i className="fas fa-calendar-check" style={{ marginRight: '0.4rem' }}></i>
                          Réserver
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                <i className="fas fa-bed fa-3x" style={{ color: '#ccc', marginBottom: '1rem' }}></i>
                <h3>Aucun hébergement trouvé</h3>
                <p>Essayez d&apos;élargir vos critères de recherche pour découvrir d&apos;autres disponibilités.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== POPULAR DESTINATIONS ==================== */}
      <section className="destination" style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="heading" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 className="title-heading" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text, #001b1a)' }}>
              Destinations populaires
            </h1>
            <div className="desc-heading" style={{ maxWidth: '800px', margin: '1rem auto 0', color: '#666' }}>
              <p>
                Découvrez les destinations les plus prisées et laissez-vous inspirer par la beauté du monde.
                Plages immaculées, médinas chargées d&apos;histoire ou paysages désertiques à couper le souffle.
              </p>
            </div>
          </div>

          <div
            className="items"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="item"
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'var(--card, #fff)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                }}
              >
                <div className="img-item" style={{ height: '220px', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.imageUrl}
                    alt={dest.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <small className="local" style={{ color: '#01796F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {dest.country}
                  </small>
                  <h2 className="title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.4rem 0 0.8rem' }}>
                    {dest.name}
                  </h2>
                  <div className="desc" style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <p>{dest.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TYPES D'HÉBERGEMENTS ==================== */}
      <section className="room top" id="room" style={{ padding: '3rem 1rem 4rem', background: 'var(--bg, #f4f6f6)' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="heading_top flex1" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase', color: 'var(--text, #001b1a)', fontWeight: 800 }}>
              Type d&apos;hébergements
            </h2>
          </div>

          <div
            className="content grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            <div className="box" style={{ background: 'var(--card, #fff)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <div className="img" style={{ height: '200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/maisonsVacances.jpg" alt="Maisons de vacances" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="text" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <Link href="/hotels" style={{ color: 'var(--text, #001b1a)' }}>Maisons de vacances</Link>
                </h3>
              </div>
            </div>

            <div className="box" style={{ background: 'var(--card, #fff)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <div className="img" style={{ height: '200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/hotels.jpg" alt="Hôtels" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="text" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <Link href="/hotels" style={{ color: 'var(--text, #001b1a)' }}>Hôtels &amp; Riads</Link>
                </h3>
              </div>
            </div>

            <div className="box" style={{ background: 'var(--card, #fff)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <div className="img" style={{ height: '200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/appartements.jpg" alt="Appartements" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="text" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <Link href="/hotels" style={{ color: 'var(--text, #001b1a)' }}>Appartements urbains</Link>
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GALERIE PHOTO ==================== */}
      <section className="gallery" id="gallery" style={{ padding: '4rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="heading" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Galerie de Voyage
            </h2>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>Quelques aperçus de voyages inoubliables partagés par nos clients</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1rem',
            }}
          >
            {['galerie3.jpg', 'galerie4.jpg', 'galerie5.jpg', 'galerie6.jpg', 'galerie7.jpg', 'galerie8.jpg'].map((imgName, index) => (
              <div key={index} style={{ height: '180px', borderRadius: '8px', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/image/${imgName}`}
                  alt={`Galerie ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== AVIS & COMMENTAIRES ==================== */}
      <section style={{ padding: '3rem 1rem 5rem', background: 'var(--bg, #f4f6f6)' }}>
        <div className="container" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 800 }}>
            Laissez votre avis
          </h2>

          {commentFeedback && (
            <div style={{ padding: '1rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
              {commentFeedback}
            </div>
          )}

          <div className="cadre-formulaire" style={{ background: 'var(--card, #fff)', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleCommentSubmit} className="comment">
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="nom" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Votre nom :
                </label>
                <input
                  type="text"
                  id="nom"
                  value={commentName || user?.firstName || ''}
                  onChange={(e) => setCommentName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Votre adresse email :
                </label>
                <input
                  type="email"
                  id="email"
                  value={commentEmail || user?.email || ''}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="commentaire" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Votre commentaire :
                </label>
                <textarea
                  id="commentaire"
                  rows={4}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                className="btn-booking"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Envoyer mon avis
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
