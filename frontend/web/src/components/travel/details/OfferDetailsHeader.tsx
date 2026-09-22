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
    <div
      style={{
        background: 'var(--card, #ffffff)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(1, 121, 111, 0.1)',
              color: '#01796F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              flexShrink: 0,
            }}
          >
            <i className={icon} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text, #0f172a)', margin: '0 0 0.25rem 0', lineHeight: 1.3 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Provider & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {provider && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#01796F',
                background: 'rgba(1, 121, 111, 0.08)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid rgba(1, 121, 111, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              {sourceLabel ? `${sourceLabel}: ${provider}` : `Fournisseur : ${provider}`}
            </span>
          )}

          {badges.map((b, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#475569',
                background: '#f1f5f9',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
