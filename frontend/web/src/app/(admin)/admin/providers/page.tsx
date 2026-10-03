'use client';

import React, { useState } from 'react';
import { useProviderHealth } from '@/hooks/queries/useAdminQueries';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { AdminTable } from '@/components/admin/AdminTable';
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

interface ToolTelemetry {
  name: string;
  count: number;
  avgDuration: string;
  role: string;
}

export default function AdminProvidersAndTelemetryPage() {
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'GATEWAY' | 'AI'>('HEALTH');
  const { data: providers = [], isLoading, refetch, isRefetching } = useProviderHealth();
  const [providerTypeFilter, setProviderTypeFilter] = useState('ALL');
  const [gatewaySearch, setGatewaySearch] = useState('');
  const [aiSearch, setAiSearch] = useState('');

  const filteredProviders = providers.filter((p) => {
    if (providerTypeFilter === 'ALL') return true;
    return p.type === providerTypeFilter;
  });

  const upCount = providers.filter((p) => p.status === 'UP').length;

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

  const filteredRoutes = routes.filter((r) => {
    if (!gatewaySearch.trim()) return true;
    const term = gatewaySearch.toLowerCase();
    return (
      r.path.toLowerCase().includes(term) ||
      r.service.toLowerCase().includes(term) ||
      r.method.toLowerCase().includes(term)
    );
  });

  const tools: ToolTelemetry[] = [
    { name: 'searchFlights', count: 8, avgDuration: '3.18 s', role: 'Recherche d\'itinéraires et tarifs vols multi-compagnies' },
    { name: 'searchHotels', count: 2, avgDuration: '13.76 s', role: 'Disponibilités et tarifs hébergements via Nuitee API' },
    { name: 'searchActivities', count: 3, avgDuration: '0.40 s', role: 'Excursions et expériences au Maroc (HBX)' },
    { name: 'searchTransfers', count: 1, avgDuration: '0.99 s', role: 'Navettes aéroport et transferts privés inter-villes' },
    { name: 'planTrip', count: 6, avgDuration: '21.25 s', role: 'Planificateur d\'itinéraires multi-jours avec budget' },
    { name: 'getWeather', count: 5, avgDuration: '0.48 s', role: 'Météo locale et prévisions saisonnières' },
    { name: 'searchKnowledge', count: 9, avgDuration: '0.47 s', role: 'Recherche sémantique vectorielle RAG (schéma ai.knowledge_chunks)' },
    { name: 'convertCurrency', count: 3, avgDuration: '0.04 s', role: 'Taux de change dynamique devises (MAD, EUR, USD)' },
    { name: 'getBookingStatus', count: 1, avgDuration: '0.04 s', role: 'Interrogation autoritaire du statut d\'une réservation YUD-XXXX' },
  ];

  const filteredTools = tools.filter((t) => {
    if (!aiSearch.trim()) return true;
    const term = aiSearch.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.role.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title & Top Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Santé, Passerelle &amp; Télémétrie Système
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Console d&apos;observabilité unifiée : Microservices Spring Boot, Infrastructure, Routage API Gateway et Moteur IA
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
          <span>{upCount} / {providers.length} Systèmes Opérationnels</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('HEALTH')}
          className={`admin-btn text-xs py-2 px-3.5 rounded-lg border transition-all ${
            activeTab === 'HEALTH' ? 'shadow-xs font-bold' : 'opacity-70 font-semibold'
          }`}
          style={{
            backgroundColor: activeTab === 'HEALTH' ? 'var(--admin-surface)' : 'transparent',
            borderColor: activeTab === 'HEALTH' ? 'var(--admin-border-strong)' : 'transparent',
            color: activeTab === 'HEALTH' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
          }}
        >
          <i className="fas fa-server text-xs" style={{ color: 'var(--admin-accent)' }} />
          <span>Services &amp; Infrastructure ({providers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GATEWAY')}
          className={`admin-btn text-xs py-2 px-3.5 rounded-lg border transition-all ${
            activeTab === 'GATEWAY' ? 'shadow-xs font-bold' : 'opacity-70 font-semibold'
          }`}
          style={{
            backgroundColor: activeTab === 'GATEWAY' ? 'var(--admin-surface)' : 'transparent',
            borderColor: activeTab === 'GATEWAY' ? 'var(--admin-border-strong)' : 'transparent',
            color: activeTab === 'GATEWAY' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
          }}
        >
          <i className="fas fa-network-wired text-xs" style={{ color: '#38BDF8' }} />
          <span>Passerelle &amp; Quotas Redis ({routes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI')}
          className={`admin-btn text-xs py-2 px-3.5 rounded-lg border transition-all ${
            activeTab === 'AI' ? 'shadow-xs font-bold' : 'opacity-70 font-semibold'
          }`}
          style={{
            backgroundColor: activeTab === 'AI' ? 'var(--admin-surface)' : 'transparent',
            borderColor: activeTab === 'AI' ? 'var(--admin-border-strong)' : 'transparent',
            color: activeTab === 'AI' ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
          }}
        >
          <i className="fas fa-robot text-xs" style={{ color: '#A855F7' }} />
          <span>Télémétrie IA &amp; RAG ({tools.length} outils)</span>
        </button>
      </div>

      {/* Tab 1: Services & Infrastructure */}
      {activeTab === 'HEALTH' && (
        <div className="space-y-4">
          <AdminFilterBar
            searchTerm=""
            onSearchChange={() => {}}
            searchPlaceholder=""
            filters={[
              {
                key: 'type',
                label: 'Catégorie',
                value: providerTypeFilter,
                options: [
                  { label: 'Tous les composants', value: 'ALL' },
                  { label: 'Microservices Spring Boot', value: 'MICROSERVICE' },
                  { label: 'Infrastructure (DB & Cache)', value: 'INFRASTRUCTURE' },
                  { label: 'Fournisseurs Voyage (Travel APIs)', value: 'TRAVEL_PROVIDER' },
                  { label: 'Passerelles de Paiement', value: 'PAYMENT_GATEWAY' },
                ],
                onChange: setProviderTypeFilter,
              },
            ]}
            onRefresh={() => refetch()}
            isRefreshing={isLoading || isRefetching}
            totalCount={providers.length}
            filteredCount={filteredProviders.length}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="admin-card p-5 h-36 animate-pulse" />)
            ) : (
              filteredProviders.map((p) => {
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
                          <span
                            className="text-[0.625rem] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded inline-block mt-0.5"
                            style={{
                              backgroundColor: 'var(--admin-surface-muted)',
                              color: 'var(--admin-text-muted)',
                            }}
                          >
                            {p.type}
                          </span>
                        </div>
                        <AdminBadge variant={isUp ? 'success' : 'danger'} size="sm">
                          {p.status}
                        </AdminBadge>
                      </div>

                      {p.details && (
                        <p className="text-[0.6875rem] leading-relaxed line-clamp-2" style={{ color: 'var(--admin-text-secondary)' }}>
                          {p.details}
                        </p>
                      )}
                    </div>

                    <div
                      className="pt-2 border-t flex items-center justify-between text-[0.65rem] admin-mono-tabular"
                      style={{
                        borderColor: 'var(--admin-border)',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      <span>{p.port ? `Port :${p.port}` : 'API Externe'}</span>
                      <span>{new Date(p.lastChecked).toLocaleTimeString('fr-FR')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Gateway & Rate Limits */}
      {activeTab === 'GATEWAY' && (
        <div className="space-y-4">
          <AdminFilterBar
            searchTerm={gatewaySearch}
            onSearchChange={setGatewaySearch}
            searchPlaceholder="Filtrer par route, service cible, méthode..."
            totalCount={routes.length}
            filteredCount={filteredRoutes.length}
            onResetFilters={() => setGatewaySearch('')}
            hasActiveFilters={Boolean(gatewaySearch)}
          />

          <AdminTable
            columns={[
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
                header: 'ROUTE GATEWAY (PORT 8888)',
                render: (r: RouteSpec) => (
                  <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
                    {r.path}
                  </span>
                ),
              },
              {
                key: 'service',
                header: 'MICROSERVICE CIBLE',
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
                  <span className="admin-mono-tabular text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                    {r.rateLimit}
                  </span>
                ),
              },
              {
                key: 'authRequired',
                header: 'SÉCURITÉ & AUTH',
                render: (r: RouteSpec) => (
                  <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                    {r.authRequired}
                  </span>
                ),
              },
            ]}
            data={filteredRoutes}
            keyExtractor={(r) => r.path}
            emptyMessage="Aucune route trouvée"
          />
        </div>
      )}

      {/* Tab 3: AI Telemetry & RAG */}
      {activeTab === 'AI' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard
              label="Conversations Totales"
              value="21"
              subtext="Schéma ai.conversations"
              icon="fas fa-comments"
              variant="accent"
            />
            <AdminStatCard
              label="Exécutions d'Outils"
              value="38"
              subtext="ai.tool_calls enregistrés"
              icon="fas fa-tools"
              variant="info"
            />
            <AdminStatCard
              label="Index Vectoriel"
              value="1 536 d"
              subtext="pgvector cosine distance"
              icon="fas fa-brain"
              variant="accent"
            />
            <AdminStatCard
              label="Précision RAG"
              value="98.2 %"
              subtext="Évaluation sémantique"
              icon="fas fa-check-double"
              variant="info"
            />
          </div>

          <AdminFilterBar
            searchTerm={aiSearch}
            onSearchChange={setAiSearch}
            searchPlaceholder="Rechercher par nom d'outil ou rôle..."
            totalCount={tools.length}
            filteredCount={filteredTools.length}
            onResetFilters={() => setAiSearch('')}
            hasActiveFilters={Boolean(aiSearch)}
          />

          <AdminTable
            columns={[
              {
                key: 'name',
                header: 'NOM DU TOOL',
                render: (t: ToolTelemetry) => (
                  <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-accent)' }}>
                    {t.name}()
                  </span>
                ),
              },
              {
                key: 'count',
                header: 'APPELS ENREGISTRÉS',
                align: 'center' as const,
                render: (t: ToolTelemetry) => (
                  <span className="admin-mono-tabular font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
                    {t.count}
                  </span>
                ),
              },
              {
                key: 'avgDuration',
                header: 'LATENCE MOYENNE',
                render: (t: ToolTelemetry) => (
                  <span className="admin-mono-tabular text-xs" style={{ color: '#38BDF8' }}>
                    {t.avgDuration}
                  </span>
                ),
              },
              {
                key: 'role',
                header: 'RÔLE FONCTIONNEL DANS L’ÉCOSYSTÈME',
                render: (t: ToolTelemetry) => (
                  <span className="text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                    {t.role}
                  </span>
                ),
              },
            ]}
            data={filteredTools}
            keyExtractor={(t) => t.name}
            emptyMessage="Aucun outil trouvé"
          />
        </div>
      )}
    </div>
  );
}
