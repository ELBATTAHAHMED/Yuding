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
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#01796F] hover:text-[#015f57] bg-[#01796F]/10 hover:bg-[#01796F]/15 px-3 py-1.5 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-xs" />
            <span>{backLabel}</span>
          </Link>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Main Content Column */}
          <main className="flex flex-col gap-6 min-w-0">
            {children}
          </main>

          {/* Sticky Sidebar Column (Desktop) */}
          <aside className="sticky top-6 flex flex-col gap-5">
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
