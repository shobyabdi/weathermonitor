import { useState, useEffect } from 'react';

export interface SPCOutlooks {
  categorical: GeoJSON.FeatureCollection;
  tornado: GeoJSON.FeatureCollection;
  wind: GeoJSON.FeatureCollection;
  hail: GeoJSON.FeatureCollection;
  valid_time: string;
  fetched_at: number;
}

export function useSPCOutlooks() {
  const [outlooks, setOutlooks] = useState<SPCOutlooks | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetch = async () => {
      try {
        const res = await window.fetch('/api/spc-outlooks', { signal: controller.signal });
        if (!res.ok) throw new Error(`SPC ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setOutlooks(data);
          setLastUpdate(new Date());
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    const interval = setInterval(fetch, 30 * 60 * 1000); // every 30 min
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, []);

  return { outlooks, loading, lastUpdate };
}
