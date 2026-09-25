'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { bookingService } from '@/services/booking.service';
import type { BookingResponseDto, BookingStatus, BookingProductType } from '@/types/booking.types';

function getStatusPresentation(status: BookingStatus): {
  label: string;
  className: string;
  icon: string;
} {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmé',
        className: 'confirmed',
        icon: 'fas fa-check-circle',
      };
    case 'PAID':
      // CRITICAL ARCHITECTURAL RULE: PAID is NEVER displayed as CONFIRMED
      return {
        label: 'Payé (en attente confirmation prestataire)',
        className: 'paid',
        icon: 'fas fa-shield-alt',
      };
    case 'PENDING_PROVIDER_CONFIRMATION':
      return {
        label: 'En attente confirmation prestataire',
        className: 'pending',
        icon: 'fas fa-clock',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'En attente de paiement',
        className: 'pending',
        icon: 'fas fa-wallet',
      };
    case 'DRAFT':
      return {
        label: 'Brouillon',
        className: 'draft',
        icon: 'fas fa-file-alt',
      };
    case 'PAYMENT_FAILED':
      return {
        label: 'Paiement échoué',
        className: 'failed',
        icon: 'fas fa-times-circle',
      };
    case 'CANCELLED':
      return {
        label: 'Annulé',
        className: 'cancelled',
        icon: 'fas fa-ban',
      };
    case 'REFUNDED':
      return {
        label: 'Remboursé',
        className: 'refunded',
        icon: 'fas fa-undo',
      };
    case 'EXPIRED':
      return {
        label: 'Expiré',
        className: 'cancelled',
        icon: 'fas fa-hourglass-end',
      };
    default:
      return {
        label: status,
        className: 'draft',
        icon: 'fas fa-info-circle',
      };
  }
}

function getProductTypePresentation(type: BookingProductType): {
  label: string;
  icon: string;
} {
  switch (type) {
    case 'HOTEL':
      return { label: 'Hôtel', icon: 'fas fa-hotel' };
    case 'FLIGHT':
      return { label: 'Vol', icon: 'fas fa-plane' };
    case 'ACTIVITY':
      return { label: 'Activité', icon: 'fas fa-hiking' };
    case 'TRANSFER':
      return { label: 'Transfert', icon: 'fas fa-taxi' };
    case 'TRAIN':
      return { label: 'Train', icon: 'fas fa-train' };
    default:
      return { label: type, icon: 'fas fa-suitcase-rolling' };
  }
}

