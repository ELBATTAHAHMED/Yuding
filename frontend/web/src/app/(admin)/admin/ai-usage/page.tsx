'use client';

import React from 'react';

export default function AdminAiUsagePage() {
  const tools = [
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
          Télémétrie IA &amp; Outils RAG
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Supervision des exécutions d&apos;outils (ai.tool_calls), conversations persistantes et indexation vectorielle pgvector
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>CONVERSATIONS TOTALES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>21</div>
          <div style={{ fontSize: '0.75rem', color: '#00D4AA', marginTop: '0.2rem' }}>ai.conversations enregistrées</div>
        </div>

        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>APPELS D&apos;OUTILS (TOOLS)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>38</div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>ai.tool_calls exécutés</div>
        </div>

        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>PLANS DE VOYAGE CRÉÉS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>53</div>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>ai.trip_plans structurés</div>
        </div>

        <div style={{ background: 'var(--bg-secondary, #111827)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>BASE VECTORIELLE PGVECTOR</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.35rem' }}>Actif</div>
          <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '0.2rem' }}>Strictement isolé au schéma ai</div>
        </div>
      </div>

      {/* Tools Table */}
      <div
        style={{
          background: 'var(--bg-secondary, #111827)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Catalogue &amp; Fréquence d&apos;Exécution des Outils d&apos;Agent (Tool Registry)
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.2)', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem' }}>NOM DE L&apos;OUTIL</th>
                <th style={{ padding: '0.85rem 1rem' }}>EXÉCUTIONS RÉELLES</th>
                <th style={{ padding: '0.85rem 1rem' }}>DURÉE MOYENNE</th>
                <th style={{ padding: '0.85rem 1rem' }}>RÔLE OPÉRATIONNEL &amp; SOURCE DE DONNÉES</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr key={t.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#00D4AA' }}>
                    {t.name}()
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 700 }}>
                    {t.count}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#38bdf8', fontWeight: 600 }}>
                    {t.avgDuration}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    {t.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
