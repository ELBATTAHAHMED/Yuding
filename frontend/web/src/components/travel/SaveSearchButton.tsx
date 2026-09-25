'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { libraryService } from '@/services/library.service';
import type { RecentSearchRequest } from '@/types/library.types';

/** Saves criteria in the existing recent-search library; it never stores a provider offer. */
export function SaveSearchButton({ request }: { request: RecentSearchRequest }) {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setState('saving');
    try {
      await libraryService.recordRecentSearch(request);
      setState('saved');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" onClick={save} disabled={state === 'saving'}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#01796F]/30 px-2.5 py-1.5 text-xs font-semibold text-[#01796F] transition-colors hover:bg-[#01796F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#01796F] disabled:opacity-60 dark:border-[#02E0D5]/40 dark:text-[#02E0D5]">
        <i className="far fa-bookmark text-[11px]" aria-hidden="true" />
        {state === 'saving' ? 'Enregistrement…' : state === 'saved' ? 'Recherche enregistrée' : 'Enregistrer la recherche'}
      </button>
      {state === 'error' && <span role="alert" className="text-xs text-rose-700 dark:text-rose-300">Échec de l’enregistrement</span>}
    </div>
  );
}
