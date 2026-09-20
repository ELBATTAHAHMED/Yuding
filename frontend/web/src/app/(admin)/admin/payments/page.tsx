'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            Transactions & Paiements
          </h1>
          <p style={{ color: '#b0bec5', fontSize: '0.95rem' }}>
            Supervisez les transactions financières, remboursements et l&apos;historique de facturation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {}}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'rgba(0, 212, 170, 0.1)',
              border: '1px solid #00D4AA',
              color: '#00D4AA',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <i className="fas fa-sync" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Rechercher par ID transaction, référence ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              background: 'var(--bg-secondary, #1A1F2E)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#90a4ae',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            background: 'var(--bg-secondary, #1A1F2E)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">Tous les statuts</option>
          <option value="SUCCEEDED">Payé / Validé</option>
          <option value="PENDING">En cours</option>
          <option value="REFUNDED">Remboursé</option>
          <option value="FAILED">Échoué</option>
        </select>
      </div>

      {/* Payments Table / Empty State Card */}
      <div
        style={{
          background: 'var(--bg-secondary, #1A1F2E)',
          borderRadius: '12px',
          padding: '3rem 2rem',
          border: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(0, 212, 170, 0.1)',
            color: '#00D4AA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 1.25rem',
          }}
        >
          <i className="fas fa-credit-card" />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Aucune transaction enregistrée
        </h2>

        <p style={{ color: '#90a4ae', maxWidth: '460px', margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
          Les paiements traités, autorisations et remboursements exécutés via les passerelles de paiement sécurisées apparaîtront ici.
        </p>

        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.06)',
            color: '#00D4AA',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <i className="fas fa-arrow-left" />
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
