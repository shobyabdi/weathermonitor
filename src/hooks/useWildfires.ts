import { useState, useEffect, useCallback, useRef } from 'react';
import type { Wildfire } from '../types';

const WILDFIRES_URL = '/api/wildfires';
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes (satellite pass dependent)

interface UseWildfiresResult {
  wildfires: Wildfire[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useWildfires(): UseWildfiresResult {
  const [wildfires, setWildfires] = useState<Wildfire[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchWildfires = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      setError(null);
      const res = await fetch(WILDFIRES_URL, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: unknown = await res.json();
      const normalized: Wildfire[] = Array.isArray(data) ? (data as Wildfire[]) : [];
      setWildfires(normalized);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch wildfire data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWildfires();
    const timer = setInterval(fetchWildfires, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchWildfires]);

  return { wildfires, loading, error, lastUpdate };
}
