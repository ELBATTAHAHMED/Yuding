'use client';

import React, { useState } from 'react';
import { adminService } from '@/services/admin.service';
import { OperationalSettings } from '@/types/admin.types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<OperationalSettings>(() => adminService.getOperationalSettings());
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleToggle = (key: keyof OperationalSettings) => {
    if (typeof settings[key] === 'boolean') {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      adminService.saveOperationalSettings(updated);
      setFeedback('Paramètres enregistrés.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
          Paramètres Opérationnels &amp; Feature Flags
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
          Contrôles environnementaux, bascule de bac à sable (sandbox) et politiques d&apos;exploitation
        </p>
      </div>

      {feedback && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(0, 212, 170, 0.15)', border: '1px solid #00D4AA', color: '#00D4AA', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }} />
          {feedback}
        </div>
      )}

      {/* Settings Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Sandbox Mode */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Mode Bac à Sable (Sandbox Environment)
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Autorise les tests de paiement PayPal sandbox et les requêtes fictives pour la validation QA.
            </p>
          </div>
          <button
            onClick={() => handleToggle('sandboxMode')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: settings.sandboxMode ? '#00D4AA' : 'rgba(255, 255, 255, 0.1)',
              color: settings.sandboxMode ? '#0B0F19' : '#94a3b8',
            }}
          >
            {settings.sandboxMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
          </button>
        </div>

        {/* Mock Payment Provider */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Passerelle Mock Paiement
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Permet aux testeurs d&apos;exécuter le tunnel de réservation avec une carte de test fictive (DEMO_CARD).
            </p>
          </div>
          <button
            onClick={() => handleToggle('mockPaymentAllowed')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: settings.mockPaymentAllowed ? '#00D4AA' : 'rgba(255, 255, 255, 0.1)',
              color: settings.mockPaymentAllowed ? '#0B0F19' : '#94a3b8',
            }}
          >
            {settings.mockPaymentAllowed ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
          </button>
        </div>

        {/* Auto Review Moderation */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Modération Préalable Systématique des Avis
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Place tous les avis déposés en file d&apos;attente manuelle, même sans détection de lien URL.
            </p>
          </div>
          <button
            onClick={() => handleToggle('autoReviewModeration')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: settings.autoReviewModeration ? '#00D4AA' : 'rgba(255, 255, 255, 0.1)',
              color: settings.autoReviewModeration ? '#0B0F19' : '#94a3b8',
            }}
          >
            {settings.autoReviewModeration ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
          </button>
        </div>

        {/* Redis Cache */}
        <div
          style={{
            background: 'var(--bg-secondary, #111827)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Cache Redis &amp; Mémorisation Distribuée
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Mise en cache des recherches de vol et d&apos;hôtel pour réduire les coûts API partenaires.
            </p>
          </div>
          <button
            onClick={() => handleToggle('redisCacheEnabled')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '20px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: settings.redisCacheEnabled ? '#00D4AA' : 'rgba(255, 255, 255, 0.1)',
              color: settings.redisCacheEnabled ? '#0B0F19' : '#94a3b8',
            }}
          >
            {settings.redisCacheEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
          </button>
        </div>
      </div>
    </div>
  );
}
