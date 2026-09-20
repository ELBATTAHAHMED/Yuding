'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { HotelOffer } from '@/types/travel.types';

export default function HotelsPage() {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadHotels() {
      setLoading(true);
      try {
        const data = await travelService.searchHotels();
        setHotels(data.results || []);
        if (data.status === 'PROVIDER_UNAVAILABLE') {
          setProviderMessage(data.message);
        }
      } catch {
        setHotels([]);
      } finally {
        setLoading(false);
      }
    }
    loadHotels();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await travelService.searchHotels(country, city);
      setHotels(data.results || []);
      if (data.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(data.message);
      } else {
        setProviderMessage(null);
      }
    } catch {
      setHotels([]);
      setProviderMessage('Impossible de contacter le service de voyage.');
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter((h) => {
    if (filterType === 'ALL') return true;
    return h.type === filterType;
  });

  return (
    <div>
      {/* ==================== HERO SECTION ==================== */}
      <section style={{ background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)', padding: '5rem 1rem 4rem', color: '#fff', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Hébergements &amp; Riads
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb', marginBottom: '2.5rem' }}>
            Trouvez le séjour de vos rêves parmi nos hôtels, villas de vacances et appartements de charme
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              background: 'var(--card, #fff)',
              padding: '1.75rem',
              borderRadius: '12px',
              color: 'var(--text, #001b1a)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ flex: '1 1 240px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <i className="fas fa-globe-africa" style={{ color: '#01796F', marginRight: '0.4rem' }}></i>
                Pays
              </label>
              <input
                type="text"
                placeholder="Ex: Maroc, France"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ flex: '1 1 240px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#01796F', marginRight: '0.4rem' }}></i>
                Ville
              </label>
              <input
                type="text"
                placeholder="Ex: Marrakech, Chefchaouen"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <button
                type="submit"
                className="btn-booking"
                disabled={loading}
                style={{ padding: '0.85rem 2rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', color: '#fff' }}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search" style={{ marginRight: '0.4rem' }}></i>}
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ==================== FILTER TABS & RESULTS ==================== */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Tous', value: 'ALL' },
              { label: 'Hôtels & Riads', value: 'HOTEL' },
              { label: 'Maisons de vacances', value: 'VACATION_HOME' },
              { label: 'Appartements', value: 'APARTMENT' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterType(tab.value)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: filterType === tab.value ? '#01796F' : 'var(--card, #eee)',
                  color: filterType === tab.value ? '#fff' : 'var(--text, #333)',
                  boxShadow: filterType === tab.value ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredHotels.length === 0 ? (
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
                <i className="fas fa-hotel"></i>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Aucun hébergement disponible pour le moment
              </h3>
              <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {providerMessage ||
                  'Votre recherche a été validée avec succès par le service de voyage V2. Les intégrations des hébergements et hôtels en direct sont planifiées pour la Phase 21+.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '2rem',
              }}
            >
              {filteredHotels.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--card, #fff)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ height: '200px', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl || '/image/hotels.jpg'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.name}</h3>
                      <div style={{ color: '#ffb300', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <i className="fas fa-star"></i>
                        <span>{item.rating}</span>
                      </div>
                    </div>

                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#01796F', marginRight: '0.4rem' }}></i>
                      {item.city}, {item.country}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F' }}>{item.pricePerNight} €</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}> / nuit</span>
                      </div>

                      <Link
                        href={`/booking?serviceType=HOTEL&serviceId=${item.id}&serviceTitle=${encodeURIComponent(item.name)}&price=${item.pricePerNight}`}
                        className="btn-booking"
                        style={{ padding: '0.65rem 1.25rem', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                      >
                        Réserver
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
