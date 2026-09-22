import React from 'react';
import Link from 'next/link';
import { PriceDisplay } from '../PriceDisplay';
import type { PriceConversionSnapshot } from '@/types/travel.types';

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  currency: string;
}

export interface OfferPricePanelProps {
  amount?: number | null;
  currency?: string;
  conversion?: PriceConversionSnapshot;
  unitLabel?: string; // e.g. "par personne", "par nuit", "total"
  priceType?: string; // e.g. "round_trip_starting"
  breakdown?: PriceBreakdownItem[];
  bookingHref?: string;
  bookingLabel?: string;
  isFareUnavailable?: boolean;
  fareUnavailableMessage?: string;
}

export const OfferPricePanel: React.FC<OfferPricePanelProps> = ({
  amount,
  currency = 'EUR',
  conversion,
  unitLabel,
  priceType,
  breakdown,
  bookingHref,
  bookingLabel = 'Sélectionner cette offre',
  isFareUnavailable = false,
  fareUnavailableMessage = 'Tarif non disponible via cette source de données',
}) => {
  return (
    <div
      style={{
        background: 'var(--card, #ffffff)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      }}
    >
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text, #0f172a)' }}>
        Récapitulatif du Tarif
      </h3>

      {isFareUnavailable || amount == null ? (
        <div
          style={{
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '0.9rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <i className="fas fa-info-circle" style={{ marginRight: '0.4rem', color: '#94a3b8' }} />
          <span>{fareUnavailableMessage}</span>
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#01796F' }}>
              <PriceDisplay conversion={conversion} amount={amount} currency={currency} />
            </span>
            {unitLabel && (
              <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
                {unitLabel}
              </span>
            )}
          </div>

          {priceType === 'round_trip_starting' && (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Tarif à partir de (Aller / Retour)
            </div>
          )}

          {/* Genuine breakdown if provider supplied real breakdown items */}
          {breakdown && breakdown.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                Détail du prix fournisseur :
              </div>
              {breakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  <span>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.amount.toFixed(2)} {item.currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      {bookingHref && (
        <Link
          href={bookingHref}
          className="btn-booking"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#01796F',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            textAlign: 'center',
            boxSizing: 'border-box',
            boxShadow: '0 4px 12px rgba(1, 121, 111, 0.25)',
            transition: 'background-color 0.2s ease, transform 0.1s ease',
          }}
        >
          <i className="fas fa-check-circle" />
          <span>{bookingLabel}</span>
        </Link>
      )}

      {/* Transparency Note */}
      <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, textAlign: 'center' }}>
        <i className="fas fa-shield-alt" style={{ marginRight: '0.25rem' }} />
        Données d&apos;offre de recherche. Tarifs et disponibilités vérifiés en temps réel lors de la finalisation.
      </p>
    </div>
  );
};
