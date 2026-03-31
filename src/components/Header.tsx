import React from 'react';
import type { Region, TimeFilter, WeatherAlert } from '../types';
import { REGIONS } from '../constants';

interface HeaderProps {
  activeRegion: Region;
  onRegionChange: (region: Region) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  alertCount: number;
  lastUpdate: Date | null;
}

// Time filter fixed to 3h — no UI toggle

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '48px',
    padding: '0 16px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    gap: '16px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  brandIcon: {
    fontSize: '18px',
  },
  brandName: {
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as const,
  },
  brandSub: {
    fontFamily: 'var(--font-body)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  selectWrapper: {
    position: 'relative' as const,
  },
  select: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    padding: '4px 8px',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    minWidth: '140px',
  },
  timeGroup: {
    display: 'flex',
    gap: '2px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '2px',
  },
  timeBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    border: 'none',
  },
  timeBtnActive: {
    background: 'var(--accent-low)',
    color: '#000',
    fontWeight: 600,
  },
  timeBtnInactive: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  alertPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255, 32, 32, 0.15)',
    border: '1px solid rgba(255, 32, 32, 0.4)',
    borderRadius: '12px',
    padding: '2px 10px',
    fontFamily: 'var(--font-numeric)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent-critical)',
  },
  updateTime: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
  },
};

function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export const Header: React.FC<HeaderProps> = ({
  activeRegion,
  onRegionChange,
  timeFilter,
  onTimeFilterChange,
  alertCount,
  lastUpdate,
}) => {
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const region = REGIONS.find(r => r.name === e.target.value);
    if (region) onRegionChange(region);
  };

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <span style={styles.brandIcon} aria-hidden="true">&#x26A1;</span>
        <div>
          <div style={styles.brandName}>Weather Intelligence</div>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.selectWrapper}>
          <select
            style={styles.select}
            value={activeRegion.name}
            onChange={handleRegionChange}
            aria-label="Select region"
          >
            {REGIONS.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

      </div>

      <div style={styles.statusRow}>
        {alertCount > 0 && (
          <div style={styles.alertPill}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-critical)',
                animation: 'blink 1.2s ease-in-out infinite',
              }}
            />
            {alertCount} ACTIVE
          </div>
        )}
        <div style={styles.updateTime}>
          {lastUpdate ? `Updated ${formatTime(lastUpdate)}` : 'Connecting...'}
        </div>
      </div>
    </header>
  );
};

export default Header;
