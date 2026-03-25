/**
 * useDataFreshness
 * Tracks the freshness status of all data sources by comparing their last
 * update timestamps against the maximum allowed age defined in DATA_FRESHNESS_CONFIG.
 */

import { useState, useEffect, useRef } from 'react';
import type { DataFreshness } from '../types';
import { DATA_FRESHNESS_CONFIG } from '../constants';

// Re-evaluate freshness every 30 seconds
const EVALUATION_INTERVAL_MS = 30 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Map of source names to their last-update timestamps (null = never updated). */
export type LastUpdateMap = Record<string, Date | null>;

export type OverallStatus = 'fresh' | 'degraded' | 'stale';

interface UseDataFreshnessResult {
  sources: DataFreshness[];
  overallStatus: OverallStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evaluateSource(
  sourceName: string,
  lastUpdate: Date | null,
  now: Date,
): DataFreshness {
  const maxAgeMs = DATA_FRESHNESS_CONFIG[sourceName] ?? 5 * 60 * 1000; // default 5 min

  let status: DataFreshness['status'];
  if (lastUpdate === null) {
    status = 'error';
  } else {
    const ageMs = now.getTime() - lastUpdate.getTime();
    status = ageMs <= maxAgeMs ? 'fresh' : 'stale';
  }

  return { source: sourceName, lastUpdate, maxAgeMs, status };
}

function computeOverallStatus(sources: DataFreshness[]): OverallStatus {
  if (sources.length === 0) return 'fresh';

  const staleCount = sources.filter((s) => s.status === 'stale' || s.status === 'error').length;

  if (staleCount === 0) return 'fresh';
  if (staleCount < sources.length) return 'degraded';
  return 'stale';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDataFreshness(lastUpdates: LastUpdateMap): UseDataFreshnessResult {
  const [sources, setSources] = useState<DataFreshness[]>([]);
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('fresh');

  // Keep a stable ref to lastUpdates to avoid triggering the interval setup
  // on every render; we read from the ref inside the interval callback.
  const lastUpdatesRef = useRef<LastUpdateMap>(lastUpdates);
  lastUpdatesRef.current = lastUpdates;

  useEffect(() => {
    function evaluate() {
      const now = new Date();
      const map = lastUpdatesRef.current;

      // Use all keys defined in DATA_FRESHNESS_CONFIG, merging with any extra
      // keys provided by the caller.
      const allKeys = Array.from(
        new Set([...Object.keys(DATA_FRESHNESS_CONFIG), ...Object.keys(map)]),
      );

      const evaluated = allKeys.map((key) =>
        evaluateSource(key, map[key] ?? null, now),
      );

      const overall = computeOverallStatus(evaluated);
      setSources(evaluated);
      setOverallStatus(overall);
    }

    // Run immediately, then on interval
    evaluate();
    const timer = setInterval(evaluate, EVALUATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // intentionally empty — we use the ref to stay current

  return { sources, overallStatus };
}
