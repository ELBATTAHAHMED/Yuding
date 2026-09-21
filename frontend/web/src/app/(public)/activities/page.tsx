'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ActivityOffer } from '@/types/travel.types';

export default function ActivitiesPage() {
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [category, setCategory] = useState('ALL');

  const [activities, setActivities] = useState<ActivityOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!destination.trim()) {
      setErrorMessage('Veuillez saisir une destination pour lancer la recherche.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const data = await travelService.searchActivities({
        destination: destination.trim(),
        date: date || undefined,
        travelers: travelers > 0 ? travelers : 1,
        category: category !== 'ALL' ? category : undefined,
      });

      setActivities(data.results || []);
      if (data.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(data.message);
      }
    } catch (err: unknown) {
      setActivities([]);
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du partenaire d’activités. Veuillez patienter un instant.');
      } else if (msg.includes('TIMEOUT') || msg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai d’attente dépassé. Veuillez réessayer.');
      } else {
        setErrorMessage('Impossible de joindre le service d’activités. Vérifiez que la passerelle est active.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter((act) => {
    if (category === 'ALL') return true;
    return act.category?.toLowerCase().includes(category.toLowerCase());
  });

  return (
    <div>
      {/* ==================== HERO & SEARCH FORM ==================== */}
      <section
        style={{
          background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)',
          padding: '5rem 1rem 4rem',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Activités &amp; Expériences
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb', marginBottom: '2.5rem' }}>
            Explorez des aventures inoubliables, des excursions dans le désert et des visites culturelles guidées
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              background: 'var(--card, #fff)',
              padding: '1.75rem',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              color: 'var(--text, #333)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
              textAlign: 'left',
            }}
          >
            <div style={{ flex: '2 1 220px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '0.4rem' }}></i>
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ville ou code IATA (ex: Paris, Barcelone, Rome, Marrakech, BCN...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: '0.4rem' }}></i>
                Date de visite
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 110px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#01796F' }}>
                <i className="fas fa-user-friends" style={{ marginRight: '0.4rem' }}></i>
                Voyageurs
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={travelers}
                onChange={(e) => setTravelers(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ flex: '1 1 160px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#01796F',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(1, 121, 111, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Recherche...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    Rechercher
                  </>
                )}
              </button>
            </div>
          </form>

          {errorMessage && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', borderRadius: '8px', fontSize: '0.9rem' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
              {errorMessage}
            </div>
          )}
        </div>
      </section>

      {/* ==================== CONTENT SECTION ==================== */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Toutes les activités', value: 'ALL' },
              { label: 'Aventure & Désert', value: 'Aventure' },
              { label: 'Sports Nautiques', value: 'Sports' },
              { label: 'Culture & Médina', value: 'Culture' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategory(tab.value)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: category === tab.value ? '#01796F' : 'var(--card, #eee)',
                  color: category === tab.value ? '#fff' : 'var(--text, #333)',
                  boxShadow: category === tab.value ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!hasSearched && (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                background: 'var(--card, #fff)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(1, 121, 111, 0.1)',
                  color: '#01796F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                <i className="fas fa-compass"></i>
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Prêt à explorer votre prochaine destination ?
              </h3>
              <p style={{ color: '#666', maxWidth: '550px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Indiquez une ville ou un code IATA ci-dessus (par exemple <strong>Paris</strong>, <strong>Barcelone</strong>, <strong>Rome</strong> ou <strong>Marrakech</strong>) et cliquez sur Rechercher pour découvrir les offres en direct.
              </p>
            </div>
          )}

          {hasSearched && filtered.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                background: 'var(--card, #fff)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(1, 121, 111, 0.1)',
                  color: '#01796F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                <i className="fas fa-search-location"></i>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Aucune activité disponible pour le moment
              </h3>
              <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {providerMessage || 'Aucune offre trouvée pour cette sélection. Essayez une autre ville ou date.'}
              </p>
            </div>
          )}

          {hasSearched && filtered.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '2rem',
              }}
            >
              {filtered.map((act) => {
                const isCustom = act.source === 'YUDING_CUSTOM';
                const offerKey = act.offerId || act.id || act.title;

                return (
                  <div
                    key={offerKey}
                    style={{
                      background: 'var(--card, #fff)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={act.imageUrl || '/image/a1.jpg'}
                        alt={act.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/image/a1.jpg';
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: isCustom ? '#D97706' : '#01796F',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.65rem',
                          borderRadius: '20px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        }}
                      >
                        {isCustom ? 'Yuding Sélect' : 'Partenaire HBX'}
                      </span>
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#01796F', textTransform: 'uppercase' }}>
                          {act.category || 'Excursion'}
                        </span>
                        {act.durationHours && (
                          <span style={{ fontSize: '0.85rem', color: '#888' }}>
                            <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>
                            {act.durationHours}h
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: '1.4' }}>
                        {act.title}
                      </h3>
                      <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.5', flexGrow: 1 }}>
                        {act.description}
                      </p>

                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                        <div>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F' }}>
                            {act.price} {act.currency === 'USD' ? '$' : '€'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}> / pers.</span>
                        </div>

                        <Link
                          href={`/booking?serviceType=ACTIVITY&serviceId=${encodeURIComponent(offerKey)}&serviceTitle=${encodeURIComponent(act.title)}&price=${act.price}`}
                          className="btn-booking"
                          style={{
                            padding: '0.65rem 1.25rem',
                            borderRadius: '6px',
                            backgroundColor: '#01796F',
                            color: '#fff',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          Réserver
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
