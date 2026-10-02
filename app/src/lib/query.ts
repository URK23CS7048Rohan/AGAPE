/**
 * Tiny data cache for screens: useQuery(key, fetcher) returns { data, loading, error, reload }.
 * Results are shared between screens by key, and invalidate("prefix") refetches every
 * query whose key starts with that prefix (call it after a write).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Entry = { data?: unknown; error?: Error; at: number; promise?: Promise<unknown> };
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

async function run<T>(key: string, fn: () => Promise<T>) {
  const e = cache.get(key) ?? { at: 0 };
  if (e.promise) return e.promise as Promise<T>;
  const p = fn()
    .then((data) => { cache.set(key, { data, at: Date.now() }); notify(key); return data; })
    .catch((error: Error) => { cache.set(key, { ...e, error, at: Date.now(), promise: undefined }); notify(key); throw error; });
  cache.set(key, { ...e, promise: p });
  return p;
}

export function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) {
      const e = cache.get(key)!;
      cache.set(key, { ...e, at: 0 });
      notify(key);
    }
  }
}
export function clearCache() {
  cache.clear();
  for (const key of listeners.keys()) notify(key);
}

/** Pass key = null to skip fetching (e.g. while signed out). */
export function useQuery<T>(key: string | null, fn: () => Promise<T>, staleMs = 30_000) {
  const [, force] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!key) return;
    const l = () => force((n) => n + 1);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(l);
    return () => { listeners.get(key)?.delete(l); };
  }, [key]);

  const entry = key ? cache.get(key) : undefined;
  const stale = !!key && (!entry || Date.now() - entry.at > staleMs) && !entry?.promise;
  useEffect(() => {
    if (key && stale) run(key, () => fnRef.current()).catch(() => {});
  }, [key, stale]);

  const reload = useCallback(() => (key ? run(key, () => fnRef.current()).catch(() => {}) : Promise.resolve()), [key]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.data === undefined ? entry?.error : undefined,
    loading: !!key && entry?.data === undefined && !entry?.error,
    reload,
  };
}
