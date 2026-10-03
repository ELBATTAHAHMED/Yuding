'use client';

import React, { useState } from 'react';
import { useProviderHealth } from '@/hooks/queries/useAdminQueries';
import { ProviderHealthStatus } from '@/types/admin.types';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';

export default function AdminProvidersPage() {
  const { data: providers = [], isLoading, refetch, isRefetching } = useProviderHealth();
  const [filterType, setFilterType] = useState('ALL');

  const filtered = providers.filter((p) => {
    if (filterType === 'ALL') return true;
    return p.type === filterType;
  });

  const upCount = providers.filter((p) => p.status === 'UP').length;

  const typeOptions = [
    { label: 'Tous les composants', value: 'ALL' },
    { label: 'Microservices Spring Boot', value: 'MICROSERVICE' },
    { label: 'Infrastructure (DB & Cache)', value: 'INFRASTRUCTURE' },
    { label: 'Fournisseurs Voyage (Travel APIs)', value: 'TRAVEL_PROVIDER' },
    { label: 'Passerelles de Paiement', value: 'PAYMENT_GATEWAY' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Santé des Fournisseurs &amp; Architecture
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Surveillance en direct de l&apos;écosystème microservices, base de données, cache et passerelles tierces
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
          style={{
            backgroundColor: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: upCount === providers.length ? '#10B981' : '#F59E0B',
            }}
          />
          <span>{upCount} / {providers.length} Composants UP</span>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm=""
        onSearchChange={() => {}}
        searchPlaceholder=""
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: filterType,
            options: typeOptions,
            onChange: setFilterType,
          },
        ]}
        onRefresh={() => refetch()}
        isRefreshing={isLoading || isRefetching}
        totalCount={providers.length}
        filteredCount={filtered.length}
      />

      {/* Grid of Provider Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="admin-card p-5 h-36 animate-pulse" />
          ))
        ) : (
          filtered.map((p) => {
            const isUp = p.status === 'UP';
            return (
              <div
                key={p.name}
                className="admin-card p-4 flex flex-col justify-between space-y-3 transition-all duration-150 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--admin-surface)',
                  borderColor: 'var(--admin-border)',
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate" style={{ color: 'var(--admin-text-primary)' }}>
                        {p.name}
                      </div>
                      <div className="text-[0.6875rem] mt-0.5 flex items-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                        <AdminBadge variant="neutral" size="sm" dot={false}>
                          {p.type}
                        </AdminBadge>
                        {p.port && (
                          <span className="admin-mono-tabular font-bold">:{p.port}</span>
                        )}
                      </div>
                    </div>

                    <AdminBadge variant={isUp ? 'success' : 'danger'} size="sm">
                      {p.status}
                    </AdminBadge>
                  </div>

                  {p.details && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
                      {p.details}
                    </p>
                  )}
                </div>

                <div
                  className="pt-2 border-t flex items-center justify-between text-[0.6875rem]"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                >
                  <span>Dernier sondage :</span>
                  <span className="admin-mono-tabular">
                    {new Date(p.lastChecked).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
