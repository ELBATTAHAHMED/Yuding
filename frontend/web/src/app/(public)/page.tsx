'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { HotelOffer } from '@/types/travel.types';
import { useAuth } from '@/features/auth/useAuth';
import { Toast } from '@/components/ui';
import { HotelCard } from '@/components/travel/HotelCard';
import { GeoPlaceSelector } from '@/components/travel';
import type { GeoPlace } from '@/types/geo.types';

export default function HomePage() {
  const { user } = useAuth();
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [selectedGeoPlace, setSelectedGeoPlace] = useState<GeoPlace | null>(null);
  const [capacity, setCapacity] = useState('1');
  const [results, setResults] = useState<HotelOffer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Comment form state
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearched(true);
    try {
      const data = await travelService.searchHotels(country, city);
      setResults(data.results || []);
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
      <section className="home" id="home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <video
          src="/image/video1.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="video"
        />
        <div className="wrapper">
          <div className="container">
            <h2 className="home-title">
              <br /> <strong>YUDING</strong>
            </h2>
            <div className="home-subtitle">
              <p>
                BIENVENUE
                <br />
                Nous apprécions votre temps et souhaitons nous assurer que votre expérience avec
                nous est sans stress et fluide. C&apos;est pourquoi nous avons investi dans cette
                plateforme pour rendre les réservations plus accessibles et efficaces.
              </p>
            </div>

            <div className="home-btns">
              <a href="#searchHebergemets" className="btn-booking" style={{ color: 'white' }}>
                Hébergements
              </a>
              <Link href="/flights" className="btn-booking" style={{ color: 'white' }}>
                Vols
              </Link>
              <Link href="/transfers" className="btn-booking" style={{ color: 'white' }}>
                Taxi
              </Link>
              <Link href="/hotels" className="btn-booking" style={{ color: 'white' }}>
                location de Voiture
              </Link>
              <Link href="/activities" className="btn-booking" style={{ color: 'white' }}>
                Activites
              </Link>
              <Link href="/trains" className="btn-booking" style={{ color: 'white' }}>
                Trains
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SEARCH BAR ==================== */}
      <div className="touch-search">
        <div className="container">
          <form onSubmit={handleSearch} className="form" id="searchHebergemets">
            <div className="input-line">
              <label htmlFor="destination" className="input-label">
                Pays
              </label>
              <input
                type="text"
                name="destination"
                id="destination"
                className="input-field"
                placeholder="Entrer Pays"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ color: 'rgba(0, 27, 26, 0.75)' }}
              />
            </div>
            <div className="input-line" style={{ minWidth: '220px' }}>
              <GeoPlaceSelector
                id="home-city"
                label="Ville"
                placeholder="Entrer Ville (ex: Marrakech, Paris...)"
                type="city"
                selectedPlace={selectedGeoPlace}
                onSelect={(place) => {
                  setSelectedGeoPlace(place);
                  if (place) {
                    setCity(place.city || place.name);
                    if (place.country) setCountry(place.country);
                  } else {
                    setCity('');
                  }
                }}
              />
            </div>
            <div className="input-line">
              <label htmlFor="number" className="input-label">
                Nombre
              </label>
              <input
                type="number"
                name="child"
                id="number"
                className="input-field"
                placeholder="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={{ color: 'rgba(0, 27, 26, 0.75)' }}
              />
            </div>
            <div className="btns-line">
              <button type="submit" className="btn-booking" disabled={isSearching}>
                {isSearching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ==================== SEARCH RESULTS SECTION ==================== */}
      {searched && (
        <section id="search-results" className="search-results">
          <div className="container">
            <div className="results-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 className="results-title" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-strong, #01796F)' }}>
                Résultats de recherche
              </h2>
              <p className="results-subtitle" style={{ color: 'var(--text-secondary, #6c757d)', marginTop: '0.5rem' }}>
                Trouvez l&apos;hébergement parfait pour votre séjour
              </p>
            </div>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#01796F' }} />
                <p style={{ marginTop: '1rem', color: '#6c757d' }}>Recherche en cours...</p>
              </div>
            ) : results.length > 0 ? (
              <div id="results-container" className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {results.map((offer) => (
                  <HotelCard key={offer.id} hotel={offer} />
                ))}
              </div>
            ) : (
              <div className="no-results-container" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="no-results-icon" style={{ fontSize: '3rem', color: '#01796F', marginBottom: '1rem' }}>
                  <i className="fas fa-bed" />
                </div>
                <h3 className="no-results-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Aucun hébergement trouvé</h3>
                <p className="no-results-text" style={{ color: '#6c757d' }}>Essayez de modifier vos critères de recherche pour découvrir d&apos;autres hébergements disponibles.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== POPULAR DESTINATIONS ==================== */}
      <section className="destination">
        <div className="container">
          <div className="heading">
            <h4 className="subtitle-heading"></h4>
            <h1 className="title-heading">Destinations populaires</h1>
            <div className="desc-heading">
              <p>
                Découvrez les destinations les plus populaires de notre plateforme et trouvez
                l&apos;inspiration pour votre prochain voyage. Que vous cherchiez à vous détendre sur
                une plage exotique, à explorer une ville animée ou à vous immerger dans la nature, nous
                avons des options pour tous les goûts et tous les budgets.
              </p>
            </div>
          </div>
          <div className="items">
            <div className="item">
              <div className="img-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/chefchaoun.jpeg" alt="Chefchaouen" />
              </div>
              <div className="card">
                <small className="local">MAROC</small>
                <h2 className="title">CHEFCHAOUEN</h2>
                <div className="desc">
                  <p>
                    Chefchaouen, la perle bleue du Rif, offre des ruelles étroites, des maisons
                    blanches et bleues, et une atmosphère paisible.
                  </p>
                </div>
              </div>
            </div>
            <div className="item">
              <div className="img-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/Dakhla.jpg" alt="Dakhla" />
              </div>
              <div className="card">
                <small className="local">Maroc</small>
                <h2 className="title">DAKHLA</h2>
                <div className="desc">
                  <p>
                    Dakhla, Une destination de sports nautiques de premier plan avec un paysage
                    époustouflant de désert et de mer, et des fruits de mer délicieux.
                  </p>
                </div>
              </div>
            </div>
            <div className="item">
              <div className="img-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/marrakech.jpg" alt="Marrakech" />
              </div>
              <div className="card">
                <small className="local">Maroc</small>
                <h2 className="title">MARRAKECH</h2>
                <div className="desc">
                  <p>
                    Marrakech, une ville animée et vibrante qui offre une expérience culturelle
                    unique avec ses souks colorés, ses palais majestueux, ses jardins luxuriants et sa
                    cuisine épicée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== TYPES D'HÉBERGEMENTS ==================== */}
      <section className="room top" id="room">
        <div className="container">
          <div className="heading_top flex1">
            <div className="heading">
              <h2
                style={{
                  fontSize: '34px',
                  lineHeight: '44px',
                  textTransform: 'uppercase',
                  color: 'rgba(0, 27, 26, 0.75)',
                }}
              >
                Type d&apos;hébergements
              </h2>
            </div>
          </div>

          <div className="content grid">
            <div className="box">
              <div className="img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/maisonsVacances.jpg" alt="Maisons de vacances" />
              </div>
              <div className="text">
                <h3>
                  <Link href="/hotels" style={{ color: 'rgba(0, 27, 26, 0.75)' }}>
                    Maisons de vacances
                  </Link>
                </h3>
              </div>
            </div>
            <div className="box">
              <div className="img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/hotels.jpg" alt="Hotels" />
              </div>
              <div className="text">
                <h3>
                  <Link href="/hotels" style={{ color: 'rgba(0, 27, 26, 0.75)' }}>
                    Hotels
                  </Link>
                </h3>
              </div>
            </div>
            <div className="box">
              <div className="img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/image/appartements.jpg" alt="Appartements" />
              </div>
              <div className="text">
                <h3>
                  <Link href="/hotels" style={{ color: 'rgba(0, 27, 26, 0.75)' }}>
                    Appartements
                  </Link>
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GALERIE PHOTO ==================== */}
      <section className="gallery" id="gallery">
        <div className="container">
          <div className="heading">
            <h4 className="subtitle-heading"></h4>
            <h1 className="title-heading">PHOTOS DE NOTRE SERVICES</h1>
            <div className="desc-heading"></div>
          </div>
          <div className="items">
            {[
              'galerie1.jpg',
              'galerie2.jpg',
              'galerie3.jpg',
              'galerie4.jpg',
              'galerie5.jpg',
              'galerie6.jpg',
              'galerie7.jpg',
              'galerie8.jpg',
              'galerie9.jpeg',
            ].map((img, idx) => (
              <div key={idx} className="item">
                <div className="img-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/image/${img}`} alt={`Galerie ${idx + 1}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FORMULAIRE DE COMMENTAIRE ==================== */}
      <section>
        <h1
          style={{
            fontSize: '34px',
            lineHeight: '44px',
            textTransform: 'uppercase',
            color: 'rgba(0, 27, 26, 0.75)',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          Formulaire de commentaire
        </h1>
        {commentFeedback && (
          <div style={{ maxWidth: '600px', margin: '1rem auto' }}>
            <Toast type="success" message={commentFeedback} />
          </div>
        )}
        <div className="cadre-formulaire">
          <form onSubmit={handleCommentSubmit} className="comment">
            <label htmlFor="nom">Votre nom :</label>
            <input
              type="text"
              id="nom"
              name="nom"
              required
              value={commentName || user?.firstName || ''}
              onChange={(e) => setCommentName(e.target.value)}
            />

            <label htmlFor="email">Votre adresse email :</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={commentEmail || user?.email || ''}
              onChange={(e) => setCommentEmail(e.target.value)}
            />

            <label htmlFor="commentaire">Votre commentaire :</label>
            <textarea
              id="commentaire"
              name="commentaire"
              required
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
            />

            <button type="submit">Envoyer</button>
          </form>
        </div>
      </section>

      {/* ==================== CHATBOT ==================== */}
      <div className={`chatbot-container ${chatbotOpen ? 'show' : ''}`} id="chatbotContainer">
        <div className="chatbot-header">
          <svg
            className="chatbot-logo"
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 1024 1024"
          >
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z" />
          </svg>
          <span className="logo-text">AI Assistant</span>
          <button id="close-chatbot" className="close-btn" onClick={() => setChatbotOpen(false)}>
            ×
          </button>
        </div>
        <div className="chatbot-body" id="chatbotBody">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '8px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#01796F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <i className="fas fa-robot" style={{ fontSize: '13px' }} />
            </div>
            <div
              style={{
                background: 'rgba(241, 245, 249, 0.95)',
                color: '#0f172a',
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Bonjour ! Comment puis-je vous aider dans votre voyage aujourd&apos;hui ?
            </div>
          </div>
        </div>
        <div className="chatbot-footer">
          <input type="text" id="userInput" placeholder="Posez une question..." />
          <button className="send-btn" type="button">
            <i className="fa fa-paper-plane" />
          </button>
        </div>
      </div>

      {/* Chatbot Toggle Button */}
      <button
        className="chatbot-toggle"
        onClick={() => setChatbotOpen(!chatbotOpen)}
        title="AI Assistant"
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/a1.png" alt="Chatbot" />
      </button>
    </>
  );
}
