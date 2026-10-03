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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Destinations Phares &amp; Éditoriales
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Catalogue des régions et villes marocaines enregistrées dans le schéma travel.destinations
        </p>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher une destination par nom, ville, slug..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={destinations.length}
        filteredCount={filtered.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Destinations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-card p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="admin-card p-4 flex flex-col justify-between space-y-3 transition-all duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate m-0" style={{ color: 'var(--admin-text-primary)' }}>
                      {d.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--admin-text-secondary)' }}>
                      <i className="fas fa-map-marker-alt text-[0.65rem]" style={{ color: 'var(--admin-accent)' }} />
                      <span>{d.city}, {d.countryName || 'Maroc'}</span>
                    </div>
                  </div>

                  <AdminBadge variant={d.isActive ? 'success' : 'neutral'} size="sm">
                    {d.isActive ? 'Active' : 'Inactive'}
                  </AdminBadge>
                </div>

                {d.description && (
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--admin-text-muted)' }}>
                    {d.description}
                  </p>
                )}
              </div>

              <div
                className="pt-3 border-t flex items-center justify-between text-xs"
                style={{ borderColor: 'var(--admin-border)' }}
              >
                <div className="flex items-center gap-1.5 admin-mono-tabular text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
                  <span>/{d.slug}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(d.slug)}
                    className="opacity-50 hover:opacity-100 p-0.5"
                    title="Copier le slug"
                  >
                    <i className={`fas ${copiedSlug === d.slug ? 'fa-check text-emerald-500' : 'fa-copy'}`} />
                  </button>
                </div>

                <span className="text-[0.65rem] admin-mono-tabular font-bold" style={{ color: 'var(--admin-text-muted)' }}>
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
