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
    <div className="max-w-xl mx-auto my-16 p-8 md:p-12 bg-white dark:bg-[#062523] rounded-2xl shadow-lg border border-slate-200 dark:border-white/10 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-6">
        <i className="fas fa-clock" />
      </div>

      <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-3">
        Détails de l&apos;offre non disponibles
      </h2>

      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
        Les informations pour {productLabel} ne sont plus disponibles dans la session de recherche actuelle ou ont expiré. Veuillez relancer une recherche pour actualiser les disponibilités en temps réel auprès de nos partenaires.
      </p>

      <Link
        href={searchHref}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#01796F] hover:bg-[#02E0D5] text-white hover:text-slate-950 font-bold text-sm transition shadow-md shadow-[#01796F]/20"
      >
        <i className="fas fa-search" />
        <span>{searchLabel}</span>
      </Link>
    </div>
  );
};
