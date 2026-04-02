/**
 * WeatherMap.tsx
 * Embeds the Windy.com interactive weather map via iframe.
 * Fixed streamer dock, storm badge, and Claude insight overlay on top of the iframe.
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { WeatherAlert, Region, ClaudeInsight } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeatherMapProps {
  alerts: WeatherAlert[];
  region: Region;
  insight: ClaudeInsight | null;
  selectedAlert: WeatherAlert | null;
  onAlertClick: (alert: WeatherAlert) => void;
  activeLayers?: Set<string>;
  earthquakes?: unknown[];
  wildfires?: unknown[];
  tropicalStorms?: unknown[];
  radarFrames?: unknown[];
  radarHost?: string;
}

// ── Streamers ─────────────────────────────────────────────────────────────────

interface Streamer {
  id: string;
  name: string;
  initials: string;
  color: string;
  location: string;
  ytUrl: string;
  embedSrc: string;
}

const STREAMERS: Streamer[] = [
  {
    id: 'featured',
    name: 'Featured Live',
    initials: '⚡',
    color: '#ffdd00',
    location: 'Live',
    ytUrl: 'https://www.youtube.com/watch?v=WgS3j51gzs8',
    embedSrc: 'https://www.youtube.com/embed/WgS3j51gzs8?autoplay=1&rel=0',
  },
  {
    id: 'reed',
    name: 'Reed Timmer',
    initials: 'RT',
    color: '#ff4444',
    location: 'Norman, OK',
    ytUrl: 'https://www.youtube.com/@ReedTimmerWx/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCV6hWxB0-u_IX7e-h4fEBAw&autoplay=1&rel=0',
  },
  {
    id: 'ryan',
    name: "Ryan Hall Y'all",
    initials: 'RH',
    color: '#4488ff',
    location: 'Huntsville, AL',
    ytUrl: 'https://www.youtube.com/@RyanHallYall/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCJHAT3Uvv-g3I8H3GhHWV7w&autoplay=1&rel=0',
  },
  {
    id: 'connor',
    name: 'Connor Croff',
    initials: 'CC',
    color: '#44dd88',
    location: 'Wichita, KS',
    ytUrl: 'https://www.youtube.com/@ConnorCroff/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCb0U1g5r4kH_NDMGiGRhysA&autoplay=1&rel=0',
  },
  {
    id: 'live-storms',
    name: 'Live Storms',
    initials: 'LS',
    color: '#ff8800',
    location: 'Tulsa, OK',
    ytUrl: 'https://www.youtube.com/@LiveStormsMedia/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UC1nJElGcVcTpeZJVyxEbzJw&autoplay=1&rel=0',
  },
  {
    id: 'brandon',
    name: 'WxChasing',
    initials: 'WX',
    color: '#cc44ff',
    location: 'Baton Rouge, LA',
    ytUrl: 'https://www.youtube.com/@WxChasing/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCD3KREyo3IqCLBC-4khGgIw&autoplay=1&rel=0',
  },
  {
    id: 'nbc5',
    name: 'NBC5 Chicago',
    initials: 'N5',
    color: '#00aaff',
    location: 'Chicago, IL',
    ytUrl: 'https://www.youtube.com/@nbcchicago/streams',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCuJCUEDQFRSHBHHsLFMcGQg&autoplay=1&rel=0',
  },
];

// ── Windy embed URL builder ────────────────────────────────────────────────────

function buildWindyUrl(region: Region, overlay = 'radar'): string {
  const [lon, lat] = region.center;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    zoom: String(region.zoom),
    level: 'surface',
    overlay,
    product: 'ecmwf',
    menu: '',
    message: '',
    marker: '',
    calendar: 'now',
    pressure: '',
    type: 'map',
    location: 'coordinates',
    metricWind: 'default',
    metricTemp: 'default',
    radarRange: '-1',
  });
  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityBadgeColor(severity: string): string {
  switch (severity) {
    case 'Extreme':  return '#ff2020';
    case 'Severe':   return '#ff7b00';
    case 'Moderate': return '#f5c518';
    case 'Minor':    return '#4ab8ff';
    default:         return '#6a90b8';
  }
}

const OVERLAYS = [
  { id: 'radar',  label: 'Radar'  },
  { id: 'wind',   label: 'Wind'   },
  { id: 'rain',   label: 'Rain'   },
  { id: 'temp',   label: 'Temp'   },
  { id: 'clouds', label: 'Clouds' },
  { id: 'cape',   label: 'CAPE'   },
];

// ── StreamerDock ──────────────────────────────────────────────────────────────

const StreamerDock: React.FC<{
  streamers: Streamer[];
  expanded: string | null;
  onToggle: (id: string) => void;
}> = ({ streamers, expanded, onToggle }) => {
  const POPUP_W = 320;

  return (
    <div style={dockStyles.dock}>
      {streamers.map(s => (
        <div key={s.id} style={dockStyles.item}>
          {/* Expanded popup — opens to the left */}
          {expanded === s.id && (
            <div style={{
              position: 'absolute',
              right: 48,
              top: '50%',
              transform: 'translateY(-50%)',
              width: POPUP_W,
              background: '#0a0f1a',
              border: `1px solid ${s.color}`,
              borderRadius: 8,
              boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
              zIndex: 40,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px' }}>
                <div style={{ fontFamily: 'var(--font-header)', fontSize: 10, color: s.color, fontWeight: 700 }}>
                  {s.name.toUpperCase()}
                </div>
                <a
                  href={s.ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#aac4dc', textDecoration: 'none' }}
                >
                  ↗ YT
                </a>
              </div>
              {/* Embed */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                <iframe
                  src={s.embedSrc}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={s.name}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Pin button */}
          <button
            onClick={() => onToggle(s.id)}
            title={s.name}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: `2px solid ${s.color}`,
              background: expanded === s.id ? s.color : 'rgba(10,15,26,0.92)',
              color: expanded === s.id ? '#000' : s.color,
              fontFamily: 'var(--font-header)',
              fontSize: 9,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              boxShadow: `0 0 8px ${s.color}44`,
              padding: 0,
              position: 'relative',
              zIndex: 41,
            }}
          >
            <span>{s.initials}</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff2020', display: 'block' }} />
          </button>
        </div>
      ))}
    </div>
  );
};

