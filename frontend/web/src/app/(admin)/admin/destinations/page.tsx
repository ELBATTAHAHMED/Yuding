'use client';

import React, { useState } from 'react';
import { useAdminDestinations } from '@/hooks/queries/useAdminQueries';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';

export default function AdminDestinationsPage() {
  const { data: destinations = [], isLoading, refetch, isRefetching } = useAdminDestinations();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const filtered = destinations.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.city.toLowerCase().includes(term) ||
      d.slug.toLowerCase().includes(term)
    );
  });

  const handleCopy = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Destinations Phares &amp; Éditoriales
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catalogue des régions et villes marocaines enregistrées dans le schéma travel.destinations
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
        >
          <i className={`fas fa-sync text-[11px] ${isRefetching ? 'animate-spin' : ''}`} />
          <span>Actualiser ({destinations.length})</span>
        </button>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher une destination par nom, ville, slug..."
        filters={[]}
      />

      {/* Destinations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 h-44 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100 m-0">
                      {d.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                      <i className="fas fa-map-marker-alt text-[10px] text-emerald-600 dark:text-emerald-400" />
                      <span>{d.city}, {d.countryName || 'Maroc'}</span>
                    </div>
                  </div>

                  <AdminBadge variant={d.isActive ? 'success' : 'neutral'} size="sm">
                    {d.isActive ? 'Active' : 'Inactive'}
                  </AdminBadge>
                </div>

                {d.description && (
                  <p className="text-xs line-clamp-2 text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 admin-mono-tabular text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">/{d.slug}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(d.slug)}
                    className="opacity-50 hover:opacity-100 p-0.5 transition-opacity"
                    title="Copier le slug"
                  >
                    <i className={`fas ${copiedSlug === d.slug ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  </button>
                </div>

                <span className="text-[10px] admin-mono-tabular font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {d.countryCode}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
