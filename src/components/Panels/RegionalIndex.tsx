import React, { useState } from 'react';
import type { RegionalScore } from '../../types';

export interface RegionalIndexProps {
  scores: RegionalScore[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score > 80) return '#ff2020';
  if (score > 60) return '#ff7b00';
  if (score > 30) return '#f5c518';
  return '#60d080';
}

function trendArrow(trend: RegionalScore['trend']): string {
  switch (trend) {
    case 'rising':  return '↑';
    case 'falling': return '↓';
    default:        return '→';
  }
}

function trendColor(trend: RegionalScore['trend']): string {
  switch (trend) {
    case 'rising':  return '#ff7b00';
    case 'falling': return '#60d080';
    default:        return '#6a90b8';
  }
}

// ── ScoreRow ─────────────────────────────────────────────────────────────────

const ScoreRow: React.FC<{ region: RegionalScore }> = ({ region }) => {
  const color = scoreColor(region.score);
  const arrow = trendArrow(region.trend);
  const arrowColor = trendColor(region.trend);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 36px 80px 20px',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        borderBottom: '1px solid #0d1a2a',
      }}
    >
      {/* Region name */}
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: '#90afd0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={region.region}
      >
        {region.region}
      </span>

      {/* Numeric score */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          fontWeight: 700,
          color,
          textAlign: 'right',
        }}
      >
        {Math.round(region.score)}
      </span>

      {/* Progress bar */}
      <div
        style={{
          height: '5px',
          borderRadius: '3px',
          background: '#0a1525',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, region.score)}%`,
            background: color,
            borderRadius: '3px',
            transition: 'width 0.4s ease',
            boxShadow: `0 0 4px ${color}88`,
          }}
        />
      </div>

      {/* Trend arrow */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: arrowColor,
          textAlign: 'center',
        }}
        title={region.trend}
      >
        {arrow}
      </span>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const RegionalIndex: React.FC<RegionalIndexProps> = ({ scores }) => {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

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
          Regional Weather Index
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#4a6a8a',
            }}
          >
            Top {sorted.length}
          </span>
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
      </div>

      {!collapsed && (
        <div style={{ padding: '4px 14px 8px' }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 36px 80px 20px',
              gap: '8px',
              padding: '4px 0 2px',
            }}
          >
            {['Region', 'RWI', 'Index', 'Trend'].map(h => (
              <span
                key={h}
                style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#4a6a8a',
                  textAlign: h === 'RWI' || h === 'Trend' ? 'right' : 'left',
                }}
              >
                {h}
              </span>
            ))}
          </div>

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
              No regional data
            </div>
          ) : (
            sorted.map(region => (
              <ScoreRow key={region.region} region={region} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RegionalIndex;
