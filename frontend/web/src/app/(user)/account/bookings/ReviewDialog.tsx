'use client';

import { useEffect, useState } from 'react';
import { reviewService, type MyReview } from '@/services/review.service';
import { useAuth } from '@/features/auth/useAuth';
import { authService } from '@/services/auth.service';
import { useQuery } from '@tanstack/react-query';

const RATING_LABELS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Inoubliable'] as const;

/** Compact star row with proper hover-preview, keyboard support and screen-reader semantics. */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  const label = RATING_LABELS[hovered || value] ?? '';

  return (
    <div className="rdlg-stars-wrap">
      <div
        className="rdlg-stars"
        role="group"
        aria-label="Note de 1 à 5 étoiles"
        onMouseLeave={() => setHovered(0)}
      >
        {([1, 2, 3, 4, 5] as const).map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            aria-pressed={value === n}
            className={`rdlg-star${n <= display ? ' rdlg-star--on' : ''}`}
            onMouseEnter={() => setHovered(n)}
            onClick={() => { onChange(n); setHovered(0); }}
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(0)}
          >
            <i className="fas fa-star" aria-hidden="true" />
          </button>
        ))}
      </div>
      <span className="rdlg-star-label" role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
}

/** Tiny avatar using auth photo or initials fallback — matches UserAvatar logic. */
function AuthorBadge() {
  const { user } = useAuth();
  const photo = useQuery({
    queryKey: ['profile-photo', user?.id, user?.updatedAt],
    queryFn: authService.getProfilePhoto,
    enabled: Boolean(user?.hasProfilePhoto),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo.data) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(photo.data);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.data]);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map(s => s!.trim().charAt(0))
    .join('')
    .toUpperCase() || 'Y';

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Voyageur vérifié';

  return (
    <div className="rdlg-author">
      <span className="rdlg-author-avatar" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials}</span>}
      </span>
      <span className="rdlg-author-name">{displayName}</span>
    </div>
  );
}

export function ReviewDialog({
  reference, entityName, review, onClose, onChanged, platform = false,
}: {
  reference?: string;
  entityName: string;
  review: MyReview | null;
  onClose: () => void;
  onChanged: () => void;
  platform?: boolean;
}) {
  const [rating, setRating] = useState(review?.rating || 0);
  const [content, setContent] = useState(review?.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<MyReview | null>(review);
  const isDeleted = saved?.status === 'DELETED';

  // Keyboard: Escape closes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async () => {
    setError('');
    if (rating < 1) { setError('Choisissez une note de 1 à 5.'); return; }
    if (!saved && !platform && !reference) { setError('Cette réservation est introuvable.'); return; }
    setBusy(true);
    try {
      const result = saved
        ? await reviewService.edit(saved.id, rating, content)
        : platform
          ? await reviewService.createPlatform(rating, content)
          : await reviewService.create(reference!, rating, content);
      setSaved(result);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d\u2019enregistrer votre avis.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!saved || !window.confirm('Supprimer votre avis ? Cette action est définitive.')) return;
    setBusy(true);
    try { await reviewService.delete(saved.id); onChanged(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de supprimer cet avis.'); }
    finally { setBusy(false); }
  };

  return (
    <div
      className="rdlg-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdlg-title"
        className="rdlg-modal"
      >
        {/* ── Header ── */}
        <header className="rdlg-header">
          <div>
            <span className="rdlg-kicker">
              {platform ? 'VOTRE EXPÉRIENCE YUDING' : `VOYAGE VÉRIFIÉ · ${reference}`}
            </span>
            <h2 id="rdlg-title" className="rdlg-title">
              {platform ? 'Votre regard sur Yuding' : 'Votre voyage continue dans vos souvenirs.'}
            </h2>
            <p className="rdlg-subtitle">
              {platform
                ? "Comment s\u2019est pass\u00e9e votre exp\u00e9rience\u00a0?"
                : `Comment s\u2019est pass\u00e9e cette exp\u00e9rience\u00a0: ${entityName}\u00a0?`}
            </p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose} className="rdlg-close">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="rdlg-body">
          {/* Moderation status banner */}
          {saved && (
            <p className="rdlg-status" role="status">
              {saved.status === 'APPROVED' ? 'Votre avis est publié.' :
               saved.status === 'PENDING_MODERATION' ? 'Votre avis est en attente de modération.' :
               saved.status === 'REJECTED' ? "Votre avis n\u2019a pas \u00e9t\u00e9 publi\u00e9. Vous pouvez le modifier." :
               'Avis supprimé.'}
            </p>
          )}

          {!isDeleted && (
            <>
              {/* Author identity — automatic from auth */}
              <AuthorBadge />

              {/* Star rating with hover preview */}
              <p className="rdlg-field-label">Votre note</p>
              <StarRating value={rating} onChange={setRating} />

              {/* Textarea — revealed after first rating selection */}
              {(saved || rating > 0) && (
                <div className="rdlg-optional">
                  {!saved && (
                    <p className="rdlg-helper">
                      Merci pour votre note. Vous pouvez ajouter quelques mots avant de publier,
                      ou revenir plus tard.
                    </p>
                  )}
                  <label className="rdlg-textarea-label" htmlFor="rdlg-content">
                    {platform ? 'Un mot sur Yuding' : "Qu\u2019avez-vous aim\u00e9\u00a0?"}
                    <span> (facultatif)</span>
                  </label>
                  <textarea
                    id="rdlg-content"
                    className="rdlg-textarea"
                    maxLength={1200}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Ce que vous avez apprécié, ou ce qui pourrait être amélioré…"
                    rows={4}
                  />
                  <small className="rdlg-char-count">{content.length}/1200 caractères</small>
                </div>
              )}
            </>
          )}

          {error && <p role="alert" className="rdlg-error">{error}</p>}
        </div>

        {/* ── Footer ── */}
        <footer className="rdlg-footer">
          {saved && !isDeleted && (
            <button type="button" className="rdlg-delete" onClick={remove} disabled={busy}>
              Supprimer l'avis
            </button>
          )}
          <button type="button" className="rdlg-later" onClick={onClose}>
            {saved ? 'Fermer' : 'Plus tard'}
          </button>
          {!isDeleted && rating > 0 && (
            <button
              type="button"
              className="rdlg-publish"
              onClick={submit}
              disabled={busy}
            >
              {busy ? 'Enregistrement…' : saved ? 'Mettre à jour' : 'Publier mon avis'}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
