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
          {filtered.map((d) => {
            const destinationPhotos: Record<string, string> = {
              'marrakech-magique': 'https://images.pexels.com/photos/3889855/pexels-photo-3889855.jpeg?auto=compress&cs=tinysrgb&w=800',
              'dakhla-lagune': 'https://images.pexels.com/photos/30560213/pexels-photo-30560213.jpeg?auto=compress&cs=tinysrgb&w=800',
              'chefchaouen-perle-bleue': 'https://images.pexels.com/photos/3581916/pexels-photo-3581916.jpeg?auto=compress&cs=tinysrgb&w=800',
              'essaouira-cite-du-vent': 'https://images.pexels.com/photos/2404046/pexels-photo-2404046.jpeg?auto=compress&cs=tinysrgb&w=800',
            };
            const heroUrl = d.heroImageUrl || destinationPhotos[d.slug] || 'https://images.pexels.com/photos/3889855/pexels-photo-3889855.jpeg?auto=compress&cs=tinysrgb&w=800';

            return (
              <div
                key={d.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs group"
              >
                {/* Hero Editorial Photography */}
                <div className="relative h-44 w-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <img
                    src={heroUrl}
                    alt={d.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 drop-shadow-xs">
                        {d.city}, {d.countryName || 'Maroc'}
                      </span>
                      <h3 className="text-base font-black text-white leading-tight drop-shadow-xs m-0">
                        {d.name}
                      </h3>
                    </div>

                    <AdminBadge variant={d.isActive ? 'success' : 'neutral'} size="sm">
                      {d.isActive ? 'Active' : 'Inactive'}
                    </AdminBadge>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {d.description ? (
                    <p className="text-xs line-clamp-2 text-slate-600 dark:text-zinc-400 m-0 leading-relaxed">
                      {d.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 italic m-0">
                      Destination phare du catalogue touristique marocain Yuding V2.
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 admin-mono-tabular text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="font-semibold text-slate-700 dark:text-zinc-300">/{d.slug}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(d.slug)}
                        className="opacity-50 hover:opacity-100 p-0.5 transition-opacity"
                        title="Copier le slug"
                      >
                        <i className={`fas ${copiedSlug === d.slug ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                      </button>
                    </div>

                    <span className="text-[10px] admin-mono-tabular font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      {d.countryCode}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
