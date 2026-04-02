import React, { useState } from 'react';
import type { WeatherAlert } from '../types';

interface Props {
  alerts: WeatherAlert[];
  lastUpdate: Date | null;
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; bgExpanded: string }> = {
  Extreme: { bg: '#3d0000', border: '#ff2d2d', text: '#ff6b6b', bgExpanded: '#2a0000' },
  Severe:  { bg: '#3d1a00', border: '#ff7b00', text: '#ffaa55', bgExpanded: '#2a1000' },
  Moderate:{ bg: '#2d2600', border: '#ccaa00', text: '#ffdd44', bgExpanded: '#1e1a00' },
  Minor:   { bg: '#001a2d', border: '#0077cc', text: '#44aaff', bgExpanded: '#001020' },
  Unknown: { bg: '#1a1a2d', border: '#666699', text: '#aaaacc', bgExpanded: '#111120' },
};

const SEVERITY_ORDER = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];

function sortBySeverity(alerts: WeatherAlert[]): WeatherAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

function AlertRow({ alert, onDismiss }: { alert: WeatherAlert; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.Unknown;

  return (
    <div style={{ borderBottom: `2px solid ${colors.border}`, fontFamily: 'var(--font-body)' }}>
      {/* Summary row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 14px',
          background: colors.bg,
          cursor: 'pointer',
        }}
      >
        {/* Severity pill */}
        <span style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: colors.border,
          border: `1px solid ${colors.border}`,
          borderRadius: 3,
          padding: '1px 6px',
        }}>
          {alert.severity}
        </span>

        {/* Event type */}
        <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 13, color: colors.text }}>
          {alert.event}
        </span>

        {/* Headline */}
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.headline}
        </span>

        {/* Expires */}
        {alert.expires && (
          <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
            Until {new Date(alert.expires).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {/* Expand chevron */}
        <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>

        {/* Dismiss */}
        <button
          onClick={e => { e.stopPropagation(); onDismiss(); }}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ background: colors.bgExpanded, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alert.areaDesc && (
            <div style={{ fontSize: 11, color: colors.text, fontWeight: 600 }}>
              📍 {alert.areaDesc}
            </div>
          )}
          {alert.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {alert.description}
            </div>
          )}
          {alert.instruction && (
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '8px 10px', borderLeft: `3px solid ${colors.border}` }}>
              <span style={{ fontWeight: 700, color: colors.text }}>⚠ Instructions: </span>
              {alert.instruction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WarningBanner({ alerts, lastUpdate }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const active = sortBySeverity(alerts).filter(
    a => !dismissed.has(a.id) && (a.severity === 'Extreme' || a.severity === 'Severe')
  );

  const pollNote = lastUpdate
    ? `Polling every 2 min · Last checked ${lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Polling every 2 min';

  if (active.length === 0) return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 14px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
      <span>No current active alerts</span>
      <span style={{ fontSize: 10 }}>{pollNote}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', zIndex: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 14px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-secondary)' }}>
        {pollNote}
      </div>
      {active.map(alert => (
        <AlertRow
          key={alert.id}
          alert={alert}
          onDismiss={() => setDismissed(prev => new Set([...prev, alert.id]))}
        />
      ))}
    </div>
  );
}
