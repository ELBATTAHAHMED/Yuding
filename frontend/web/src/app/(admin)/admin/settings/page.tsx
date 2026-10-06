'use client';

import React, { useState } from 'react';
import { adminService } from '@/services/admin.service';
import { OperationalSettings } from '@/types/admin.types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<OperationalSettings>(() => adminService.getOperationalSettings());
  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof OperationalSettings) => {
    if (typeof settings[key] === 'boolean') {
      const updated = { ...settings, [key]: !settings[key] };
      setSettings(updated);
      adminService.saveOperationalSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Paramètres &amp; Politiques Système
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Gouvernance architecturale et commutateurs d&apos;exploitation opérationnels Yuding V2.
          </p>
        </div>

        {saved && (
          <span className="text-xs font-bold text-[#10B981] animate-fade-in">
            ✓ Paramètre enregistré
          </span>
        )}
      </div>

      {/* 2. Architectural Truths (Read Only / Authoritative) */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] m-0">
          Garanties Architecturales Immuables
        </h2>

        <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Authentification RS256 &amp; Signature Asymétrique
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Clé privée RSA 2048-bits dans identity-service. Validation downstream via clé publique.
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399] shrink-0">
              ACTIF
            </span>
          </div>

          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Isolation Stricte des 8 Schémas PostgreSQL
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Zéro requête inter-schémas en base de données. Autorité Flyway exclusive.
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399] shrink-0">
              AUTORITAIRE
            </span>
          </div>

          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Filtrage des En-têtes Identité Non Fiables (Gateway)
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Évacuation systématique de tout en-tête client X-User-* pour neutraliser l&apos;IDOR.
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-[#064E3B]/40 dark:text-[#34D399] shrink-0">
              PROTÉGÉ
            </span>
          </div>
        </div>
      </div>

      {/* 3. Operational Toggles */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] m-0">
          Commutateurs Opérationnels
        </h2>

        <div className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl divide-y divide-[#F1F3F5] dark:divide-[#1A1F28]">
          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Environnement Bac à Sable (Sandbox)
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Aiguillage des règlements et devis vers les simulateurs partenaires sans impact bancaire.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('sandboxMode')}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                settings.sandboxMode ? 'bg-[#00D4AA]' : 'bg-[#CBD5E1] dark:bg-[#334155]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.sandboxMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Processeur Mock Payment Direct
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Autorise les simulations immédiates de capture de paiement pour les tests de bout en bout.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('mockPaymentAllowed')}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                settings.mockPaymentAllowed ? 'bg-[#00D4AA]' : 'bg-[#CBD5E1] dark:bg-[#334155]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.mockPaymentAllowed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-white">
                Cache Distribué Redis
              </div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Mise en mémoire des recherches de vols et d&apos;hôtels pour réduire la latence réseau.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('redisCacheEnabled')}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                settings.redisCacheEnabled ? 'bg-[#00D4AA]' : 'bg-[#CBD5E1] dark:bg-[#334155]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.redisCacheEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
