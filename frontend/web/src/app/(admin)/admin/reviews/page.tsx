'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';
import { useAuth } from '@/features/auth/useAuth';
import { AdminBadge } from '@/components/admin/AdminBadge';

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const allowed = user?.roles?.includes('ROLE_ADMIN') || user?.roles?.includes('ROLE_SUPPORT') || user?.roles?.includes('ROLE_CONTENT_MANAGER');
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reviews', 'moderation'],
    queryFn: reviewService.pending,
    enabled: Boolean(allowed),
  });

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0] || null;

  const decision = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      reviewService.moderate(id, status),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : 'La décision n’a pas pu être enregistrée.'),
  });

  if (!allowed) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Accès restreint : privilèges de modération requis (ROLE_CONTENT_MANAGER, ROLE_SUPPORT ou ROLE_ADMIN).
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            Modération des Avis Voyageurs
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Espace d&apos;arbitrage éditorial : examen du contenu, prévention anti-fraude et publication officielle
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
        >
          <i className="fas fa-sync text-xs" />
          <span>Actualiser ({reviews.length})</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
        >
          <i className="fas fa-exclamation-circle text-sm" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Review Workspace */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 h-28 animate-pulse shadow-xs" />
            ))}
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 h-80 animate-pulse shadow-xs" />
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center text-rose-600 shadow-xs">
          <i className="fas fa-exclamation-triangle text-2xl mb-2" />
          <div className="font-bold text-sm">Impossible de charger la file de modération</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <i className="fas fa-check-double" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">
            File de modération à jour
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
            Aucun avis en attente de validation éditoriale. Tout retour soumis avec lien ou contenu suspect sera acheminé ici.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Review Queue List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">
              File d&apos;attente ({reviews.length})
            </div>
            <div className="space-y-2.5 max-h-[calc(100vh-220px)] overflow-y-auto admin-custom-scrollbar pr-1">
              {reviews.map((r) => {
                const isSelected = selectedReview?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReviewId(r.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-zinc-800 dark:border-zinc-700'
                        : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-zinc-100'}`}>
                        {r.entityName || r.entityReference}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-400 text-xs shrink-0">
                        <i className="fas fa-star" />
                        <span className={`font-bold text-[11px] ${isSelected ? 'text-zinc-200' : 'text-slate-600 dark:text-zinc-300'}`}>
                          {r.rating}/5
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs line-clamp-2 m-0 ${isSelected ? 'text-zinc-300' : 'text-slate-500 dark:text-zinc-400'}`}>
                      &ldquo;{r.content}&rdquo;
                    </p>

                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] admin-mono-tabular" style={{ borderColor: isSelected ? 'rgba(255,255,255,0.1)' : 'var(--admin-border-subtle)' }}>
                      <span className={isSelected ? 'text-zinc-400' : 'text-slate-400 dark:text-zinc-500'}>
                        {r.entityType}
                      </span>
                      <span className={isSelected ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                        ID #{r.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Review Inspector & Decision Panel */}
          {selectedReview && (
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-zinc-100">
                      {selectedReview.entityName || selectedReview.entityReference}
                    </span>
                    <AdminBadge variant="info" size="sm" dot={false}>
                      {selectedReview.entityType}
                    </AdminBadge>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-zinc-500 mt-1 admin-mono-tabular">
                    Référence cible : {selectedReview.entityReference} • Fournisseur : {selectedReview.provider || 'DIRECT'}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i
                      key={i}
                      className={`fas fa-star ${i < selectedReview.rating ? 'opacity-100' : 'opacity-20'}`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 ml-1">
                    ({selectedReview.rating}/5)
                  </span>
                </div>
              </div>

              {/* Review Text Content Box */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Commentaire Soumis par le Voyageur
                </span>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  &ldquo;{selectedReview.content}&rdquo;
                </div>
              </div>

              {/* Moderation Guidelines Note */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <i className="fas fa-shield-alt text-amber-600 dark:text-amber-400 text-sm shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <div className="font-bold">Contrôle de conformité Yuding V2</div>
                  <div className="text-[11px] opacity-90">
                    Assurez-vous de l&apos;absence de coordonnées personnelles privées, liens externes non autorisés ou propos diffamatoires avant d&apos;approuver.
                  </div>
                </div>
              </div>

              {/* Decision Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 dark:text-zinc-500 admin-mono-tabular">
                  Dossier #{selectedReview.id}
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: selectedReview.id, status: 'REJECTED' })}
                    className="inline-flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/40 transition-colors shadow-2xs"
                  >
                    <i className="fas fa-times text-xs" />
                    <span>Rejeter l&apos;avis</span>
                  </button>

                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: selectedReview.id, status: 'APPROVED' })}
                    className="inline-flex items-center gap-2 text-xs font-bold py-2 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 transition-colors shadow-xs"
                  >
                    <i className="fas fa-check text-xs" />
                    <span>Approuver &amp; Publier</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
