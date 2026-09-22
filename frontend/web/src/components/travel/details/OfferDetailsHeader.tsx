import React from 'react';

export interface OfferDetailsHeaderProps {
  /** Main title / entity name / route (e.g. "Casablanca → Paris (CDG)") */
  title: string;
  /** Subtitle / date / duration info */
  subtitle?: string;
  /** Product type icon class (e.g. "fas fa-plane") */
  icon?: string;
  /** Provider code or source name (e.g. "SCRAPPA", "NUITEE", "HBX", "ONCF GTFS") */
  provider?: string;
  /** Secondary provider or feed attribution */
  sourceLabel?: string;
  /** Badges (e.g. ["Direct", "Classe Économique"]) */
  badges?: string[];
}

export const OfferDetailsHeader: React.FC<OfferDetailsHeaderProps> = ({
  title,
  subtitle,
  icon = 'fas fa-map-marker-alt',
  provider,
  sourceLabel,
  badges = [],
}) => {
  return (
    <div className="bg-white dark:bg-[#062523] rounded-xl p-5 md:p-6 border border-slate-200 dark:border-[#01796F]/30 shadow-md">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
          <div className="w-12 h-12 rounded-xl bg-[#01796F]/10 dark:bg-[#01796F]/20 text-[#01796F] dark:text-[#02E0D5] flex items-center justify-center text-xl shrink-0">
            <i className={icon} />
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1 leading-snug">
              {title}
            </h1>
            {subtitle && (
              <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-300 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Provider & Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {provider && (
            <span className="text-[11px] font-bold text-[#01796F] dark:text-[#02E0D5] bg-[#01796F]/10 dark:bg-[#01796F]/20 border border-[#01796F]/30 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {sourceLabel ? `${sourceLabel}: ${provider}` : `Fournisseur : ${provider}`}
            </span>
          )}

          {badges.map((b, idx) => (
            <span
              key={idx}
              className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#0a302d] border border-slate-200 dark:border-[#01796F]/20 px-2.5 py-1 rounded-md"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
