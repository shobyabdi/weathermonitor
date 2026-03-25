/**
 * useAnomalies
 * Client-side anomaly detection using Welford's online algorithm.
 * Baseline statistics are persisted in localStorage with a 90-day rolling window
 * (approximated via a max-samples cap of 90 * 3 = 270 for tri-daily data cadence).
 */

import { useState, useCallback } from 'react';
import type { AnomalySignal } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'weathermonitor_anomaly_baseline_v1';
const MIN_SAMPLES = 10;
const MAX_SAMPLES = 270; // ~90-day rolling window at tri-daily cadence

// Z-score thresholds → severity tiers
const Z_LOW = 1.5;
const Z_MEDIUM = 2.0;
const Z_HIGH = 3.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Running statistics kept per signal type+region using Welford's algorithm. */
interface WelfordState {
  n: number;       // sample count
  mean: number;    // running mean
  M2: number;      // sum of squared deviations
}

/** The full baseline store saved to localStorage. */
type BaselineStore = Record<string, WelfordState>;

/** Shape of the data snapshot passed to updateBaseline / detectAnomalies. */
export interface AnomalyInputData {
  alertsCount: number;
  earthquakeCount: number;
  fireCount: number;
  /** Optional per-region breakdown. Key = region name, value = alert count. */
  regionAlerts?: Record<string, number>;
  /** Optional per-region fire counts. */
  regionFires?: Record<string, number>;
  /** Optional per-region earthquake counts. */
  regionEarthquakes?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadBaseline(): BaselineStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BaselineStore;
  } catch {
    return {};
  }
}

function saveBaseline(store: BaselineStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

// ---------------------------------------------------------------------------
// Welford helpers
// ---------------------------------------------------------------------------

function welfordUpdate(state: WelfordState, value: number): WelfordState {
  const n = state.n + 1;
  const delta = value - state.mean;
  const mean = state.mean + delta / n;
  const delta2 = value - mean;
  const M2 = state.M2 + delta * delta2;
  return { n, mean, M2 };
}

/**
 * When the sample buffer is full we apply a simple exponential decay to the
 * running stats (equivalent to a soft sliding window) rather than dropping
 * old samples individually, which is expensive with Welford state only.
 */
function welfordDecay(state: WelfordState, decayFactor = 0.99): WelfordState {
  return {
    n: Math.max(MIN_SAMPLES, Math.floor(state.n * decayFactor)),
    mean: state.mean,
    M2: state.M2 * decayFactor,
  };
}

function welfordVariance(state: WelfordState): number {
  if (state.n < 2) return 0;
  return state.M2 / (state.n - 1);
}

function welfordStddev(state: WelfordState): number {
  return Math.sqrt(welfordVariance(state));
}

function computeZScore(value: number, state: WelfordState): number {
  const std = welfordStddev(state);
  if (std < 1e-9) return 0;
  return (value - state.mean) / std;
}

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

function zScoreToSeverity(z: number): AnomalySignal['severity'] {
  const absZ = Math.abs(z);
  if (absZ >= Z_HIGH) return 'critical';
  if (absZ >= Z_MEDIUM) return 'high';
  if (absZ >= Z_LOW) return 'medium';
  return 'low';
}

function buildHumanReadable(signalType: string, region: string, z: number, current: number, mean: number): string {
  const direction = z > 0 ? 'above' : 'below';
  const pct = mean > 0 ? Math.round(Math.abs((current - mean) / mean) * 100) : 0;
  return `${signalType} in ${region} is ${pct}% ${direction} the 90-day baseline (z=${z.toFixed(2)})`;
}

// ---------------------------------------------------------------------------
// Core anomaly detection
// ---------------------------------------------------------------------------

function detectAnomaliesFromStore(
  store: BaselineStore,
  data: AnomalyInputData,
): AnomalySignal[] {
  const signals: AnomalySignal[] = [];

  const checks: Array<{ key: string; signalType: string; region: string; value: number }> = [
    { key: 'global:alertsCount', signalType: 'NWS Alert Count', region: 'National', value: data.alertsCount },
    { key: 'global:earthquakeCount', signalType: 'Earthquake Count', region: 'Global', value: data.earthquakeCount },
    { key: 'global:fireCount', signalType: 'Wildfire Hotspot Count', region: 'Global', value: data.fireCount },
  ];

  // Add per-region checks if provided
  if (data.regionAlerts) {
    for (const [region, count] of Object.entries(data.regionAlerts)) {
      checks.push({ key: `region:alerts:${region}`, signalType: 'Regional Alert Count', region, value: count });
    }
  }
  if (data.regionFires) {
    for (const [region, count] of Object.entries(data.regionFires)) {
      checks.push({ key: `region:fires:${region}`, signalType: 'Regional Fire Count', region, value: count });
    }
  }
  if (data.regionEarthquakes) {
    for (const [region, count] of Object.entries(data.regionEarthquakes)) {
      checks.push({ key: `region:earthquakes:${region}`, signalType: 'Regional Earthquake Count', region, value: count });
    }
  }

  for (const check of checks) {
    const state = store[check.key];
    if (!state || state.n < MIN_SAMPLES) continue;

    const z = computeZScore(check.value, state);
    if (Math.abs(z) < Z_LOW) continue;

    signals.push({
      signal_type: check.signalType,
      region: check.region,
      z_score: parseFloat(z.toFixed(3)),
      current_value: check.value,
      baseline_mean: parseFloat(state.mean.toFixed(2)),
      severity: zScoreToSeverity(z),
      human_readable: buildHumanReadable(check.signalType, check.region, z, check.value, state.mean),
    });
  }

  // Sort by absolute z-score descending
  signals.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));
  return signals;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAnomaliesResult {
  anomalies: AnomalySignal[];
  updateBaseline: (data: AnomalyInputData) => void;
  clearBaseline: () => void;
}

export function useAnomalies(): UseAnomaliesResult {
  const [anomalies, setAnomalies] = useState<AnomalySignal[]>([]);

  const updateBaseline = useCallback((data: AnomalyInputData) => {
    const store = loadBaseline();

    const checks: Array<{ key: string; value: number }> = [
      { key: 'global:alertsCount', value: data.alertsCount },
      { key: 'global:earthquakeCount', value: data.earthquakeCount },
      { key: 'global:fireCount', value: data.fireCount },
    ];

    if (data.regionAlerts) {
      for (const [region, count] of Object.entries(data.regionAlerts)) {
        checks.push({ key: `region:alerts:${region}`, value: count });
      }
    }
    if (data.regionFires) {
      for (const [region, count] of Object.entries(data.regionFires)) {
        checks.push({ key: `region:fires:${region}`, value: count });
      }
    }
    if (data.regionEarthquakes) {
      for (const [region, count] of Object.entries(data.regionEarthquakes)) {
        checks.push({ key: `region:earthquakes:${region}`, value: count });
      }
    }

    for (const { key, value } of checks) {
      let state: WelfordState = store[key] ?? { n: 0, mean: 0, M2: 0 };
      // Apply decay when approaching the rolling window cap
      if (state.n >= MAX_SAMPLES) {
        state = welfordDecay(state);
      }
      store[key] = welfordUpdate(state, value);
    }

    saveBaseline(store);

    // Detect anomalies against the freshly updated store
    const detected = detectAnomaliesFromStore(store, data);
    setAnomalies(detected);
  }, []);

  const clearBaseline = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAnomalies([]);
  }, []);

  return { anomalies, updateBaseline, clearBaseline };
}
