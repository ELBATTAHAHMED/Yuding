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
    <div className="travel-details-card travel-price-panel">
      <h3 className="travel-details-card__title text-base font-bold mb-4">
        Récapitulatif du Tarif
      </h3>

      {isFareUnavailable || amount == null ? (
        <div className="travel-price-panel__unavailable p-4 rounded-lg border border-dashed text-xs text-center mb-4">
          <i className="fas fa-info-circle mr-1.5 text-slate-400" />
          <span>{fareUnavailableMessage}</span>
        </div>
      ) : (
        <div className="travel-price-panel__amount mb-5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="travel-price-panel__value text-2xl md:text-3xl font-extrabold">
              <PriceDisplay className="travel-price-display" conversion={conversion} amount={amount} currency={currency} />
            </span>
            {unitLabel && (
              <span className="travel-price-panel__unit text-xs font-medium">
                {unitLabel}
              </span>
            )}
          </div>

          {priceType === 'round_trip_starting' && (
            <div className="travel-price-panel__from text-[11px] mt-1">
              Tarif à partir de (Aller / Retour)
            </div>
          )}

          {/* Genuine breakdown if provider supplied real breakdown items */}
          {breakdown && breakdown.length > 0 && (
            <div className="travel-price-panel__breakdown mt-4 pt-3">
              <div className="travel-price-panel__breakdown-title text-xs font-bold mb-1.5">
                Détail du prix fournisseur :
              </div>
              {breakdown.map((item, idx) => (
                <div key={idx} className="travel-price-panel__breakdown-row flex justify-between text-xs mb-1">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.amount.toFixed(2)} {item.currency}</span>
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
          className="travel-details-cta btn-booking flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg font-bold text-sm text-center shadow-md transition-colors"
        >
          <i className="fas fa-check-circle" />
          <span>{bookingLabel}</span>
        </Link>
      )}

      {/* Transparency Note */}
      <p className="travel-price-panel__note mt-4 text-[11px] leading-tight text-center">
        <i className="fas fa-shield-alt mr-1" />
        Données d&apos;offre de recherche. Tarifs et disponibilités vérifiés en temps réel lors de la finalisation.
      </p>
    </div>
  );
};
