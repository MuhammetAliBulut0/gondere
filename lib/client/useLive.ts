'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChunkResponse, LiveResponse, MetaState, PoleEntry } from '../types.ts';
import { CHUNK_SIZE, POLL_MS } from '../config.ts';

type Chunks = Record<number, PoleEntry[]>;

function mergeEntries(a: PoleEntry[] = [], b: PoleEntry[] = []): PoleEntry[] {
  const map = new Map<number, PoleEntry>();
  for (const e of a) map.set(e.i, e);
  for (const e of b) map.set(e.i, e);
  return [...map.values()].sort((x, y) => x.i - y.i);
}

export type LiveStatus = 'loading' | 'ready' | 'error';

export function useLive() {
  const [meta, setMeta] = useState<MetaState | null>(null);
  const [chunks, setChunks] = useState<Chunks>({});
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const metaRef = useRef<MetaState | null>(null);
  const loadedSealed = useRef<Set<number>>(new Set());
  const inflight = useRef(false);

  const acceptMeta = useCallback((next: MetaState) => {
    const cur = metaRef.current;
    // CDN'den gelen eski bir yanıt, elimizdeki daha yeni durumu geriye götürmesin
    if (cur && next.v < cur.v) return;
    metaRef.current = next;
    setMeta(next);
  }, []);

  const fetchSealed = useCallback(async (chunkCount: number) => {
    const missing: number[] = [];
    for (let n = 0; n < chunkCount - 1; n++) if (!loadedSealed.current.has(n)) missing.push(n);
    await Promise.all(
      missing.map(async (n) => {
        const res = await fetch(`/api/chunk/${n}`);
        if (!res.ok) return;
        const data = (await res.json()) as ChunkResponse;
        if (data.sealed) loadedSealed.current.add(n);
        setChunks((c) => ({ ...c, [n]: mergeEntries(c[n], data.entries) }));
      }),
    );
  }, []);

  const refresh = useCallback(
    async (bust = false) => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const res = await fetch(bust ? `/api/live?t=${Date.now()}` : '/api/live');
        const data = (await res.json()) as LiveResponse & { ok?: false; message?: string };
        if (!res.ok || !data.state) {
          setStatus((s) => (s === 'ready' ? s : 'error'));
          setErrorText(data.message ?? 'Bağlantı kurulamadı.');
          return;
        }
        acceptMeta(data.state);
        if (data.lastChunk) {
          const { index, entries } = data.lastChunk;
          setChunks((c) => ({ ...c, [index]: mergeEntries(c[index], entries) }));
        }
        await fetchSealed(data.state.chunkCount);
        setStatus('ready');
        setErrorText(null);
      } catch {
        setStatus((s) => (s === 'ready' ? s : 'error'));
        setErrorText('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.');
      } finally {
        inflight.current = false;
      }
    },
    [acceptMeta, fetchSealed],
  );

  /** Kendi gönderimimizin sonucunu beklemeden ekrana yansıt */
  const applyEntry = useCallback(
    (entry: PoleEntry, state: MetaState) => {
      acceptMeta(state);
      const idx = Math.floor(entry.i / CHUNK_SIZE);
      setChunks((c) => ({ ...c, [idx]: mergeEntries(c[idx], [entry]) }));
    },
    [acceptMeta],
  );

  useEffect(() => {
    refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  const entries = useMemo(() => {
    const keys = Object.keys(chunks)
      .map(Number)
      .sort((a, b) => a - b);
    return keys.flatMap((k) => chunks[k]);
  }, [chunks]);

  return { meta, entries, status, errorText, refresh, applyEntry };
}
