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
  /** Optional action slot (e.g. FavoriteButton) */
  action?: React.ReactNode;
}

export const OfferDetailsHeader: React.FC<OfferDetailsHeaderProps> = ({
  title,
  subtitle,
  icon = 'fas fa-map-marker-alt',
  provider,
  sourceLabel,
  badges = [],
  action,
}) => {
  return (
    <div className="travel-details-header">
      <div className="travel-details-header__layout flex items-start justify-between gap-4 flex-wrap">
        <div className="travel-details-header__identity flex items-center gap-4 flex-1 min-w-[240px]">
          <div className="travel-details-header__icon w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className={icon} />
          </div>

          <div className="travel-details-header__copy">
            <h1 className="text-xl md:text-2xl font-bold mb-1 leading-snug">
              {title}
            </h1>
            {subtitle && (
              <p className="m-0 text-xs md:text-sm font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Provider, Badges & Action */}
        <div className="travel-details-header__badges flex items-center gap-2 flex-wrap">
          {provider && (
            <span className="travel-details-provider text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {sourceLabel ? `${sourceLabel}: ${provider}` : `Fournisseur : ${provider}`}
            </span>
          )}

          {badges.map((b, idx) => (
            <span
              key={idx}
              className="travel-details-badge text-[11px] font-semibold px-2.5 py-1 rounded-md"
            >
              {b}
            </span>
          ))}

          {action && <div className="travel-details-header__action ml-1">{action}</div>}
        </div>
      </div>
    </div>
  );
};
