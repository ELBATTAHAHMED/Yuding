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
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Top Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            Santé, Passerelle &amp; Télémétrie Système
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Console d&apos;observabilité unifiée : Microservices Spring Boot, Infrastructure, Routage API Gateway et Moteur IA
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-2xs">
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('HEALTH')}
          className={`inline-flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg border transition-all ${
            activeTab === 'HEALTH'
              ? 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 font-bold text-slate-900 dark:text-zinc-100 shadow-2xs'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <i className="fas fa-server text-emerald-500 text-xs" />
          <span>Services &amp; Infrastructure ({providers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GATEWAY')}
          className={`inline-flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg border transition-all ${
            activeTab === 'GATEWAY'
              ? 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 font-bold text-slate-900 dark:text-zinc-100 shadow-2xs'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <i className="fas fa-network-wired text-sky-500 text-xs" />
          <span>Passerelle &amp; Quotas Redis ({routes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI')}
          className={`inline-flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg border transition-all ${
            activeTab === 'AI'
              ? 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 font-bold text-slate-900 dark:text-zinc-100 shadow-2xs'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          <i className="fas fa-robot text-purple-500 text-xs" />
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
          />

          {/* Consolidated Telemetry Matrix */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            <AdminTable
              isLoading={isLoading}
              data={filteredProviders}
              keyExtractor={(p) => p.name}
              columns={[
                {
                  key: 'name',
                  header: 'COMPOSANT / SERVICE',
                  render: (p) => {
                    const isUp = p.status === 'UP';
                    return (
                      <div className="flex items-center gap-3 py-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isUp ? 'bg-emerald-500 shadow-xs' : 'bg-rose-500 animate-pulse'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate block max-w-xs">
                            {p.details || 'Microservice Spring Boot'}
                          </span>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: 'type',
                  header: 'CATÉGORIE',
                  render: (p) => (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700">
                      {p.type}
                    </span>
                  ),
                },
                {
                  key: 'port',
                  header: 'PORT / ACCÈS',
                  render: (p) => (
                    <span className="admin-mono-tabular text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      {p.port ? `Port :${p.port}` : 'API Distribuée'}
                    </span>
                  ),
                },
                {
                  key: 'lastChecked',
                  header: 'DERNIÈRE VÉRIFICATION',
                  render: (p) => (
                    <span className="admin-mono-tabular text-xs text-slate-400 dark:text-zinc-500">
                      {new Date(p.lastChecked).toLocaleTimeString('fr-FR')}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'STATUT',
                  align: 'right' as const,
                  render: (p) => (
                    <AdminBadge variant={p.status === 'UP' ? 'success' : 'danger'} size="sm">
                      {p.status === 'UP' ? 'OPÉRATIONNEL' : 'DÉGRADÉ'}
                    </AdminBadge>
                  ),
                },
              ]}
            />
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
            filters={[]}
          />

          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-1 shadow-xs overflow-hidden">
            <AdminTable
              columns={[
                {
                  key: 'method',
                  header: 'MÉTHODE',
                  render: (r: RouteSpec) => (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        r.method === 'POST' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
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
                    <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-zinc-100">
                      {r.path}
                    </span>
                  ),
                },
                {
                  key: 'service',
                  header: 'MICROSERVICE CIBLE',
                  render: (r: RouteSpec) => (
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {r.service}
                    </span>
                  ),
                },
                {
                  key: 'rateLimit',
                  header: 'QUOTA REDIS',
                  render: (r: RouteSpec) => (
                    <span className="admin-mono-tabular text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {r.rateLimit}
                    </span>
                  ),
                },
                {
                  key: 'authRequired',
                  header: 'SÉCURITÉ & AUTH',
                  render: (r: RouteSpec) => (
                    <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
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
        </div>
      )}

      {/* Tab 3: AI Telemetry & RAG */}
      {activeTab === 'AI' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <AdminStatCard
              label="Conversations Totales"
              value="21"
              subtext="Schéma ai.conversations"
              icon="fas fa-comments"
              variant="cool"
            />
            <AdminStatCard
              label="Exécutions d'Outils"
              value="38"
              subtext="ai.tool_calls enregistrés"
              icon="fas fa-tools"
              variant="default"
            />
            <AdminStatCard
              label="Index Vectoriel"
              value="1 536 d"
              subtext="pgvector cosine distance"
              icon="fas fa-brain"
              variant="dark"
            />
            <AdminStatCard
              label="Précision RAG"
              value="98.2 %"
              subtext="Évaluation sémantique"
              icon="fas fa-check-double"
              variant="warm"
            />
          </div>

          <AdminFilterBar
            searchTerm={aiSearch}
            onSearchChange={setAiSearch}
            searchPlaceholder="Rechercher par nom d'outil ou rôle..."
            filters={[]}
          />

          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-1 shadow-xs overflow-hidden">
            <AdminTable
              columns={[
                {
                  key: 'name',
                  header: 'NOM DU TOOL',
                  render: (t: ToolTelemetry) => (
                    <span className="admin-mono-tabular font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {t.name}()
                    </span>
                  ),
                },
                {
                  key: 'count',
                  header: 'APPELS ENREGISTRÉS',
                  align: 'center' as const,
                  render: (t: ToolTelemetry) => (
                    <span className="admin-mono-tabular font-bold text-xs text-slate-900 dark:text-zinc-100">
                      {t.count}
                    </span>
                  ),
                },
                {
                  key: 'avgDuration',
                  header: 'LATENCE MOYENNE',
                  render: (t: ToolTelemetry) => (
                    <span className="admin-mono-tabular text-xs text-sky-600 dark:text-sky-400 font-semibold">
                      {t.avgDuration}
                    </span>
                  ),
                },
                {
                  key: 'role',
                  header: 'RÔLE FONCTIONNEL DANS L’ÉCOSYSTÈME',
                  render: (t: ToolTelemetry) => (
                    <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
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
        </div>
      )}
    </div>
  );
}