const dockStyles: Record<string, React.CSSProperties> = {
  dock: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'auto',
  },
  item: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const WeatherMap: React.FC<WeatherMapProps> = ({ alerts, region, insight }) => {
  const [overlay, setOverlay] = useState('radar');
  const [embedUrl, setEmbedUrl] = useState(() => buildWindyUrl(region, 'radar'));
  const [alertBadgeIndex, setAlertBadgeIndex] = useState(0);
  const [expandedPin, setExpandedPin] = useState<string | null>(null);

  useEffect(() => {
    setEmbedUrl(buildWindyUrl(region, overlay));
    setExpandedPin(null);
  }, [region, overlay]);

  const severeAlerts = alerts.filter(a => a.severity === 'Extreme' || a.severity === 'Severe');
  useEffect(() => {
    if (severeAlerts.length === 0) return;
    const id = setInterval(() => setAlertBadgeIndex(i => (i + 1) % severeAlerts.length), 4000);
    return () => clearInterval(id);
  }, [severeAlerts.length]);
  const badgeAlert = severeAlerts[alertBadgeIndex] ?? null;

  const handleOverlay = useCallback((id: string) => setOverlay(id), []);
  const handleTogglePin = useCallback((id: string) => {
    setExpandedPin(p => p === id ? null : id);
  }, []);

  return (
    <div style={styles.root}>
      <iframe
        key={embedUrl}
        src={embedUrl}
        style={styles.iframe}
        title="Windy weather map"
        frameBorder="0"
        allow="fullscreen"
        allowFullScreen
      />

      {/* ── Streamer dock (fixed right side) ── */}
      <StreamerDock
        streamers={STREAMERS}
        expanded={expandedPin}
        onToggle={handleTogglePin}
      />

      {/* ── Storm warning badge (top-left) ── */}
      {badgeAlert && (
        <div style={styles.stormBadge}>
          <div style={styles.stormBadgePulse} />
          <div style={styles.stormBadgeInner}>
            <span style={styles.stormBadgeType}>⚠ {badgeAlert.event.toUpperCase()}</span>
            <span style={styles.stormBadgeArea}>{badgeAlert.areaDesc}</span>
            <span style={{ ...styles.stormBadgeSeverity, color: severityBadgeColor(badgeAlert.severity) }}>
              {badgeAlert.severity.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* ── Overlay selector pills (top-centre) ── */}
      <div style={styles.overlayBar}>
        {OVERLAYS.map(o => (
          <button
            key={o.id}
            onClick={() => handleOverlay(o.id)}
            style={{ ...styles.overlayBtn, ...(overlay === o.id ? styles.overlayBtnActive : {}) }}
          >
            {o.label}
          </button>
        ))}
      </div>

    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#0a0f1a',
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  stormBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    maxWidth: 240,
    pointerEvents: 'none',
  },
  stormBadgePulse: {
    position: 'absolute',
    inset: -4,
    borderRadius: 10,
    border: '2px solid #ff2020',
    opacity: 0.5,
  },
  stormBadgeInner: {
    background: 'rgba(10, 15, 26, 0.96)',
    border: '1px solid #ff2020',
    borderRadius: 6,
    padding: '7px 10px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  stormBadgeType: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 700,
    color: '#ff2020',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  stormBadgeArea: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  stormBadgeSeverity: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  overlayBar: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    display: 'flex',
    gap: 4,
    background: 'rgba(10, 15, 26, 0.88)',
    border: '1px solid #1a2d44',
    borderRadius: 8,
    padding: '4px 6px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  overlayBtn: {
    padding: '3px 10px',
    borderRadius: 5,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  overlayBtnActive: {
    background: 'var(--accent)',
    color: '#000',
    fontWeight: 700,
  },
  insightChip: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    zIndex: 20,
    background: 'rgba(10, 15, 26, 0.94)',
    border: '1px solid #1a2d44',
    borderLeft: '3px solid #f5c518',
    borderRadius: 5,
    padding: '5px 10px',
    maxWidth: 280,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    pointerEvents: 'none',
  },
  insightIcon: {
    fontSize: 13,
    color: '#f5c518',
    flexShrink: 0,
    marginTop: 1,
  },
  insightText: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
};

export default WeatherMap;
