import React from 'react';
import Link from 'next/link';

export interface OfferDetailsShellProps {
  /** Link to return to search results (e.g. "/flights") */
  backHref: string;
  /** Label for back link (e.g. "Retour aux vols") */
  backLabel?: string;
  /** Main column content */
  children: React.ReactNode;
  /** Sidebar / sticky summary content (Price panel, booking CTA) */
  sidebar: React.ReactNode;
  /** Optional mobile bottom bar content */
  mobileAction?: React.ReactNode;
}

export const OfferDetailsShell: React.FC<OfferDetailsShellProps> = ({
  backHref,
  backLabel = 'Retour aux résultats',
  children,
  sidebar,
  mobileAction,
}) => {
  return (
    <div style={{ background: 'var(--background, #f8fafc)', minHeight: '100vh', padding: '2rem 1rem 5rem' }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
        {/* Breadcrumb / Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href={backHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#01796F',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              background: 'rgba(1, 121, 111, 0.08)',
              transition: 'background 0.2s ease',
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '0.8rem' }} />
            <span>{backLabel}</span>
          </Link>
        </div>

        {/* 2-Column Responsive Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* Main Content Column */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            {children}
          </main>

          {/* Sticky Sidebar Column (Desktop) */}
          <aside
            style={{
              position: 'sticky',
              top: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {sidebar}
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (if provided) */}
      {mobileAction && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--card, #ffffff)',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            padding: '0.75rem 1rem',
            zIndex: 40,
            boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.08)',
          }}
        >
          {mobileAction}
        </div>
      )}
    </div>
  );
};
