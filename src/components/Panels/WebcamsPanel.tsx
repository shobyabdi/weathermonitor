import React, { useState, useEffect, useCallback } from 'react';
import type { Region } from '../../types';

interface Webcam {
  title: string;
  url: string;
  description: string;
}

interface WebcamsPanelProps {
  region: Region;
}

export const WebcamsPanel: React.FC<WebcamsPanelProps> = ({ region }) => {
  const [webcams, setWebcams] = useState<Webcam[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastRegion, setLastRegion] = useState('');

  const fetchWebcams = useCallback(async (regionName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/webcams?region=${encodeURIComponent(regionName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWebcams(data.webcams ?? []);
      setLastRegion(regionName);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (region.name !== lastRegion) {
      fetchWebcams(region.name);
    }
  }, [region.name, lastRegion, fetchWebcams]);

  return (
    <div style={styles.root}>
      <button onClick={() => setCollapsed(c => !c)} style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>📷</span>
          <span style={styles.headerLabel}>Live Webcams</span>
          {!loading && webcams.length > 0 && (
            <span style={styles.count}>{webcams.length} found</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); fetchWebcams(region.name); }}
            style={styles.refreshBtn}
            disabled={loading}
            title="Refresh webcam suggestions"
          >
            {loading ? '...' : '↻'}
          </button>
          <span style={{ ...styles.chevron, transform: collapsed ? 'rotate(-90deg)' : 'none' }}>▾</span>
        </div>
      </button>

      {!collapsed && (
        <div style={styles.list}>
          {loading ? (
            <div style={styles.status}>Searching for webcams in {region.name}...</div>
          ) : webcams.length === 0 ? (
            <div style={styles.status}>No webcams found. Try refreshing.</div>
          ) : (
            webcams.map((w, i) => (
              <a
                key={i}
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.item}
              >
                <div style={styles.itemTitle}>{w.title}</div>
                {w.description && (
                  <div style={styles.itemDesc}>{w.description}</div>
                )}
                <div style={styles.itemUrl}>{w.url}</div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg-panel)',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 14px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 13,
  },
  headerLabel: {
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  count: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
  chevron: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    transition: 'transform 0.2s',
  },
  refreshBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
    padding: '1px 6px',
    lineHeight: 1.4,
  },
  list: {
    maxHeight: 260,
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  status: {
    padding: '12px 14px',
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontStyle: 'italic' as const,
  },
  item: {
    display: 'block',
    padding: '8px 14px',
    borderBottom: '1px solid var(--border)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  itemTitle: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  itemDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  itemUrl: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 9,
    color: 'var(--accent-low)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

export default WebcamsPanel;
