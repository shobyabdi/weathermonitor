import { useState, useEffect, useCallback, useRef } from 'react';
import type { WeatherAlert } from '../types';

const ALERTS_URL = '/api/alerts?area=IL';
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

interface UseWeatherAlertsResult {
  alerts: WeatherAlert[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdate: Date | null;
}

export function useWeatherAlerts(): UseWeatherAlertsResult {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      setError(null);
      const res = await fetch(ALERTS_URL, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: unknown = await res.json();
      // Backend returns { count, alerts: [...] }
      const normalized: WeatherAlert[] = Array.isArray(data)
        ? (data as WeatherAlert[])
        : Array.isArray((data as Record<string, unknown>)?.alerts)
          ? ((data as Record<string, unknown>).alerts as WeatherAlert[])
          : [];
      setAlerts(normalized);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch weather alerts';
      setError(message);
      // Preserve previously fetched alerts on transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh: fetchAlerts, lastUpdate };
}
