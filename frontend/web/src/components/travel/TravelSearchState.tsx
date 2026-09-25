'use client';

import React from 'react';

export type TravelVertical = 'HOTEL' | 'FLIGHT' | 'ACTIVITY' | 'TRANSFER' | 'TRAIN';
export type SearchStatus = 'INITIAL' | 'LOADING' | 'EMPTY' | 'ERROR' | 'UNSUPPORTED';

export interface TravelSearchStateProps {
  vertical: TravelVertical;
  status: SearchStatus;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onModifySearch?: () => void;
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_CONFIGS: Record<TravelVertical, {
  initialIcon: string;
  initialTitle: string;
  initialDesc: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyDesc: string;
  errorTitle: string;
  errorDesc: string;
}> = {
  HOTEL: {
    initialIcon: 'fa-bed',
    initialTitle: 'Recherchez vos hébergements en direct',
    initialDesc: 'Indiquez votre destination et vos dates de séjour ci-dessus pour consulter les disponibilités réelles.',
    emptyIcon: 'fa-bed',
    emptyTitle: 'Aucun hébergement trouvé',
    emptyDesc: "Aucune chambre ou établissement disponible pour ces critères. Essayez d'autres dates ou une autre destination.",
    errorTitle: 'Disponibilités momentanément inaccessibles',
    errorDesc: 'Le service partenaire hôtelier est momentanément indisponible. Veuillez réessayer.',
  },
  FLIGHT: {
    initialIcon: 'fa-plane-departure',
    initialTitle: 'Recherchez vos liaisons aériennes',
    initialDesc: 'Sélectionnez vos aéroports de départ, d’arrivée et vos dates pour afficher les vols réels disponibles.',
    emptyIcon: 'fa-plane-slash',
    emptyTitle: 'Aucun vol disponible',
    emptyDesc: "Aucun vol direct ou avec escale n’a été identifié pour cet itinéraire. Essayez une date voisine.",
    errorTitle: 'Liaisons aériennes momentanément indisponibles',
    errorDesc: 'La consultation des liaisons aériennes en temps réel a rencontré une indisponibilité temporaire. Veuillez réessayer.',
  },
  ACTIVITY: {
    initialIcon: 'fa-ticket-alt',
    initialTitle: 'Explorez vos activités et visites',
    initialDesc: 'Renseignez votre destination ci-dessus pour découvrir les visites guidées, excursions et expériences en direct.',
    emptyIcon: 'fa-ticket-alt',
    emptyTitle: 'Aucune activité trouvée',
    emptyDesc: 'Aucune offre d’activité disponible pour cette destination et cette date. Essayez une autre ville ou date.',
    errorTitle: 'Catalogue d’activités momentanément inaccessible',
    errorDesc: 'Le service des activités et expériences est momentanément indisponible. Veuillez réessayer.',
  },
  TRANSFER: {
    initialIcon: 'fa-taxi',
    initialTitle: 'Réservez votre transfert privé',
    initialDesc: 'Précisez votre lieu de prise en charge et de destination pour afficher les véhicules et tarifs en direct.',
    emptyIcon: 'fa-car-side',
    emptyTitle: 'Aucun transfert disponible',
    emptyDesc: 'Aucun véhicule disponible pour cet itinéraire ou cet horaire. Vérifiez les points de départ et d’arrivée.',
    errorTitle: 'Service de transfert momentanément inaccessible',
    errorDesc: 'La tarification des transferts est temporairement indisponible auprès du prestataire. Veuillez réessayer.',
  },
  TRAIN: {
    initialIcon: 'fa-train',
    initialTitle: 'Consultez les horaires ferroviaires',
    initialDesc: 'Sélectionnez votre gare de départ, de destination et votre date pour afficher les circulations en temps réel.',
    emptyIcon: 'fa-train',
    emptyTitle: 'Aucun trajet ferroviaire trouvé',
    emptyDesc: 'Aucune circulation directe ou horaire correspondant n’a été identifiée pour cette liaison et cette date.',
    errorTitle: 'Horaires ferroviaires momentanément inaccessibles',
    errorDesc: 'Le réseau partenaire ferroviaire ne répond pas pour le moment. Veuillez réessayer.',
  },
};

export function TravelSearchState({
  vertical,
  status,
  title,
  description,
  onRetry,
  onModifySearch,
  icon,
  className = '',
  children,
}: TravelSearchStateProps) {
  // If loading and custom children (like skeleton) provided, render children
  if (status === 'LOADING') {
    return children ? <>{children}</> : (
      <div className={`rounded-2xl border border-slate-200/80 dark:border-[#01796F]/20 bg-white dark:bg-[#062523] p-10 text-center shadow-sm max-w-lg mx-auto my-8 ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#01796F] dark:text-[#02E0D5] ring-1 ring-[#01796F]/20 mx-auto flex items-center justify-center text-lg mb-3">
          <i className="fas fa-spinner fa-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          Recherche en cours…
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Interrogation des disponibilités et tarifs en temps réel.
        </p>
      </div>
    );
  }

  const config = DEFAULT_CONFIGS[vertical];
  const isError = status === 'ERROR' || status === 'UNSUPPORTED';
  const isInitial = status === 'INITIAL';

  const displayIcon = icon || (isError ? 'fa-exclamation-circle' : isInitial ? config.initialIcon : config.emptyIcon);
  const displayTitle = title || (isError ? config.errorTitle : isInitial ? config.initialTitle : config.emptyTitle);
  const displayDesc = description || (isError ? config.errorDesc : isInitial ? config.initialDesc : config.emptyDesc);

  const handleModifyClick = () => {
    if (onModifySearch) {
      onModifySearch();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`travel-search-state rounded-2xl border p-8 text-center shadow-sm max-w-xl mx-auto my-6 transition-all ${
        isError
          ? 'border-red-200/80 bg-red-50/40 dark:border-red-900/30 dark:bg-red-950/20'
          : 'border-slate-200/90 bg-white dark:border-[#01796F]/30 dark:bg-[#062523]'
      } ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-xl mb-4 ring-1 transition-all ${
          isError
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-red-300/40 dark:ring-red-800/40'
            : 'bg-teal-50 dark:bg-teal-950/40 text-[#01796F] dark:text-[#02E0D5] ring-[#01796F]/20 dark:ring-[#02E0D5]/20'
        }`}
      >
        <i className={`fas ${displayIcon}`} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
        {displayTitle}
      </h3>

      {displayDesc && (
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto mb-5">
          {displayDesc}
        </p>
      )}

      {/* Action buttons: strictly limited to Réessayer or Modifier la recherche — zero unrelated CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#01796F] hover:bg-[#015f57] text-white text-xs font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01796F]/50"
          >
            <i className="fas fa-redo-alt text-[10px]" aria-hidden="true" />
            <span>Réessayer</span>
          </button>
        )}

        {!isInitial && !isError && (
          <button
            type="button"
            onClick={handleModifyClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#01796F]/40 bg-slate-50 dark:bg-[#0a302d] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#01796F] hover:text-[#01796F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#01796F]/50"
          >
            <i className="fas fa-sliders-h text-[11px]" aria-hidden="true" />
            <span>Modifier la recherche</span>
          </button>
        )}
      </div>
    </div>
  );
}
