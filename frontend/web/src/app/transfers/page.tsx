'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { TransferOffer } from '@/types/travel.types';

export default function TransfersPage() {
  const [transportType, setTransportType] = useState<'TAXI' | 'TRAIN' | 'CAR_RENTAL'>('TAXI');
  const [city, setCity] = useState('');
  const [transfers, setTransfers] = useState<TransferOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTransfers() {
      setLoading(true);
      try {
        const data = await travelService.searchTransfers(transportType, city);
        setTransfers(data);
      } finally {
        setLoading(false);
      }
    }
    loadTransfers();
  }, [transportType, city]);

  return (
    <div>
      <section style={{ background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)', padding: '5rem 1rem 4rem', color: '#fff', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Taxi, Trains &amp; Véhicules
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb' }}>
            Réservez vos transferts aéroport, trajets en train grande vitesse et voitures de location en toute sérénité
          </p>
        </div>
      </section>

      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTransportType('TAXI')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'TAXI' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'TAXI' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-taxi"></i>
              Taxi Privé &amp; VTC
            </button>

            <button
              onClick={() => setTransportType('TRAIN')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'TRAIN' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'TRAIN' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-train"></i>
              Trains &amp; TGV
            </button>

            <button
              onClick={() => setTransportType('CAR_RENTAL')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: transportType === 'CAR_RENTAL' ? '#01796F' : 'var(--card, #eee)',
                color: transportType === 'CAR_RENTAL' ? '#fff' : 'var(--text, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-car"></i>
              Location de Voitures
            </button>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {transfers.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--card, #fff)',
                  padding: '1.5rem 2rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: 'rgba(1, 121, 111, 0.1)',
                      color: '#01796F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                    }}
                  >
                    <i className={item.type === 'TAXI' ? 'fas fa-taxi' : item.type === 'TRAIN' ? 'fas fa-train' : 'fas fa-car'}></i>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.vehicleModel}</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ marginRight: '0.3rem', color: '#01796F' }}></i>
                      {item.departureCity} {item.arrivalCity ? `→ ${item.arrivalCity}` : ''}
                    </p>
                    {item.capacity && (
                      <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem', display: 'inline-block' }}>
                        <i className="fas fa-users" style={{ marginRight: '0.3rem' }}></i>
                        Jusqu&apos;à {item.capacity} passagers
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>
                      {item.price} €
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Prix forfaitaire garanti</div>
                  </div>

                  <Link
                    href={`/booking?serviceType=TRANSFER&serviceId=${item.id}&serviceTitle=${encodeURIComponent(item.vehicleModel || 'Transfert')}&price=${item.price}`}
                    className="btn-booking"
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
