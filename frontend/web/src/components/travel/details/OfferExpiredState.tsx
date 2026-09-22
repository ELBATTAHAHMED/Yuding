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
    <div
      style={{
        maxWidth: '600px',
        margin: '4rem auto',
        padding: '3rem 2rem',
        background: 'var(--card, #ffffff)',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(217, 119, 6, 0.1)',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto 1.5rem',
        }}
      >
        <i className="fas fa-clock" />
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text, #0f172a)', margin: '0 0 0.75rem 0' }}>
        Détails de l&apos;offre non disponibles
      </h2>

      <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
        Les informations pour {productLabel} ne sont plus disponibles dans la session de recherche actuelle ou ont expiré. Veuillez relancer une recherche pour actualiser les disponibilités en temps réel auprès de nos partenaires.
      </p>

      <Link
        href={searchHref}
        className="btn-booking"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.8rem 1.75rem',
          borderRadius: '8px',
          backgroundColor: '#01796F',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(1, 121, 111, 0.3)',
        }}
      >
        <i className="fas fa-search" />
        <span>{searchLabel}</span>
      </Link>
    </div>
  );
};
