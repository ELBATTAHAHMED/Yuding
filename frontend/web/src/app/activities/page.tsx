'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ActivityOffer } from '@/types/travel.types';

export default function ActivitiesPage() {
  const [category, setCategory] = useState('ALL');
  const [activities, setActivities] = useState<ActivityOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadActivities() {
      setLoading(true);
      try {
        const data = await travelService.searchActivities();
        setActivities(data);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  const filtered = activities.filter((act) => {
    if (category === 'ALL') return true;
    return act.category.toLowerCase().includes(category.toLowerCase());
  });

  return (
    <div>
      <section style={{ background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)', padding: '5rem 1rem 4rem', color: '#fff', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Activités &amp; Expériences
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb' }}>
            Explorez des aventures inoubliables, des sports nautiques et des visites culturelles guidées
          </p>
        </div>
      </section>

      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {filtered.map((act) => (
              <div
                key={act.id}
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
                  <img src={act.imageUrl || '/image/a1.jpg'} alt={act.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#01796F', textTransform: 'uppercase' }}>
                      {act.category}
                    </span>
                    {act.durationHours && (
                      <span style={{ fontSize: '0.85rem', color: '#888' }}>
                        <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>
                        {act.durationHours}h
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{act.title}</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                    {act.description}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F' }}>{act.price} €</span>
                      <span style={{ fontSize: '0.8rem', color: '#888' }}> / pers.</span>
                    </div>

                    <Link
                      href={`/booking?serviceType=ACTIVITY&serviceId=${act.id}&serviceTitle=${encodeURIComponent(act.title)}&price=${act.price}`}
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
        </div>
      </section>
    </div>
  );
}
