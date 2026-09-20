'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { bookingService } from '@/services/booking.service';
import { BookingRequest } from '@/types/booking.types';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const serviceType = (searchParams.get('serviceType') || 'HOTEL') as 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  const serviceId = searchParams.get('serviceId') || '101';
  const serviceTitle = searchParams.get('serviceTitle') || 'Séjour Découverte Yuding';
  const basePrice = parseFloat(searchParams.get('price') || '120');

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPrice = basePrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const bookingPayload: BookingRequest = {
      serviceType,
      serviceId,
      serviceTitle,
      startDate,
      endDate,
      quantity,
      totalPrice,
      currency: 'EUR',
      traveler: {
        firstName,
        lastName,
        email,
        phone,
      },
      specialRequests: notes,
    };

    try {
      const response = await bookingService.createBooking(bookingPayload);
      router.push(`/booking/confirmation?code=${response.confirmationCode}&id=${response.bookingId}&total=${response.totalPrice}`);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '4rem 1rem', background: 'var(--bg, #f4f6f6)', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text, #001b1a)' }}>
          Finaliser votre Réservation
        </h1>
        <p style={{ color: '#666', marginBottom: '2.5rem' }}>
          Veuillez renseigner les informations des voyageurs pour valider votre dossier
        </p>

        {error && (
          <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '2rem' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Reservation Form */}
          <div style={{ background: 'var(--card, #fff)', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
                Coordonnées du voyageur principal
              </h2>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Prénom</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Nom</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Téléphone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1.5rem 0 1rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
                Détails du voyage
              </h2>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Date début</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Date fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Nombre de personnes</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Demandes particulières (optionnel)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Arrivée tardive, lit bébé, régime alimentaire..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-booking"
                style={{ width: '100%', padding: '0.85rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', color: '#fff' }}
              >
                {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle" style={{ marginRight: '0.4rem' }}></i>}
                Confirmer la Réservation ({totalPrice} €)
              </button>
            </form>
          </div>

          {/* Summary Card */}
          <div style={{ background: 'var(--card, #fff)', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              Récapitulatif
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#01796F', fontWeight: 700, textTransform: 'uppercase' }}>
                {serviceType}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {serviceTitle}
              </h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <span style={{ color: '#666' }}>Prix unitaire</span>
              <span style={{ fontWeight: 600 }}>{basePrice} €</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <span style={{ color: '#666' }}>Nombre de personnes</span>
              <span style={{ fontWeight: 600 }}>× {quantity}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              <span style={{ color: '#666' }}>Frais de dossier &amp; taxes</span>
              <span style={{ fontWeight: 600, color: '#2e7d32' }}>Inclus</span>
            </div>

            <div
              style={{
                borderTop: '2px dashed #eee',
                paddingTop: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total estimé</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#01796F' }}>{totalPrice} €</span>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', lineHeight: '1.4' }}>
              * Estimation en direct affichée à titre indicatif. Le tarif final contractuel est certifié et validé côté serveur par le système de réservation.
            </p>

            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#e0f2f1', borderRadius: '8px', color: '#004d40', fontSize: '0.85rem' }}>
              <i className="fas fa-lock" style={{ marginRight: '0.4rem' }}></i>
              Paiement sécurisé &amp; tarification certifiée.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#00796b' }}></i>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
