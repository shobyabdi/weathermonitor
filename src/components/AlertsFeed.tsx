import React, { useState, useMemo } from 'react';
import type { WeatherAlert, TimeFilter } from '../types';

interface AlertsFeedProps {
  alerts: WeatherAlert[];
  onSelectAlert: (alert: WeatherAlert | null) => void;
  selectedAlert: WeatherAlert | null;
  timeFilter: TimeFilter;
}

const SEVERITY_ORDER: Record<WeatherAlert['severity'], number> = {
  Extreme:  0,
  Severe:   1,
  Moderate: 2,
  Minor:    3,
  Unknown:  4,
};

function severityColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme':  return 'var(--accent-critical)';
    case 'Severe':   return 'var(--accent-high)';
    case 'Moderate': return 'var(--accent-medium)';
    case 'Minor':    return 'var(--accent-low)';
    default:         return 'var(--text-secondary)';
  }
}

function severityBorderClass(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme':  return 'border-critical';
    case 'Severe':   return 'border-high';
    case 'Moderate': return 'border-medium';
    case 'Minor':    return 'border-low';
    default:         return '';
  }
}

function timeFilterToMs(tf: TimeFilter): number {
  switch (tf) {
    case '1h':  return 60 * 60 * 1000;
    case '6h':  return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '48h': return 48 * 60 * 60 * 1000;
    case '7d':  return 7 * 24 * 60 * 60 * 1000;
  }
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 8px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  count: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  scrollArea: {
    overflowY: 'auto' as const,
    flex: 1,
    padding: '6px 8px',
  },
  alertCard: {
    background: 'var(--bg-card)',
    borderRadius: '5px',
    padding: '8px 10px',
    marginBottom: '5px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderLeft: '3px solid',
    animation: 'fadeIn 0.2s ease',
    position: 'relative' as const,
  },
  alertCardSelected: {
    background: 'rgba(255,255,255,0.06)',
    outline: '1px solid var(--accent-low)',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3px',
  },
  event: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  severityBadge: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '9px',
    padding: '1px 6px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  area: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  expiryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiry: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
  },
  score: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '10px',
  },
  emptyState: {
    padding: '20px 12px',
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontStyle: 'italic' as const,
  },
  filterBar: {
    display: 'flex',
    gap: '4px',
    padding: '6px 8px',
    flexShrink: 0,
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap' as const,
  },
  filterBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

const SEVERITY_FILTERS = ['All', 'Extreme', 'Severe', 'Moderate', 'Minor'] as const;
type SeverityFilter = typeof SEVERITY_FILTERS[number];

export const AlertsFeed: React.FC<AlertsFeedProps> = ({
  alerts,
  onSelectAlert,
  selectedAlert,
  timeFilter,
}) => {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');

  const filtered = useMemo(() => {
    const cutoff = Date.now() - timeFilterToMs(timeFilter);
    return alerts
      .filter(a => {
        const onset = new Date(a.onset).getTime();
        if (!isNaN(onset) && onset < cutoff) return false;
        if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
        return true;
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [alerts, timeFilter, severityFilter]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: filtered.length > 0 ? 'var(--accent-critical)' : 'var(--text-secondary)',
              animation: filtered.length > 0 ? 'blink 1.2s ease-in-out infinite' : 'none',
            }}
          />
          Active Alerts
        </div>
        <span style={styles.count}>{filtered.length}</span>
      </div>

      <div style={styles.filterBar}>
        {SEVERITY_FILTERS.map(sf => {
          const isActive = sf === severityFilter;
          const color = sf === 'All' ? 'var(--text-secondary)' : severityColor(sf as WeatherAlert['severity']);
          return (
            <button
              key={sf}
              style={{
                ...styles.filterBtn,
                background: isActive ? `${color}22` : 'transparent',
                borderColor: isActive ? color : 'var(--border)',
                color: isActive ? color : 'var(--text-secondary)',
              }}
              onClick={() => setSeverityFilter(sf)}
            >
              {sf}
            </button>
          );
        })}
      </div>

      <div style={styles.scrollArea} className="scroll-y">
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>No active alerts match current filters</div>
        ) : (
          filtered.map(alert => {
            const color = severityColor(alert.severity);
            const isSelected = selectedAlert?.id === alert.id;
            return (
              <div
                key={alert.id}
                className={severityBorderClass(alert.severity)}
                style={{
                  ...styles.alertCard,
                  borderLeftColor: color,
                  ...(isSelected ? styles.alertCardSelected : {}),
                }}
                onClick={() => onSelectAlert(isSelected ? null : alert)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlert(isSelected ? null : alert);
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`${alert.event}: ${alert.areaDesc}`}
              >
                <div style={styles.eventRow}>
                  <span style={{ ...styles.event, color }}>
                    {alert.event}
                  </span>
                  <span style={{ ...styles.severityBadge, color }}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <div style={styles.area} title={alert.areaDesc}>
                  {alert.areaDesc}
                </div>
                <div style={styles.expiryRow}>
                  <span style={styles.expiry}>{formatExpiry(alert.expires)}</span>
                  {alert.storm_score !== undefined && (
                    <span
                      style={{
                        ...styles.score,
                        color: alert.storm_score >= 70
                          ? 'var(--accent-critical)'
                          : alert.storm_score >= 50
                          ? 'var(--accent-high)'
                          : 'var(--text-secondary)',
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
