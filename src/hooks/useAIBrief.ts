/**
 * useAIBrief
 * Fetches the global AI weather brief from /api/ai-brief.
 * Polls every 15 minutes. Shows cached content while refreshing so the UI
 * is never blank during background updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const AI_BRIEF_URL = '/api/ai-brief';
const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIBriefResponse {
  brief?: string;
  content?: string;
  text?: string;
  [key: string]: unknown;
}

interface UseAIBriefResult {
  brief: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdate: Date | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAIBrief(): UseAIBriefResult {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track whether this is the very first fetch to gate the loading indicator
  const isFirstFetch = useRef<boolean>(true);

  const fetchBrief = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    // Only show the global loading spinner on the initial fetch so that
    // background refreshes don't cause a flash of the loading state while
    // the previously cached brief is still visible.
    if (isFirstFetch.current) {
      setLoading(true);
    }

    try {
      setError(null);
      const res = await fetch(AI_BRIEF_URL, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data: AIBriefResponse = await res.json();

      // Support multiple possible response shapes from the backend
      const text =
        typeof data.brief === 'string' ? data.brief :
        typeof data.content === 'string' ? data.content :
        typeof data.text === 'string' ? data.text :
        null;

      setBrief(text);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch AI brief';
      setError(message);
      // Preserve existing brief on transient errors
    } finally {
      setLoading(false);
      isFirstFetch.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBrief();
    const timer = setInterval(fetchBrief, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchBrief]);

  return { brief, loading, error, refresh: fetchBrief, lastUpdate };
}
