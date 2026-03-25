import { useState, useEffect, useCallback, useRef } from 'react';
import type { TropicalStorm } from '../types';

const TROPICAL_URL = '/api/tropical';
const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes (NHC advisory cadence)

interface UseTropicalResult {
  storms: TropicalStorm[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useTropical(): UseTropicalResult {
  const [storms, setStorms] = useState<TropicalStorm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStorms = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      setError(null);
      const res = await fetch(TROPICAL_URL, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: unknown = await res.json();
      const normalized: TropicalStorm[] = Array.isArray(data) ? (data as TropicalStorm[]) : [];
      setStorms(normalized);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch tropical storm data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorms();
    const timer = setInterval(fetchStorms, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchStorms]);

  return { storms, loading, error, lastUpdate };
}