function formatBookingDate(isoString?: string): string {
  if (!isoString) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatBookingPrice(amount?: number | null, currency?: string | null): string | null {
  if (amount == null || !currency) return null;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function BookingsClient() {
  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getMyBookings();
      if (Array.isArray(data)) {
        // Sort descending by createdAt (most recent first)
        const sorted = [...data].sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setBookings(sorted);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible de récupérer vos réservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <main className="account-empty-page">
      <header className="account-page-header">
        <div>
          <p className="account-kicker">VOTRE ESPACE VOYAGEUR</p>
          <h1>Mes réservations</h1>
          <p>Retrouvez au même endroit vos séjours, trajets et expériences.</p>
        </div>
        <span className="account-header-mark">
          <i className="fas fa-suitcase-rolling" aria-hidden="true" />
        </span>
      </header>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin text-2xl text-teal-700" style={{ fontSize: '24px', color: '#087d70' }} />
          <p style={{ marginTop: '12px', color: 'var(--account-muted)', fontSize: '13.5px' }}>
            Chargement de vos réservations...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            padding: '20px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-exclamation-triangle" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{error}</span>
          </div>
          <button
            onClick={fetchBookings}
            className="btn-secondary-sm"
            style={{ borderColor: '#fca5a5', color: '#b91c1c' }}
          >
            <i className="fas fa-redo" /> Réessayer
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && bookings.length === 0 && (
        <section className="account-empty-panel" aria-labelledby="bookings-empty-title">
          <div className="account-empty-icon">
            <i className="fas fa-suitcase-rolling" aria-hidden="true" />
          </div>
          <div className="account-empty-copy">
            <p className="account-kicker">VOTRE CARNET DE VOYAGE</p>
            <h2 id="bookings-empty-title">Aucune réservation pour le moment</h2>
            <p>
              Vos billets d&apos;avion, réservations d&apos;hôtels, transferts et activités confirmés
              apparaîtront ici automatiquement.
            </p>
          </div>
          <Link href="/" className="account-primary-action">
            <i className="fas fa-search" aria-hidden="true" /> Explorer les destinations
          </Link>
        </section>
      )}

      {/* Bookings List */}
      {!loading && !error && bookings.length > 0 && (
        <div className="library-list" style={{ marginTop: '20px', marginBottom: '32px' }}>
          {bookings.map((booking) => {
            const statusInfo = getStatusPresentation(booking.status);
            const productInfo = getProductTypePresentation(booking.productType);
            const snapshot = booking.offerSnapshot;
            const details = snapshot?.selectedDetails || {};
            const itemTitle =
              details.title ||
              details.hotelName ||
              details.name ||
              details.airline ||
              details.originStation
                ? `${details.originStation} → ${details.destinationStation || ''}`
                : `${productInfo.label} — ${booking.bookingReference}`;

            const itemDestination =
              details.destination ||
              details.city ||
              (details.origin && details.destination ? `${details.origin} → ${details.destination}` : null);

            const displayPrice = snapshot?.providerAmount
              ? formatBookingPrice(snapshot.providerAmount, snapshot.providerCurrency)
              : null;

            const isPendingPayment = booking.status === 'DRAFT' || booking.status === 'PENDING_PAYMENT';
            const isConfirmedOrPaid = booking.status === 'CONFIRMED' || booking.status === 'PAID';

            return (
              <div key={booking.bookingReference} className="library-list-item">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexGrow: 1, minWidth: 0 }}>
                  <div className="booking-type-icon" title={productInfo.label}>
                    <i className={productInfo.icon} />
                  </div>

                  <div className="library-item-content">
                    <div className="library-item-main">
                      <span className="booking-ref-badge">{booking.bookingReference}</span>
                      <span className={`booking-status-badge ${statusInfo.className}`}>
                        <i className={statusInfo.icon} />
                        {statusInfo.label}
                      </span>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--account-ink, #1a2e2b)' }}>
                        {itemTitle}
                      </strong>
                    </div>

                    <div className="library-item-details" style={{ marginTop: '4px' }}>
                      {itemDestination && (
                        <span>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '4px', opacity: 0.7 }} />
                          {itemDestination}
                        </span>
                      )}
                      <span>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '4px', opacity: 0.7 }} />
                        Créée le {formatBookingDate(booking.createdAt)}
                      </span>
                      {snapshot?.provider && (
                        <span>
                          <i className="fas fa-shield-alt" style={{ marginRight: '4px', opacity: 0.7 }} />
                          Fournisseur : {snapshot.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '10px',
                    flexShrink: 0,
                  }}
                >
                  {displayPrice && (
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--account-ink, #1a2e2b)' }}>
                      {displayPrice}
                    </div>
                  )}

                  <div className="library-item-actions">
                    {isPendingPayment && (
                      <Link
                        href={`/booking/${booking.bookingReference}/payment`}
                        className="btn-primary-sm"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <i className="fas fa-credit-card" /> Payer
                      </Link>
                    )}

                    {isConfirmedOrPaid && (
                      <Link
                        href={`/booking/confirmation?reference=${booking.bookingReference}`}
                        className="btn-secondary-sm"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <i className="fas fa-receipt" /> Reçu
                      </Link>
                    )}

                    <Link
                      href={`/bookings/${booking.bookingReference}`}
                      className="btn-secondary-sm"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <i className="fas fa-folder-open" /> Dossier
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help / Plan Next Trip Footer */}
      <section className="account-help-row">
        <div>
          <strong>Prêt à préparer votre prochain départ&nbsp;?</strong>
          <span>Explorez les offres disponibles et construisez un voyage à votre rythme.</span>
        </div>
        <Link href="/planifier">
          Planifier un voyage <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
