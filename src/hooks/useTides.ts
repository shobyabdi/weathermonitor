import { useState, useEffect } from 'react';

export interface TideStation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  current_level_ft: number | null;
  mean_level_ft: number | null;
  deviation_ft: number | null;
  status: 'normal' | 'elevated' | 'high' | 'flood';
  predictions: Array<{ t: string; v: number }>;
  fetched_at: number;
}

export function useTides() {
  const [stations, setStations] = useState<TideStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await window.fetch('/api/tides', { signal: controller.signal });
        if (!res.ok) throw new Error(`Tides ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setStations(json.stations ?? []); setLoading(false); }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30 * 60 * 1000); // every 30 min
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, []);

  return { stations, loading };
}
