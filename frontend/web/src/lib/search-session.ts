'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'yuding:v2:search:';
const CACHE_VERSION = 1;
const MAX_AGE_MS = 30 * 60 * 1000;
type Entry<T> = { version: number; savedAt: number; data: T };
const memorySnapshots = new Map<string, Entry<unknown>>();

function storageKey(product: string): string {
  return `${STORAGE_PREFIX}${product.toLowerCase()}:${window.location.search}`;
}

function readSnapshot<T>(product: string): T | null {
  const key = storageKey(product);
  try {
    const raw = window.sessionStorage.getItem(key);
    const persisted = raw ? JSON.parse(raw) as Entry<T> : undefined;
    const inMemory = memorySnapshots.get(key) as Entry<T> | undefined;
    const entry = inMemory && (!persisted || inMemory.savedAt >= persisted.savedAt) ? inMemory : persisted;
    if (!entry) return null;
    if (entry.version !== CACHE_VERSION || typeof entry.savedAt !== 'number' || Date.now() - entry.savedAt > MAX_AGE_MS || !entry.data) {
      window.sessionStorage.removeItem(key);
      memorySnapshots.delete(key);
      return null;
    }
    return entry.data;
  } catch {
    return (memorySnapshots.get(key)?.data as T | undefined) ?? null;
  }
}

/** Keep a search page's form, results and filters in this browser tab while visiting offer details. */
export function useSearchSession<T>(product: string, snapshot: T, restore: (saved: T) => void, isSearching: boolean): void {
  const [restored, setRestored] = useState(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    const saved = readSnapshot<T>(product);
    if (saved) restoreRef.current(saved);
    setRestored(true);
  }, [product]);

  useEffect(() => {
    if (!restored || isSearching) return;
    const key = storageKey(product);
    const entry: Entry<T> = { version: CACHE_VERSION, savedAt: Date.now(), data: snapshot };
    memorySnapshots.set(key, entry);
    try {
      window.sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Search remains usable when session storage is unavailable or full.
    }
  }, [product, snapshot, restored, isSearching]);
}
