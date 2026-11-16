import React from 'react';
import Link from 'next/link';

export interface OfferExpiredStateProps {
  productLabel?: string; // e.g. "vol", "hôtel", "activité", "transfert", "train"
  searchHref?: string;
  searchLabel?: string;
}

export const OfferExpiredState: React.FC<OfferExpiredStateProps> = ({
  productLabel = 'cette offre',
  searchHref = '/flights',
  searchLabel = 'Relancer une recherche',
}) => {
  return (
    <div className="travel-details-card travel-expired-state max-w-xl mx-auto my-16 p-8 md:p-12 text-center">
      <div className="travel-expired-state__icon w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
        <i className="fas fa-clock" />
      </div>

      <h2 className="travel-details-card__title text-xl md:text-2xl font-black mb-3">
        Détails de l&apos;offre non disponibles
      </h2>

      <p className="travel-expired-state__copy text-sm leading-relaxed mb-8">
        Les informations pour {productLabel} ne sont plus disponibles dans la session de recherche actuelle ou ont expiré. Veuillez relancer une recherche pour actualiser les disponibilités en temps réel auprès de nos partenaires.
      </p>

      <Link
        href={searchHref}
        className="travel-details-cta inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition shadow-md"
      >
        <i className="fas fa-search" />
        <span>{searchLabel}</span>
      </Link>
    </div>
  );
};
