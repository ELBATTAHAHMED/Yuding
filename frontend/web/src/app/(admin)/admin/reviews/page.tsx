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

  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reviews', 'moderation'],
    queryFn: reviewService.pending,
    enabled: Boolean(allowed),
  });

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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Modération des Avis Voyageurs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            File de conformité et modération de contenu : avis avec liens, signalements ou vérification éditoriale requise
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors shadow-2xs"
        >
          <i className="fas fa-sync text-[11px]" />
          <span>Actualiser ({reviews.length})</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
        >
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* Review Queue */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 h-36 animate-pulse shadow-xs" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center text-rose-600 shadow-xs">
          <i className="fas fa-exclamation-triangle text-2xl mb-2" />
          <div className="font-bold text-sm">Impossible de charger la file de modération</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <i className="fas fa-check-double" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
            File de modération à jour
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
            Aucun avis en attente de validation éditoriale. Tout retour soumis avec lien ou contenu suspect sera acheminé ici.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
            >
              {/* Header: Target entity & stars */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {review.entityName || review.entityReference}
                  </span>
                  <AdminBadge variant="info" size="sm" dot={false}>
                    {review.entityType}
                  </AdminBadge>
                  {review.provider && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                      {review.provider}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i
                      key={i}
                      className={`fas fa-star ${i < review.rating ? 'opacity-100' : 'opacity-20'}`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">({review.rating}/5)</span>
                </div>
              </div>

              {/* Review Content */}
              <p className="text-xs leading-relaxed whitespace-pre-wrap rounded-xl p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-normal m-0">
                &ldquo;{review.content}&rdquo;
              </p>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] admin-mono-tabular text-slate-400 dark:text-slate-500">
                  ID : {review.id}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: review.id, status: 'REJECTED' })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/40 transition-colors shadow-2xs"
                  >
                    <i className="fas fa-times text-[10px]" />
                    <span>Rejeter</span>
                  </button>

                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: review.id, status: 'APPROVED' })}
                    className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 transition-colors shadow-2xs"
                  >
                    <i className="fas fa-check text-[10px]" />
                    <span>Approuver &amp; Publier</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
