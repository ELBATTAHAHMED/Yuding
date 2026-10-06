'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';
import { AdminBadge } from '@/components/admin/AdminBadge';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', 'moderation'],
    queryFn: reviewService.pending,
  });

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0] || null;

  const moderateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      reviewService.moderate(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setSelectedReviewId(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0] dark:border-[#1E2430]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Modération des Avis Voyageurs
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Arbitrage éditorial du contenu client, prévention des abus et validation d&apos;authenticité des séjours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AdminBadge variant={reviews.length > 0 ? 'warning' : 'success'} size="md">
            {reviews.length} avis en attente d&apos;examen
          </AdminBadge>
        </div>
      </div>

      {/* 2. Workspace Content */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#94A3B8]">
          Chargement de la file de modération...
        </div>
      ) : reviews.length === 0 ? (
        /* Compact, integrated high-quality empty state (NO giant white box!) */
        <div className="p-8 rounded-xl border border-[#E2E8F0] dark:border-[#1E2430] bg-white dark:bg-[#14171E] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#10B981] flex items-center justify-center shrink-0">
              <i className="fas fa-check-circle text-base" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#0F172A] dark:text-white">
                File de modération à jour
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Tous les avis déposés sur les établissements et séjours ont été arbitrés par l&apos;équipe éditoriale.
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold text-[#0D9488] dark:text-[#00D4AA] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Flux temps réel synchronisé</span>
          </div>
        </div>
      ) : (
        /* Rich moderation queue + preview panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Moderation Queue */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              Avis en Attente d&apos;Arbitrage ({reviews.length})
            </div>

            <div className="space-y-2">
              {reviews.map((r) => {
                const isSelected = selectedReview?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReviewId(r.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-[#14171E] border-[#0F172A] dark:border-white shadow-xs'
                        : 'bg-white dark:bg-[#14171E] border-[#E2E8F0] dark:border-[#1E2430] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#0F172A] dark:text-white truncate">
                        {r.entityName || r.entityReference}
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <i className="fas fa-star text-[10px]" />
                        <span>{r.rating}/5</span>
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 m-0 leading-relaxed italic">
                      &ldquo;{r.content}&rdquo;
                    </p>
                    <div className="mt-2 text-[10px] text-[#94A3B8] font-mono">
                      Type : {r.entityType}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Review Decision Panel */}
          {selectedReview && (
            <div className="lg:col-span-7 admin-card p-6 space-y-6 sticky top-24 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1E2430]">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
                    Examen de l&apos;Avis #{selectedReview.id.slice(0, 8)}
                  </span>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white m-0 mt-1">
                    {selectedReview.entityName || selectedReview.entityReference}
                  </h3>
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Catégorie : {selectedReview.entityType} • Référence cible : {selectedReview.entityReference}
                  </div>
                  {selectedReview.bookingReference && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <i className="fas fa-check-circle text-[9px]" />
                        <span>Séjour vérifié</span>
                      </span>
                      <Link
                        href={`/admin/bookings?search=${encodeURIComponent(selectedReview.bookingReference)}`}
                        className="text-xs font-mono font-bold text-[#0D9488] dark:text-[#00D4AA] hover:underline"
                      >
                        Dossier {selectedReview.bookingReference} →
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <i className="fas fa-star text-[10px]" />
                  <span>{selectedReview.rating} sur 5</span>
                </div>
              </div>

              {/* Review Text */}
              <div className="p-5 rounded-xl bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Commentaire Soumis
                </span>
                <p className="text-sm text-[#0F172A] dark:text-white leading-relaxed italic m-0">
                  &ldquo;{selectedReview.content}&rdquo;
                </p>
              </div>

              {/* Moderator Decision Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#1E2430]">
                <button
                  type="button"
                  onClick={() => moderateMutation.mutate({ id: selectedReview.id, status: 'REJECTED' })}
                  disabled={moderateMutation.isPending}
                  className="admin-btn bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/40"
                >
                  <i className="fas fa-times text-xs" />
                  <span>Rejeter l&apos;Avis</span>
                </button>
                <button
                  type="button"
                  onClick={() => moderateMutation.mutate({ id: selectedReview.id, status: 'APPROVED' })}
                  disabled={moderateMutation.isPending}
                  className="admin-btn bg-[#0F172A] hover:bg-slate-800 text-white dark:bg-white dark:text-[#0F172A]"
                >
                  <i className="fas fa-check text-xs" />
                  <span>Approuver &amp; Publier</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
