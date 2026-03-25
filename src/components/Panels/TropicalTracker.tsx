import React, { useState } from 'react';
import type { TropicalStorm } from '../../types';

export interface TropicalTrackerProps {
  storms: TropicalStorm[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function categoryColor(category: number, intensity: TropicalStorm['intensity']): string {
  if (intensity === 'TD') return '#60d080';
  if (intensity === 'TS') return '#4ab8ff';
  if (category === 1 || category === 2) return '#f5c518';
  if (category === 3 || category === 4) return '#ff7b00';
  if (category >= 5)                    return '#c040ff';
  return '#6a90b8';
}

function categoryLabel(category: number, intensity: TropicalStorm['intensity']): string {
  if (intensity === 'TD') return 'TD';
  if (intensity === 'TS') return 'TS';
  if (category >= 1) return `C${category}`;
  return intensity;
}

function categoryBg(category: number, intensity: TropicalStorm['intensity']): string {
  const c = categoryColor(category, intensity);
  return `${c}22`;
}

function categoryBorder(category: number, intensity: TropicalStorm['intensity']): string {
  const c = categoryColor(category, intensity);
  return `${c}66`;
}

function windCategory(ws: number): string {
  if (ws >= 157) return 'Category 5';
  if (ws >= 130) return 'Category 4';
  if (ws >= 111) return 'Category 3';
  if (ws >= 96)  return 'Category 2';
  if (ws >= 74)  return 'Category 1';
  if (ws >= 39)  return 'Tropical Storm';
  return 'Tropical Depression';
}

// ── Storm Card ───────────────────────────────────────────────────────────────

const StormCard: React.FC<{ storm: TropicalStorm }> = ({ storm }) => {
  const color = categoryColor(storm.category, storm.intensity);
  const label = categoryLabel(storm.category, storm.intensity);
  const bg = categoryBg(storm.category, storm.intensity);
  const border = categoryBorder(storm.category, storm.intensity);

  const lat = storm.lat >= 0 ? `${storm.lat.toFixed(1)}°N` : `${Math.abs(storm.lat).toFixed(1)}°S`;
  const lon = storm.lon >= 0 ? `${storm.lon.toFixed(1)}°E` : `${Math.abs(storm.lon).toFixed(1)}°W`;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 6px 6px 0',
        padding: '9px 11px',
        marginBottom: '6px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Top row: name + category badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '5px',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            color,
            letterSpacing: '0.02em',
          }}
        >
          {storm.name}
        </span>
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '11px',
            color,
            background: `${color}33`,
            border: `1px solid ${color}77`,
            borderRadius: '6px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>

      {/* Intensity description */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: '#8ab0cc',
          marginBottom: '6px',
        }}
      >
        {windCategory(storm.windSpeed)} — {storm.basin}
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
        }}
      >
        {/* Wind speed */}
        <div>
          <div
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#4a6a8a',
              marginBottom: '2px',
            }}
          >
            Winds
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              color,
            }}
          >
            {storm.windSpeed} <span style={{ fontSize: '10px', fontWeight: 400, color: '#6a90b8' }}>mph</span>
          </div>
        </div>

        {/* Pressure */}
        <div>
          <div
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#4a6a8a',
              marginBottom: '2px',
            }}
          >
            Pressure
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              color: '#d0e8ff',
            }}
          >
            {storm.pressure} <span style={{ fontSize: '10px', fontWeight: 400, color: '#6a90b8' }}>mb</span>
          </div>
        </div>

        {/* Location */}
        <div>
          <div
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#4a6a8a',
              marginBottom: '2px',
            }}
          >
            Position
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#8ab0cc',
            }}
          >
            {lat} {lon}
          </div>
        </div>
      </div>

      {/* Movement */}
      {storm.movement && (
        <div
          style={{
            marginTop: '6px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#5a7a9a',
          }}
        >
          Movement: {storm.movement}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const TropicalTracker: React.FC<TropicalTrackerProps> = ({ storms }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Sort by category descending (most dangerous first)
  const sorted = [...storms].sort((a, b) => b.category - a.category || b.windSpeed - a.windSpeed);

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
            Tropical Tracker
          </span>
          {sorted.length > 0 && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                fontWeight: 700,
                color: '#c040ff',
                background: 'rgba(192,64,255,0.15)',
                border: '1px solid rgba(192,64,255,0.4)',
                borderRadius: '10px',
                padding: '1px 7px',
              }}
            >
              {sorted.length} active
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
                padding: '14px 0',
                textAlign: 'center',
                color: '#4a6a8a',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
              }}
            >
              No active tropical systems
            </div>
          ) : (
            sorted.map(storm => (
              <StormCard key={storm.id} storm={storm} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TropicalTracker;
