import React, { useMemo, useState } from 'react';
import type { WeatherAlert } from '../../types';

export interface AlertsFeedProps {
  alerts: WeatherAlert[];
  onSelectAlert: (alert: WeatherAlert) => void;
  selectedAlert: WeatherAlert | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<WeatherAlert['severity'], number> = {
  Extreme:  0,
  Severe:   1,
  Moderate: 2,
  Minor:    3,
  Unknown:  4,
};

function severityBorderColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme':  return '#ff2020';
    case 'Severe':   return '#ff7b00';
    case 'Moderate': return '#f5c518';
    case 'Minor':    return '#4ab8ff';
    default:         return '#6a90b8';
  }
}

function severityTextColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme':  return '#ff2020';
    case 'Severe':   return '#ff7b00';
    case 'Moderate': return '#f5c518';
    case 'Minor':    return '#4ab8ff';
    default:         return '#6a90b8';
  }
}

function formatTimeRemaining(expires: string): string {
  const d = new Date(expires);
  if (isNaN(d.getTime())) return '';
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `Expires in ${h}h ${m}m`;
  return `Expires in ${m}m`;
}

// ── Component ────────────────────────────────────────────────────────────────

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onSelectAlert,
  selectedAlert,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (severityDiff !== 0) return severityDiff;
        // Secondary: soonest expiry first
        return new Date(a.expires).getTime() - new Date(b.expires).getTime();
      }),
    [alerts],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1525',
        borderBottom: '1px solid #1a2d44',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px 8px',
          borderBottom: '1px solid #1a2d44',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Blinking dot */}
          <span
            style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: sorted.length > 0 ? '#ff2020' : '#6a90b8',
              animation: sorted.length > 0 ? 'blink 1.2s ease-in-out infinite' : 'none',
              flexShrink: 0,
            }}
          />
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
            Active Alerts
          </span>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            color: sorted.length > 0 ? '#ff7b00' : '#6a90b8',
          }}
        >
          {sorted.length} Active Alerts
        </span>
      </div>

      {/* Scrollable list */}
      <div
        className="scroll-y"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 10px',
        }}
      >
        {sorted.length === 0 ? (
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              color: '#6a90b8',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            No active alerts
          </div>
        ) : (
          sorted.map(alert => {
            const borderColor = severityBorderColor(alert.severity);
            const textColor = severityTextColor(alert.severity);
            const isSelected = selectedAlert?.id === alert.id;
            const isHovered = hoveredId === alert.id;
            const timeStr = formatTimeRemaining(alert.expires);

            return (
              <div
                key={alert.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${alert.event}: ${alert.areaDesc}`}
                onClick={() => onSelectAlert(alert)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlert(alert);
                  }
                }}
                onMouseEnter={() => setHoveredId(alert.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: isSelected
                    ? 'rgba(74,184,255,0.07)'
                    : isHovered
                    ? 'rgba(255,255,255,0.04)'
                    : '#111d2e',
                  borderLeft: `3px solid ${borderColor}`,
                  borderRadius: '0 5px 5px 0',
                  padding: '8px 10px',
                  marginBottom: '5px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  outline: isSelected ? `1px solid ${borderColor}44` : 'none',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {/* Top row: event + severity pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '3px',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Chakra Petch', sans-serif",
                      fontWeight: 700,
                      fontSize: '11px',
                      letterSpacing: '0.02em',
                      color: textColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {alert.event}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: `${borderColor}22`,
                      border: `1px solid ${borderColor}88`,
                      color: textColor,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>

                {/* Area */}
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: '#6a90b8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px',
                  }}
                  title={alert.areaDesc}
                >
                  {alert.areaDesc}
                </div>

                {/* Footer: time pill + storm score */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  {timeStr && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        color: '#4a6a8a',
                        background: '#0a1525',
                        border: '1px solid #1a2d44',
                        borderRadius: '10px',
                        padding: '1px 7px',
                      }}
                    >
                      {timeStr}
                    </span>
                  )}
                  {alert.storm_score !== undefined && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        color:
                          alert.storm_score >= 70
                            ? '#ff2020'
                            : alert.storm_score >= 50
                            ? '#ff7b00'
                            : '#6a90b8',
                      }}
                    >
                      Score: {alert.storm_score}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsFeed;
