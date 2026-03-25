import { useState, useEffect, useCallback, useRef } from 'react';
import type { Earthquake } from '../types';

const EARTHQUAKES_BASE_URL = '/api/earthquakes';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_MAGNITUDE = 2.5;
const HOURS_WINDOW = 24;

interface UseEarthquakesResult {
  earthquakes: Earthquake[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useEarthquakes(): UseEarthquakesResult {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEarthquakes = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const url = new URL(EARTHQUAKES_BASE_URL, window.location.origin);
    url.searchParams.set('minMagnitude', String(MIN_MAGNITUDE));
    url.searchParams.set('hours', String(HOURS_WINDOW));

    try {
      setError(null);
      const res = await fetch(url.toString(), { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: unknown = await res.json();
      const normalized: Earthquake[] = Array.isArray(data) ? (data as Earthquake[]) : [];
      setEarthquakes(normalized);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch earthquake data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarthquakes();
    const timer = setInterval(fetchEarthquakes, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchEarthquakes]);

  return { earthquakes, loading, error, lastUpdate };
}
