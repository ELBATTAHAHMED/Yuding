'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';

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
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E232D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white m-0">
            Modération des Avis Voyageurs
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 m-0">
            Validation éditoriale du contenu public, filtrage des liens suspects et vérification d&apos;authenticité.
          </p>
        </div>

        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">
          {reviews.length} avis en attente d&apos;arbitrage
        </div>
      </div>

      {/* 2. Workspace: Left Queue Triage, Right Editorial Inspection */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#94A3B8]">Chargement de la file...</div>
      ) : reviews.length === 0 ? (
        <div className="p-16 text-center rounded-xl bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#10B981] flex items-center justify-center mx-auto text-sm">
            <i className="fas fa-check" />
          </div>
          <div className="font-bold text-sm text-[#0F172A] dark:text-white">
            File de modération à jour
          </div>
          <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Tous les avis soumis ont été examinés par l&apos;équipe éditoriale.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Queue List */}
          <div className="lg:col-span-5 space-y-2">
            {reviews.map((r) => {
              const isSelected = selectedReview?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReviewId(r.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-[#12151B] border-[#0F172A] dark:border-white shadow-xs'
                      : 'bg-white dark:bg-[#12151B] border-[#E5E7EB] dark:border-[#1E232D] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#0F172A] dark:text-white truncate">
                      {r.entityName || r.entityReference}
                    </span>
                    <span className="font-bold text-[#D97706] flex items-center gap-1">
                      <i className="fas fa-star text-[10px]" />
                      <span>{r.rating}/5</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 m-0 leading-relaxed">
                    &ldquo;{r.content}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Review Decision Panel */}
          {selectedReview && (
            <div className="lg:col-span-7 bg-white dark:bg-[#12151B] border border-[#E5E7EB] dark:border-[#1E232D] rounded-xl p-8 space-y-6 sticky top-24">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
                  Examen de l&apos;Avis #{selectedReview.id.slice(0, 8)}
                </span>
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-white m-0 mt-1">
                  {selectedReview.entityName || selectedReview.entityReference}
                </h3>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Type : {selectedReview.entityType} • Référence : {selectedReview.entityReference}
                </div>
              </div>

              <div className="p-5 rounded-lg bg-[#FAFAFB] dark:bg-[#161B22] border border-[#F1F3F5] dark:border-[#1E232D]">
                <div className="text-xs font-bold text-[#D97706] mb-2 flex items-center gap-1">
                  <i className="fas fa-star text-xs" />
                  <span>Note attribuée : {selectedReview.rating} sur 5</span>
                </div>
                <div className="text-sm text-[#0F172A] dark:text-white leading-relaxed italic">
                  &ldquo;{selectedReview.content}&rdquo;
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F3F5] dark:border-[#1A1F28]">
                <button
                  type="button"
                  onClick={() => moderateMutation.mutate({ id: selectedReview.id, status: 'REJECTED' })}
                  disabled={moderateMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#7F1D1D]/20 transition-colors"
                >
                  Rejeter l&apos;avis
                </button>
                <button
                  type="button"
                  onClick={() => moderateMutation.mutate({ id: selectedReview.id, status: 'APPROVED' })}
                  disabled={moderateMutation.isPending}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] transition-colors"
                >
                  Approuver &amp; Publier
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
