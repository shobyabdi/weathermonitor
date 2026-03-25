import React, { useState } from 'react';
import type { AnomalySignal } from '../../types';

export interface AnomalySignalsProps {
  signals: AnomalySignal[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(severity: AnomalySignal['severity']): string {
  switch (severity) {
    case 'critical': return '#ff2020';
    case 'high':     return '#ff7b00';
    case 'medium':   return '#f5c518';
    case 'low':      return '#4ab8ff';
  }
}

function severityBg(severity: AnomalySignal['severity']): string {
  switch (severity) {
    case 'critical': return 'rgba(255,32,32,0.10)';
    case 'high':     return 'rgba(255,123,0,0.10)';
    case 'medium':   return 'rgba(245,197,24,0.10)';
    case 'low':      return 'rgba(74,184,255,0.10)';
  }
}

function zScoreLabel(z: number): string {
  const abs = Math.abs(z);
  if (abs >= 4) return 'Extreme';
  if (abs >= 3) return 'Very High';
  if (abs >= 2) return 'High';
  return 'Elevated';
}

function formatSignalType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Signal Card ──────────────────────────────────────────────────────────────

const SignalCard: React.FC<{ signal: AnomalySignal }> = ({ signal }) => {
  const color = severityColor(signal.severity);
  const bg = severityBg(signal.severity);
  const multiplier = signal.baseline_mean > 0
    ? (signal.current_value / signal.baseline_mean).toFixed(1)
    : null;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 5px 5px 0',
        padding: '8px 10px',
        marginBottom: '6px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Top row: signal type + severity badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '11px',
            color,
            letterSpacing: '0.02em',
          }}
        >
          {formatSignalType(signal.signal_type)}
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            fontWeight: 700,
            color,
            background: `${color}22`,
            border: `1px solid ${color}66`,
            borderRadius: '10px',
            padding: '1px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          {zScoreLabel(signal.z_score)}
        </span>
      </div>

      {/* Human-readable description */}
      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          color: '#90afd0',
          lineHeight: 1.55,
          margin: '0 0 6px',
        }}
      >
        {signal.human_readable}
      </p>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Region */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#6a90b8',
          }}
        >
          {signal.region}
        </span>

        {/* Z-score */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#8ab0cc',
          }}
        >
          z={signal.z_score >= 0 ? '+' : ''}{signal.z_score.toFixed(1)}σ
        </span>

        {/* Multiplier */}
        {multiplier && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color,
              fontWeight: 700,
            }}
          >
            {multiplier}× baseline
          </span>
        )}

        {/* Current vs baseline */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#5a7a9a',
            marginLeft: 'auto',
          }}
        >
          {signal.current_value.toFixed(1)} / {signal.baseline_mean.toFixed(1)} avg
        </span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const AnomalySignals: React.FC<AnomalySignalsProps> = ({ signals }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Sort by severity then z-score magnitude
  const severityOrder: Record<AnomalySignal['severity'], number> = {
    critical: 0, high: 1, medium: 2, low: 3,
  };
  const sorted = [...signals].sort((a, b) => {
    const sd = severityOrder[a.severity] - severityOrder[b.severity];
    if (sd !== 0) return sd;
    return Math.abs(b.z_score) - Math.abs(a.z_score);
  });

  return (
    <div
      style={{
        background: '#0d1525',
        borderBottom: '1px solid #1a2d44',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px 8px',
          borderBottom: collapsed ? 'none' : '1px solid #1a2d44',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6a90b8',
            }}
          >
            Anomaly Signals
          </span>
          {sorted.length > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                fontWeight: 700,
                color: sorted.some(s => s.severity === 'critical') ? '#ff2020' : '#ff7b00',
                background: sorted.some(s => s.severity === 'critical') ? 'rgba(255,32,32,0.15)' : 'rgba(255,123,0,0.15)',
                border: `1px solid ${sorted.some(s => s.severity === 'critical') ? '#ff202055' : '#ff7b0055'}`,
                borderRadius: '10px',
                padding: '1px 7px',
              }}
            >
              {sorted.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '16px',
            color: '#6a90b8',
            lineHeight: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
          }}
        >
          ≡
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 12px' }}>
          {sorted.length === 0 ? (
            <div
              style={{
                padding: '12px 0',
                textAlign: 'center',
                color: '#6a90b8',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              No anomaly signals detected
            </div>
          ) : (
            sorted.map((signal, i) => (
              <SignalCard key={`${signal.signal_type}-${signal.region}-${i}`} signal={signal} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AnomalySignals;
