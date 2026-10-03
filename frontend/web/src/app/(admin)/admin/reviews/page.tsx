'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/review.service';
import { useAuth } from '@/features/auth/useAuth';

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const allowed = user?.roles?.includes('ROLE_ADMIN') || user?.roles?.includes('ROLE_SUPPORT');
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const reviews = useQuery({ queryKey: ['reviews', 'moderation'], queryFn: reviewService.pending, enabled: Boolean(allowed) });
  const decision = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
    reviewService.moderate(id, status), onSuccess: () => { setError(''); queryClient.invalidateQueries({ queryKey: ['reviews'] }); },
    onError: cause => setError(cause instanceof Error ? cause.message : 'La décision n’a pas pu être enregistrée.') });
  if (!allowed) return <p style={{ color: '#fff' }}>Accès réservé à la modération.</p>;
  return <main style={{ color: '#fff', maxWidth: '960px' }}>
    <p style={{ color: '#00D4AA', fontSize: '12px', letterSpacing: '.12em', fontWeight: 700 }}>CONTENU COMMUNAUTAIRE</p>
    <h1 style={{ fontSize: '1.8rem', margin: '8px 0' }}>Avis à modérer</h1>
    <p style={{ color: '#b0bec5', marginBottom: '30px' }}>Les avis contenant un lien restent invisibles jusqu’à votre décision.</p>
    {reviews.isPending && <p>Chargement des avis…</p>}
    {reviews.isError && <p role="alert">Impossible de charger les avis à modérer.</p>}
    {error && <p role="alert" style={{ color: '#fda4af' }}>{error}</p>}
    {reviews.data?.length === 0 && <p style={{ color: '#b0bec5' }}>Aucun avis en attente.</p>}
    <div style={{ display: 'grid', gap: '14px' }}>
      {reviews.data?.map(review => <article key={review.id} style={{ border: '1px solid rgba(255,255,255,.13)',
        borderRadius: '10px', padding: '20px', background: '#1A1F2E' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px' }}>
          <strong>{review.entityName || review.entityReference}</strong><span style={{ color: '#e9b458' }}>{'★'.repeat(review.rating)}</span>
        </div>
        <p style={{ color: '#b0bec5', fontSize: '12px', margin: '8px 0 14px' }}>{review.entityType} · {review.provider}</p>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{review.content}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
          <button type="button" disabled={decision.isPending} onClick={() => decision.mutate({ id: review.id, status: 'APPROVED' })}
            style={{ background: '#087d70', color: '#fff', border: 0, borderRadius: '6px', padding: '9px 16px', cursor: 'pointer' }}>Approuver</button>
          <button type="button" disabled={decision.isPending} onClick={() => decision.mutate({ id: review.id, status: 'REJECTED' })}
            style={{ background: 'transparent', color: '#fda4af', border: '1px solid #97565b', borderRadius: '6px', padding: '9px 16px', cursor: 'pointer' }}>Rejeter</button>
        </div>
      </article>)}
    </div>
  </main>;
}
