import { useState, useEffect } from 'react';

export interface SpaceWeather {
  kp_index: number;
  kp_level: 'quiet' | 'unsettled' | 'active' | 'storm' | 'severe_storm' | 'extreme';
  solar_wind_speed_kms: number | null;
  active_alerts: Array<{ message: string; issued: string }>;
  grid_risk: boolean;
  aurora_visible: boolean;
  fetched_at: number;
}

export function useSpaceWeather() {
  const [data, setData] = useState<SpaceWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await window.fetch('/api/space-weather', { signal: controller.signal });
        if (!res.ok) throw new Error(`SWPC ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setData(json); setLoading(false); }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // every 15 min
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, []);

  return { data, loading };
}
