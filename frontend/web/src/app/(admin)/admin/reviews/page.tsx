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
      <div className="p-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        Accès restreint : privilèges de modération requis.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
            Modération des Avis Communautaires
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--admin-text-muted)' }}>
            Les avis avec liens ou nécessitant une vérification éditoriale restent invisibles au public jusqu’à décision
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="admin-btn text-xs py-2 px-3.5"
          style={{
            backgroundColor: 'var(--admin-accent-subtle)',
            border: '1px solid var(--admin-accent-border)',
            color: 'var(--admin-accent)',
          }}
        >
          <i className="fas fa-sync text-xs" />
          <span>Actualiser ({reviews.length})</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg border text-xs font-semibold flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: '#F87171',
          }}
        >
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* Review Queue */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="admin-card p-6 h-36 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="admin-card p-8 text-center" style={{ color: '#F87171' }}>
          <i className="fas fa-exclamation-triangle text-2xl mb-2" />
          <div className="font-bold text-sm">Impossible de charger la file de modération</div>
        </div>
      ) : reviews.length === 0 ? (
        <div
          className="admin-card p-12 text-center flex flex-col items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl mb-1"
            style={{
              backgroundColor: 'var(--admin-accent-subtle)',
              color: 'var(--admin-accent)',
            }}
          >
            <i className="fas fa-check-double" />
          </div>
          <div className="font-bold text-sm" style={{ color: 'var(--admin-text-primary)' }}>
            File de modération à jour
          </div>
          <div className="text-xs max-w-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun avis en attente de validation. Les nouveaux avis soumis apparaîtront automatiquement ici.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="admin-card p-5 space-y-4 transition-all duration-150"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              {/* Header: Target entity & stars */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                    {review.entityName || review.entityReference}
                  </span>
                  <AdminBadge variant="info" size="sm" dot={false}>
                    {review.entityType}
                  </AdminBadge>
                  {review.provider && (
                    <span className="text-[0.6875rem] px-2 py-0.5 rounded font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {review.provider}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i
                      key={i}
                      className={`fas fa-star ${i < review.rating ? 'opacity-100' : 'opacity-20'}`}
                    />
                  ))}
                  <span className="text-xs font-bold text-slate-400 ml-1">({review.rating}/5)</span>
                </div>
              </div>

              {/* Review Content */}
              <p
                className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg p-3 border"
                style={{
                  backgroundColor: 'var(--admin-surface-muted)',
                  borderColor: 'var(--admin-border)',
                  color: 'var(--admin-text-primary)',
                }}
              >
                &ldquo;{review.content}&rdquo;
              </p>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[0.6875rem] admin-mono-tabular" style={{ color: 'var(--admin-text-muted)' }}>
                  ID : {review.id}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: review.id, status: 'REJECTED' })}
                    className="admin-btn text-xs py-1.5 px-3 rounded"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#F87171',
                    }}
                  >
                    <i className="fas fa-times text-xs" />
                    <span>Rejeter</span>
                  </button>

                  <button
                    type="button"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: review.id, status: 'APPROVED' })}
                    className="admin-btn text-xs py-1.5 px-3.5 rounded font-bold"
                    style={{
                      backgroundColor: 'var(--admin-accent)',
                      color: '#0B0F19',
                    }}
                  >
                    <i className="fas fa-check text-xs" />
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
