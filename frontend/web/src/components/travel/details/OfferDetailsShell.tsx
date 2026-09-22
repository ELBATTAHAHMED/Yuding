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
    <div className="travel-details-shell bg-slate-50 dark:bg-[#021817] min-h-screen py-8 px-4 pb-24 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#01796F] dark:text-[#02E0D5] bg-[#01796F]/10 dark:bg-[#01796F]/20 hover:bg-[#01796F]/20 dark:hover:bg-[#01796F]/30 px-3.5 py-2 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-xs" />
            <span>{backLabel}</span>
          </Link>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="travel-details-shell__grid grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#062523] border-t border-slate-200 dark:border-[#01796F]/30 p-3 z-40 shadow-2xl">
          {mobileAction}
        </div>
      )}
    </div>
  );
};
