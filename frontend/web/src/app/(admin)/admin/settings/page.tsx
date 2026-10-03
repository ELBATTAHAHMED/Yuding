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
      setFeedback('Paramètre d\'exploitation enregistré avec succès.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleRateLimitChange = (val: number) => {
    const updated = { ...settings, rateLimitPerMinute: val };
    setSettings(updated);
    adminService.saveOperationalSettings(updated);
    setFeedback('Quota de débit local enregistré.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const serverPolicies = [
    {
      title: 'Authentification RS256 & Signature JWT Asymétrique',
      description: 'Garantie cryptographique stricte : l’identity-service signe les jetons avec une clé privée RSA 2048-bits, validée downstream via la clé publique.',
      status: 'Actif & Immuable',
      icon: 'fas fa-key',
    },
    {
      title: 'Isolation Stricte des Schémas Logiques PostgreSQL (yuding)',
      description: 'Zéro jointure inter-schémas en base de données. Chaque microservice accède exclusivement à son domaine : identity, travel, booking, payment, notification, commentaire, ai, audit.',
      status: 'En vigueur (8 Schémas)',
      icon: 'fas fa-database',
    },
    {
      title: 'Évacuation des En-têtes Identité Non Fiables (Gateway Defense)',
      description: 'Le Gateway (:8888) filtre et purge tout en-tête client X-User-* ou X-Roles-* pour neutraliser les tentatives de contournement IDOR avant routage.',
      status: 'Actif en Production',
      icon: 'fas fa-shield-alt',
    },
    {
      title: 'Moteur de Tarification Serveur & Devis Immuables',
      description: 'Interdiction absolue de faire confiance aux montants transmis par le client navigateur. Le BookingPricingService recalcule les totaux selon les règles du fournisseur.',
      status: 'Autoritaire',
      icon: 'fas fa-calculator',
    },
  ];

  const toggles: Array<{
    key: keyof OperationalSettings;
    title: string;
    description: string;
    icon: string;
  }> = [
    {
      key: 'sandboxMode',
      title: 'Environnement de Test Bac à Sable (Sandbox)',
      description: 'Aiguille les flux de paiement et de réservation vers les émulateurs et bacs à sable partenaires sans impact financier réel.',
      icon: 'fas fa-vial',
    },
    {
      key: 'mockPaymentAllowed',
      title: 'Processeur Mock Payment Local',
      description: 'Autorise les transactions de test instantanées via le MockPaymentProvider pour les phases de validation technique.',
      icon: 'fas fa-code',
    },
    {
      key: 'autoReviewModeration',
      title: 'Auto-Modération Préventive des Avis',
      description: 'Filtre automatiquement les liens externes et les expressions suspectes avant soumission à la modération humaine.',
      icon: 'fas fa-shield-virus',
    },
    {
      key: 'redisCacheEnabled',
      title: 'Cache de Recherche Distribué (Redis)',
      description: 'Active la mise en cache des résultats de recherche d\'hôtels et vols pour optimiser les temps de réponse.',
      icon: 'fas fa-bolt',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Politiques &amp; Paramètres Opérationnels
        </h1>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Gouvernance architecturale, paramètres d&apos;exploitation et règles système en vigueur sur Yuding V2
        </p>
      </div>

      {feedback && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in"
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

      {/* Authoritative Architectural Policies Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-landmark text-xs" style={{ color: 'var(--admin-accent)' }} />
          <h2 className="text-sm font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
            Politiques Architecturales Immuables (Backend Authoritative)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serverPolicies.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border flex flex-col justify-between space-y-2"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs" style={{ color: 'var(--admin-text-primary)' }}>
                    <i className={`${p.icon} text-xs`} style={{ color: 'var(--admin-accent)' }} />
                    <span>{p.title}</span>
                  </div>
                </div>
                <p className="text-[0.6875rem] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                  {p.description}
                </p>
              </div>
              <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--admin-border)' }}>
                <span className="text-[0.625rem] uppercase font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {p.status}
                </span>
                <span className="text-[0.625rem] admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
                  AGENTS.md
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client-side Feature Toggles */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-toggle-on text-xs" style={{ color: '#38BDF8' }} />
          <h2 className="text-sm font-bold m-0" style={{ color: 'var(--admin-text-primary)' }}>
            Paramètres d&apos;Exploitation et Drapeaux d&apos;Expérimentation (Feature Flags)
          </h2>
        </div>
        <div className="space-y-2.5">
          {toggles.map((item) => {
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
                    <h3 className="text-xs font-bold truncate m-0" style={{ color: 'var(--admin-text-primary)' }}>
                      {item.title}
                    </h3>
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
          Seuil standard de requêtes par minute configuré au niveau de la passerelle Spring Cloud Gateway avec Redis KeyResolver.
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
            requêtes / minute par adresse IP cliente
          </span>
        </div>
      </div>
    </div>
  );
}
