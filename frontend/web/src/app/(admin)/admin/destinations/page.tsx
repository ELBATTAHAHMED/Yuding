'use client';

import React from 'react';
import { useAdminDestinations } from '@/hooks/queries/useAdminQueries';

export default function AdminDestinationsPage() {
  const { data: destinations = [], isLoading } = useAdminDestinations();

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Destinations du Maroc
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Catalogue éditorial des régions et villes marocaines exposées sur le portail Yuding.
          </p>
        </div>

        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
          {destinations.length} destinations répertoriées
        </div>
      </div>

      {/* 2. Editorial Photography Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#94A3B8]">Chargement du catalogue...</div>
      ) : destinations.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#94A3B8]">Aucune destination enregistrée.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-44 bg-[#0F172A] overflow-hidden">
                {d.heroImageUrl ? (
                  <img
                    src={d.heroImageUrl}
                    alt={d.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#94A3B8] text-xs">
                    Image éditoriale
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#00D4AA]">
                    {d.city}, {d.countryName || 'Maroc'}
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight m-0">
                    {d.name}
                  </h3>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 m-0 leading-relaxed">
                  {d.description || 'Destination phare du patrimoine et des séjours de charme au Maroc.'}
                </p>

                <div className="pt-3 border-t border-[#F1F3F5] dark:border-[#1A1F28] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                  <span>/{d.slug}</span>
                  <span className="text-[#047857] dark:text-[#34D399] font-bold">Actif</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
