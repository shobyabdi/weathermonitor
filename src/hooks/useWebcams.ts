import { useState, useEffect } from 'react';
import type { Region } from '../types';

export interface Webcam {
  id: string;
  title: string;
  city: string;
  thumbnail: string;
  embed: string;
  lat: number | null;
  lon: number | null;
}

const POLL_INTERVAL = 15 * 60 * 1000;

export function useWebcams(region: Region): Webcam[] {
  const [webcams, setWebcams] = useState<Webcam[]>([]);

  useEffect(() => {
    let cancelled = false;
    const [lon, lat] = region.center;

    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/webcams?lat=${lat}&lon=${lon}&radius=80&limit=12`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setWebcams(data.webcams ?? []);
      } catch {
        // silent
      }
    };

    fetch_();
    const timer = setInterval(fetch_, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(timer); };
  }, [region]);

  return webcams;
}
