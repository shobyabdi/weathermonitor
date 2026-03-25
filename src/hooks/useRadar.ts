import { useState, useEffect, useCallback, useRef } from 'react';
import type { RadarFrame } from '../types';

const RADAR_URL = '/api/radar';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface RadarApiResponse {
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast?: RadarFrame[];
  };
}

interface UseRadarResult {
  frames: RadarFrame[];
  host: string;
  loading: boolean;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  lastUpdate: Date | null;
}

export function useRadar(): UseRadarResult {
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [host, setHost] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRadar = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(RADAR_URL, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: RadarApiResponse = await res.json();

      const pastFrames: RadarFrame[] = Array.isArray(data?.radar?.past) ? data.radar.past : [];
      const nowcastFrames: RadarFrame[] = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : [];
      const allFrames = [...pastFrames, ...nowcastFrames];

      setHost(data?.host ?? '');
      setFrames(allFrames);
      // Auto-advance to the latest frame when new data arrives
      if (allFrames.length > 0) {
        setCurrentIndex(allFrames.length - 1);
      }
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // On error, keep existing frames so the UI remains functional
      console.warn('Radar fetch failed:', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRadar();
    const timer = setInterval(fetchRadar, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchRadar]);

  return { frames, host, loading, currentIndex, setCurrentIndex, lastUpdate };
}
