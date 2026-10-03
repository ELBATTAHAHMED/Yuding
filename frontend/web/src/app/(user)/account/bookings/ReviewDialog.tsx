'use client';

import { useEffect, useState } from 'react';
import { reviewService, type MyReview } from '@/services/review.service';

export function ReviewDialog({ reference, entityName, review, onClose, onChanged, platform = false }:
  { reference?: string; entityName: string; review: MyReview | null; onClose: () => void; onChanged: () => void; platform?: boolean }) {
  const [rating, setRating] = useState(review?.rating || 0);
  const [content, setContent] = useState(review?.content || '');
  const [publicDisplayName, setPublicDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<MyReview | null>(review);
  const ratingLabels = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Inoubliable'];
  const isDeleted = saved?.status === 'DELETED';
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const submit = async (textToSend: string) => {
    setError('');
    if (rating < 1) { setError('Choisissez une note de 1 à 5.'); return; }
    if (!saved && !platform && !reference) { setError('Cette réservation est introuvable.'); return; }
    setBusy(true);
    try {
      const result = saved ? await reviewService.edit(saved.id, rating, textToSend) : platform
        ? await reviewService.createPlatform(rating, textToSend, publicDisplayName)
        : await reviewService.create(reference!, rating, textToSend, publicDisplayName);
      setSaved(result);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer votre avis.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!saved || !window.confirm('Supprimer votre avis ? Cette action est définitive.')) return;
    setBusy(true);
    try { await reviewService.delete(saved.id); onChanged(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de supprimer cet avis.'); }
    finally { setBusy(false); }
  };
  return <div className="review-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="review-title" className="review-modal">
      <header className="review-modal-header">
        <div><span className="review-kicker">{platform ? 'VOTRE EXPÉRIENCE YUDING' : `VOYAGE VÉRIFIÉ · ${reference}`}</span>
          <h2 id="review-title">{platform ? 'Votre regard sur Yuding' : 'Votre voyage continue dans vos souvenirs.'}</h2>
          <p className="review-modal-subtitle">{platform ? 'Comment s’est passée votre expérience ?' : `Comment s’est passée cette expérience : ${entityName} ?`}</p></div>
        <button type="button" aria-label="Fermer" onClick={onClose} className="review-close"><i className="fas fa-times" /></button>
      </header>
      <div className="review-modal-body">
        {saved && <p className="review-state" role="status">{saved.status === 'APPROVED' ? 'Votre avis est publié.' :
          saved.status === 'PENDING_MODERATION' ? 'Votre avis est en attente de modération.' :
          saved.status === 'REJECTED' ? 'Votre avis n’a pas été publié. Vous pouvez le modifier.' : 'Avis supprimé.'}</p>}
        {!isDeleted && <><p className="review-field-label">Votre note</p>
          <div className="review-rating-input" role="group" aria-label="Note de 1 à 5 étoiles">
            {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
              aria-pressed={rating === value} onClick={() => setRating(value)} className={value <= rating ? 'selected' : ''}>
              <i className="fas fa-star" aria-hidden="true" /></button>)}</div>
          {rating > 0 && <p className="review-rating-label" role="status">{ratingLabels[rating]}</p>}
          {(saved || rating > 0) && <div className="review-optional-fields">
            {!saved && <p>Merci pour votre note. Vous pouvez ajouter quelques mots avant de publier, ou revenir plus tard sans enregistrer.</p>}
            <label className="review-field-label" htmlFor="review-content">{platform ? 'Un mot sur Yuding' : 'Qu’avez-vous aimé ?'} <span>(facultatif)</span></label>
            <textarea id="review-content" maxLength={1200} value={content} onChange={event => setContent(event.target.value)}
              placeholder="Ce que vous avez apprécié, ou ce qui pourrait être amélioré…" rows={5} />
            <small>{content.length}/1200 caractères</small>
            {!saved && <label className="review-field-label" htmlFor="review-public-name">Nom affiché publiquement <span>(facultatif)</span><input id="review-public-name" type="text" maxLength={48} value={publicDisplayName} onChange={event => setPublicDisplayName(event.target.value)} placeholder="Prénom ou nom de voyageur" /><small>Laissez vide pour publier sous « Voyageur vérifié ».</small></label>}
          </div>}</>}
        {error && <p role="alert" className="review-error">{error}</p>}
      </div>
      <footer className="review-modal-footer">
        {saved && !isDeleted && <button type="button" className="review-delete" onClick={remove} disabled={busy}>Supprimer l’avis</button>}
        <button type="button" className="btn-secondary-sm" onClick={onClose}>{saved ? 'Fermer' : 'Plus tard'}</button>
        {!isDeleted && rating > 0 && <button type="button" className="btn-primary-sm" onClick={() => submit(content)} disabled={busy}>
          {busy ? 'Enregistrement…' : saved ? 'Mettre à jour' : 'Publier mon avis'}</button>}
      </footer>
    </section>
  </div>;
}
