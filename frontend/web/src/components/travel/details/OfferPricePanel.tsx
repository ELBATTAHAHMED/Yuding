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
    <div className="bg-white dark:bg-[#062523] rounded-xl p-5 md:p-6 border border-slate-200 dark:border-[#01796F]/30 shadow-md">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
        Récapitulatif du Tarif
      </h3>

      {isFareUnavailable || amount == null ? (
        <div className="p-4 bg-slate-50 dark:bg-[#021817] rounded-lg border border-dashed border-slate-300 dark:border-[#01796F]/30 text-slate-500 dark:text-slate-400 text-xs text-center mb-4">
          <i className="fas fa-info-circle mr-1.5 text-slate-400" />
          <span>{fareUnavailableMessage}</span>
        </div>
      ) : (
        <div className="mb-5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl md:text-3xl font-extrabold text-[#01796F] dark:text-[#02E0D5]">
              <PriceDisplay conversion={conversion} amount={amount} currency={currency} />
            </span>
            {unitLabel && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {unitLabel}
              </span>
            )}
          </div>

          {priceType === 'round_trip_starting' && (
            <div className="text-[11px] text-slate-400 mt-1">
              Tarif à partir de (Aller / Retour)
            </div>
          )}

          {/* Genuine breakdown if provider supplied real breakdown items */}
          {breakdown && breakdown.length > 0 && (
            <div className="mt-4 border-t border-slate-100 dark:border-[#01796F]/20 pt-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Détail du prix fournisseur :
              </div>
              {breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{item.amount.toFixed(2)} {item.currency}</span>
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
          className="btn-booking flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-[#01796F] hover:bg-[#015f57] text-white font-bold text-sm text-center shadow-md transition-colors"
        >
          <i className="fas fa-check-circle" />
          <span>{bookingLabel}</span>
        </Link>
      )}

      {/* Transparency Note */}
      <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 leading-tight text-center">
        <i className="fas fa-shield-alt mr-1" />
        Données d&apos;offre de recherche. Tarifs et disponibilités vérifiés en temps réel lors de la finalisation.
      </p>
    </div>
  );
};
