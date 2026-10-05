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
      description: 'Garantie cryptographique stricte : identity-service signe les jetons avec une clé privée RSA 2048-bits, validée downstream via la clé publique.',
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
      title: 'Environnement Bac à Sable (Sandbox)',
      description: 'Aiguille les flux de paiement et de réservation vers les émulateurs partenaires sans impact financier réel.',
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
          Politiques &amp; Paramètres Opérationnels
        </h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Gouvernance architecturale, paramètres d&apos;exploitation et règles système en vigueur sur Yuding V2
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 animate-fade-in">
          <i className="fas fa-check-circle" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Authoritative Architectural Policies Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-landmark text-xs text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 m-0">
            Politiques Architecturales Immuables (Backend Authoritative)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serverPolicies.map((p, idx) => (
            <div
              key={idx}
              className="admin-concentric-card bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-2 shadow-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-zinc-100">
                    <i className={`${p.icon} text-xs text-emerald-600 dark:text-emerald-400`} />
                    <span>{p.title}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400 m-0">
                  {p.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/ flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  {p.status}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Architecture V2</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Toggles */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <i className="fas fa-sliders-h text-xs text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 m-0">
            Commutateurs d&apos;Exploitation en Temps Réel
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          {toggles.map((t) => {
            const isChecked = Boolean(settings[t.key]);
            return (
              <div key={t.key} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-zinc-300">
                    <i className={`${t.icon} text-xs`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 m-0">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 m-0 mt-0.5 max-w-xl leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(t.key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quota Setting */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 m-0">
            Plafond de Débit Global (Rate Limit)
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 m-0 mt-0.5">
            Nombre maximal de requêtes autorisées par minute et par IP via l&apos;API Gateway
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={10}
            max={500}
            step={10}
            value={settings.rateLimitPerMinute}
            onChange={(e) => handleRateLimitChange(Number(e.target.value))}
            className="w-24 text-xs font-bold admin-mono-tabular p-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-right"
          />
          <span className="text-xs font-semibold text-slate-500">req/min</span>
        </div>
      </div>
    </div>
  );
}
