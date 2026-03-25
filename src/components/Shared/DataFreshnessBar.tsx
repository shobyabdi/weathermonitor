import React, { useState } from 'react';

export interface DataFreshnessSource {
  name: string;
  lastUpdate: Date | null;
  maxAgeMs: number;
}

export interface DataFreshnessBarProps {
  sources: DataFreshnessSource[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type FreshnessStatus = 'fresh' | 'aging' | 'stale';

function getStatus(lastUpdate: Date | null, maxAgeMs: number): FreshnessStatus {
  if (!lastUpdate) return 'stale';
  const ageMs = Date.now() - lastUpdate.getTime();
  if (ageMs < maxAgeMs * 0.6) return 'fresh';
  if (ageMs < maxAgeMs)       return 'aging';
  return 'stale';
}

function formatAge(lastUpdate: Date | null): string {
  if (!lastUpdate) return 'No data';
  const ageMs = Date.now() - lastUpdate.getTime();
  const secs = Math.floor(ageMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

const STATUS_COLORS: Record<FreshnessStatus, string> = {
  fresh: '#60d080',
  aging: '#f5c518',
  stale: '#ff2020',
};

const STATUS_GLOW: Record<FreshnessStatus, string> = {
  fresh: 'rgba(96,208,128,0.5)',
  aging: 'rgba(245,197,24,0.5)',
  stale: 'rgba(255,32,32,0.5)',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const DataFreshnessBar: React.FC<DataFreshnessBarProps> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  const overallStatus: FreshnessStatus = sources.some(s => getStatus(s.lastUpdate, s.maxAgeMs) === 'stale')
    ? 'stale'
    : sources.some(s => getStatus(s.lastUpdate, s.maxAgeMs) === 'aging')
    ? 'aging'
    : 'fresh';

  return (
    <div
      style={{
        backgroundColor: '#080e18',
        borderTop: '1px solid #1a2d44',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        userSelect: 'none',
      }}
    >
      {/* ── Slim summary bar ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(ex => !ex);
          }
        }}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 12px',
          cursor: 'pointer',
        }}
      >
        {/* "DATA" label */}
        <span
          style={{
            color: '#4a6a8a',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginRight: '3px',
            flexShrink: 0,
          }}
        >
          DATA
        </span>

        {/* Dot indicators */}
        {sources.map(src => {
          const status = getStatus(src.lastUpdate, src.maxAgeMs);
          return (
            <span
              key={src.name}
              title={`${src.name}: ${formatAge(src.lastUpdate)}`}
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: STATUS_COLORS[status],
                boxShadow: `0 0 4px ${STATUS_GLOW[status]}`,
                flexShrink: 0,
              }}
            />
          );
        })}

        {/* Overall status label */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: STATUS_COLORS[overallStatus],
            marginLeft: '4px',
          }}
        >
          {overallStatus.toUpperCase()}
        </span>

        {/* Expand chevron */}
        <span
          style={{
            marginLeft: 'auto',
            color: '#3a5a7a',
            fontSize: '9px',
          }}
        >
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* ── Expanded detail list ── */}
      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '4px 12px',
            padding: '6px 12px 10px',
            borderTop: '1px solid #1a2d44',
          }}
        >
          {sources.map(src => {
            const status = getStatus(src.lastUpdate, src.maxAgeMs);
            return (
              <div
                key={src.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                }}
              >
                {/* Status dot */}
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: STATUS_COLORS[status],
                    flexShrink: 0,
                  }}
                />
                {/* Source name */}
                <span
                  style={{
                    color: '#8ab0cc',
                    fontSize: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {src.name}
                </span>
                {/* Age */}
                <span
                  style={{
                    color: STATUS_COLORS[status],
                    fontSize: '10px',
                    fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatAge(src.lastUpdate)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DataFreshnessBar;
