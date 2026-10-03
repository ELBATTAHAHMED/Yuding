'use client';

import React, { useState } from 'react';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';

interface ToolTelemetry {
  name: string;
  count: number;
  avgDuration: string;
  role: string;
}

export default function AdminAiUsagePage() {
  const [searchTerm, setSearchTerm] = useState('');

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

  const filtered = tools.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.role.toLowerCase().includes(term);
  });

  const columns = [
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
        <span className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          {t.role}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Télémétrie IA &amp; Outils RAG
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Supervision des exécutions d&apos;outils (ai.tool_calls), conversations persistantes et indexation vectorielle pgvector
        </p>
      </div>

      {/* KPI Ribbon */}
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
          icon="fas fa-toolbox"
          variant="info"
        />
        <AdminStatCard
          label="Plans de Voyage Générés"
          value="53"
          subtext="ai.trip_plans créés"
          icon="fas fa-route"
          variant="warning"
        />
        <AdminStatCard
          label="Base Vectorielle"
          value="Actif"
          subtext="pgvector isolé au schéma ai"
          icon="fas fa-database"
          variant="accent"
        />
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filtrer les outils IA par nom ou rôle..."
        totalCount={tools.length}
        filteredCount={filtered.length}
        onResetFilters={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
      />

      {/* Tools Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        keyExtractor={(t) => t.name}
        emptyMessage="Aucun outil IA correspondant"
      />
    </div>
  );
}
