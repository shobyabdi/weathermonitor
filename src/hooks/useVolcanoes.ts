import { useState, useEffect } from 'react';

export interface VolcanoEvent {
  title: string;
  link: string;
  published: string | null;
  summary: string;
  source: string;
  volcano_name: string | null;
}

export function useVolcanoes() {
  const [activity, setActivity] = useState<VolcanoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await window.fetch('/api/volcanoes', { signal: controller.signal });
        if (!res.ok) throw new Error(`Volcanoes ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setActivity(json.activity ?? []); setLoading(false); }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60 * 60 * 1000); // every 60 min
    return () => { cancelled = true; controller.abort(); clearInterval(interval); };
  }, []);

  return { activity, loading };
}
