'use client';

import React, { useState } from 'react';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminStatCard } from '@/components/admin/AdminStatCard';

interface RouteSpec {
  method: string;
  path: string;
  service: string;
  rateLimit: string;
  authRequired: string;
  status: string;
}

export default function AdminApiUsagePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const routes: RouteSpec[] = [
    { method: 'POST', path: '/auth/login', service: 'IDENTITY-SERVICE', rateLimit: '50 req/min', authRequired: 'Public', status: '200 OK' },
    { method: 'POST', path: '/auth/refresh', service: 'IDENTITY-SERVICE', rateLimit: '50 req/min', authRequired: 'HttpOnly Cookie', status: '200 OK' },
    { method: 'GET', path: '/admin/users', service: 'IDENTITY-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/stats', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/bookings', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/payments', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apir/admin/refunds', service: 'RESERVATION-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'GET', path: '/apic/reviews/moderation', service: 'COMMENTAIRE-SERVICE', rateLimit: '50 req/min', authRequired: 'ROLE_ADMIN / SUPPORT', status: '200 OK' },
    { method: 'POST', path: '/api/ai/conversations', service: 'AI-SERVICE', rateLimit: '20 req/min', authRequired: 'JWT Bearer', status: '200 OK' },
    { method: 'GET', path: '/travel/flights/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Public', status: '200 OK' },
    { method: 'GET', path: '/travel/hotels/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Public', status: '200 OK' },
    { method: 'GET', path: '/travel/activities/search', service: 'TRAVEL-SERVICE', rateLimit: '50 req/min', authRequired: 'Public', status: '200 OK' },
  ];

  const filtered = routes.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.path.toLowerCase().includes(term) ||
      r.service.toLowerCase().includes(term) ||
      r.method.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      key: 'method',
      header: 'MÉTHODE',
      render: (r: RouteSpec) => (
        <span
          className={`text-[0.6875rem] font-black px-2 py-0.5 rounded ${
            r.method === 'POST' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
          }`}
        >
          {r.method}
        </span>
      ),
    },
    {
      key: 'path',
      header: 'ROUTE GATEWAY',
      render: (r: RouteSpec) => (
        <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
          {r.path}
        </span>
      ),
    },
    {
      key: 'service',
      header: 'SERVICE CIBLE',
      render: (r: RouteSpec) => (
        <span
          className="text-xs px-2 py-0.5 rounded font-mono font-medium"
          style={{
            backgroundColor: 'var(--admin-surface-muted)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          {r.service}
        </span>
      ),
    },
    {
      key: 'rateLimit',
      header: 'QUOTA REDIS',
      render: (r: RouteSpec) => (
        <span className="admin-mono-tabular text-xs" style={{ color: 'var(--admin-accent)' }}>
          {r.rateLimit}
        </span>
      ),
    },
    {
      key: 'authRequired',
      header: 'AUTHENTIFICATION',
      render: (r: RouteSpec) => (
        <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
          {r.authRequired}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUT',
      render: (r: RouteSpec) => (
        <AdminBadge variant="success" size="sm">
          {r.status}
        </AdminBadge>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Consommation &amp; Routage API Gateway
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Topologie du Spring Cloud Gateway (port 8888), politique de limitation de débit Redis et quotas
        </p>
      </div>

      {/* KPI ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard
          label="Port d'Écoute Gateway"
          value=":8888"
          subtext="Point d'entrée unique backend"
          icon="fas fa-network-wired"
          variant="accent"
        />
        <AdminStatCard
          label="Moteur de Quotas"
          value="Redis 7.4.11"
          subtext="Token bucket par IP / Utilisateur"
          icon="fas fa-tachometer-alt"
          variant="info"
        />
        <AdminStatCard
          label="Sécurité Défense en Profondeur"
          value="RS256 JWT"
          subtext="En-têtes X-User-* filtrés"
          icon="fas fa-shield-alt"
          variant="accent"
        />
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filtrer les routes par chemin, méthode ou microservice..."
        totalCount={routes.length}
        filteredCount={filtered.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Main Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => `${r.method}-${r.path}`}
        emptyMessage="Aucune route correspondante"
      />
    </div>
  );
}
