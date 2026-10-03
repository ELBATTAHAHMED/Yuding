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
      setFeedback('Paramètres enregistrés avec succès.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleRateLimitChange = (val: number) => {
    const updated = { ...settings, rateLimitPerMinute: val };
    setSettings(updated);
    adminService.saveOperationalSettings(updated);
    setFeedback('Quota de débit mis à jour.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const toggleItems: Array<{
    key: keyof OperationalSettings;
    title: string;
    description: string;
    icon: string;
    warning?: boolean;
  }> = [
    {
      key: 'sandboxMode',
      title: 'Mode Bac à Sable (Sandbox)',
      description: 'Autorise les flux de test PayPal Sandbox et les requêtes QA sans impact financier réel.',
      icon: 'fas fa-vial',
    },
    {
      key: 'mockPaymentAllowed',
      title: 'Paiement Mock Développeur',
      description: 'Active le processeur local Mock Payment Provider pour les tests fonctionnels et tests d\'intégration.',
      icon: 'fas fa-code',
    },
    {
      key: 'autoReviewModeration',
      title: 'Modération Automatique des Avis',
      description: 'Publie automatiquement les avis sans lien externe suspect ni terme prohibé.',
      icon: 'fas fa-shield-virus',
    },
    {
      key: 'redisCacheEnabled',
      title: 'Cache Distribué Redis',
      description: 'Mise en cache des offres de voyage et des sessions de recherche pour réduire la charge sur les APIs partenaires.',
      icon: 'fas fa-bolt',
    },
    {
      key: 'maintenanceMode',
      title: 'Mode Maintenance de la Plateforme',
      description: 'Limite l\'accès utilisateur au portail public tout en conservant l\'accès aux équipes opérationnelles.',
      icon: 'fas fa-tools',
      warning: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Paramètres Opérationnels &amp; Feature Flags
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Contrôles environnementaux, bac à sable (sandbox) et politiques d&apos;exploitation en direct
        </p>
      </div>

      {feedback && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            borderColor: 'var(--admin-accent-border)',
            color: 'var(--admin-accent)',
          }}
        >
          <i className="fas fa-check-circle" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Feature Flags Cards */}
      <div className="space-y-3">
        {toggleItems.map((item) => {
          const isChecked = Boolean(settings[item.key]);
          return (
            <div
              key={item.key}
              className="admin-card p-4 flex items-center justify-between gap-4 transition-colors"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isChecked ? 'var(--admin-accent-subtle)' : 'var(--admin-surface-muted)',
                    color: isChecked ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  }}
                >
                  <i className={`${item.icon} text-xs`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold truncate m-0" style={{ color: 'var(--admin-text-primary)' }}>
                      {item.title}
                    </h3>
                    {item.warning && (
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                        Impact élevé
                      </span>
                    )}
                  </div>
                  <p className="text-[0.6875rem] leading-relaxed mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                style={{
                  backgroundColor: isChecked ? 'var(--admin-accent)' : 'var(--admin-border-strong)',
                }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isChecked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Gateway Rate Limit Setting */}
      <div
        className="admin-card p-5 space-y-3"
        style={{
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <i className="fas fa-tachometer-alt text-xs" style={{ color: 'var(--admin-accent)' }} />
          <h3 className="text-xs font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
            Quota de Requêtes Gateway (Redis Rate Limit)
          </h3>
        </div>
        <p className="text-[0.6875rem]" style={{ color: 'var(--admin-text-muted)' }}>
          Nombre maximal de requêtes autorisées par adresse IP par minute avant déclenchement d&apos;une réponse HTTP 429 Too Many Requests.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="number"
            min={10}
            max={500}
            step={10}
            value={settings.rateLimitPerMinute}
            onChange={(e) => handleRateLimitChange(Number(e.target.value))}
            className="w-32 px-3 py-1.5 rounded-md text-xs font-mono font-bold outline-none"
            style={{
              backgroundColor: 'var(--admin-surface-muted)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-primary)',
            }}
          />
          <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
            requêtes / minute par client
          </span>
        </div>
      </div>
    </div>
  );
}
