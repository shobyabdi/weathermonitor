/**
 * WeatherMap.tsx
 * Embeds the Windy.com interactive weather map via iframe.
 * Streamer pins, storm badge, and Claude insight overlay on top of the iframe.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

// ── Streamer definitions (approximate home-base / typical chase area) ──────────

interface Streamer {
  id: string;
  name: string;
  initials: string;
  color: string;
  lat: number;
  lon: number;
  embedSrc: string;
  ytUrl: string;
}

const STREAMERS: Streamer[] = [
  {
    id: 'reed',
    name: 'Reed Timmer',
    initials: 'RT',
    color: '#ff4444',
    lat: 35.22,
    lon: -97.44, // Norman, OK
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCV6hWxB0-u_IX7e-h4fEBAw&autoplay=1&rel=0',
    ytUrl: 'https://www.youtube.com/@ReedTimmerWx/streams',
  },
  {
    id: 'ryan',
    name: "Ryan Hall Y'all",
    initials: 'RH',
    color: '#4488ff',
    lat: 34.73,
    lon: -86.59, // Huntsville, AL
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCJHAT3Uvv-g3I8H3GhHWV7w&autoplay=1&rel=0',
    ytUrl: 'https://www.youtube.com/@RyanHallYall/streams',
  },
  {
    id: 'connor',
    name: 'Connor Croff',
    initials: 'CC',
    color: '#44dd88',
    lat: 37.68,
    lon: -97.34, // Wichita, KS — Connor's typical area
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCb0U1g5r4kH_NDMGiGRhysA&autoplay=1&rel=0',
    ytUrl: 'https://www.youtube.com/@ConnorCroff',
  },
  {
    id: 'live-storms',
    name: 'Live Storms Media',
    initials: 'LS',
    color: '#ff8800',
    lat: 36.15,
    lon: -95.99, // Tulsa, OK
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UC1nJElGcVcTpeZJVyxEbzJw&autoplay=1&rel=0',
    ytUrl: 'https://www.youtube.com/@LiveStormsMedia',
  },
  {
    id: 'brandon',
    name: 'WxChasing',
    initials: 'WX',
    color: '#cc44ff',
    lat: 30.45,
    lon: -91.19, // Baton Rouge, LA — Brandon Clement's base
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCD3KREyo3IqCLBC-4khGgIw&autoplay=1&rel=0',
    ytUrl: 'https://www.youtube.com/@WxChasing',
  },
];

// ── Mercator lat/lon → pixel ──────────────────────────────────────────────────

function latLonToPixel(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  zoom: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const dLon = lon - centerLon;
  const x = w / 2 + (dLon / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const cLatRad = (centerLat * Math.PI) / 180;
  const yM = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const cYM = Math.log(Math.tan(Math.PI / 4 + cLatRad / 2));
  const y = h / 2 - ((yM - cYM) / (2 * Math.PI)) * scale;
  return { x, y };
}

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

// ── Overlay selectors ─────────────────────────────────────────────────────────

const OVERLAYS = [
  { id: 'radar',  label: 'Radar'  },
  { id: 'wind',   label: 'Wind'   },
  { id: 'rain',   label: 'Rain'   },
  { id: 'temp',   label: 'Temp'   },
  { id: 'clouds', label: 'Clouds' },
  { id: 'cape',   label: 'CAPE'   },
];

// ── StreamerPin ───────────────────────────────────────────────────────────────

const StreamerPin: React.FC<{
  streamer: Streamer;
  x: number;
  y: number;
  expanded: boolean;
  onToggle: () => void;
}> = ({ streamer, x, y, expanded, onToggle }) => {
  const PIN = 36;
  const POPUP_W = 280;
  const POPUP_H = 168;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - PIN / 2,
        top: y - PIN / 2,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded YouTube embed popup */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: PIN + 6,
            left: -(POPUP_W / 2 - PIN / 2),
            width: POPUP_W,
            height: POPUP_H + 28,
            background: '#0a0f1a',
            border: `1px solid ${streamer.color}`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: `0 4px 24px rgba(0,0,0,0.7)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-header)', fontSize: 10, color: streamer.color, fontWeight: 700 }}>
              ▶ {streamer.name.toUpperCase()}
            </span>
            <a
              href={streamer.ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#aac4dc', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              Open ↗
            </a>
          </div>
          <iframe
            src={streamer.embedSrc}
            width={POPUP_W}
            height={POPUP_H}
            style={{ display: 'block', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={streamer.name}
          />
        </div>
      )}

      {/* Pin dot */}
      <button
        onClick={onToggle}
        title={streamer.name}
        style={{
          width: PIN,
          height: PIN,
          borderRadius: '50%',
          border: `2px solid ${streamer.color}`,
          background: expanded ? streamer.color : 'rgba(10,15,26,0.92)',
          color: expanded ? '#000' : streamer.color,
          fontFamily: 'var(--font-header)',
          fontSize: 10,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: `0 0 8px ${streamer.color}55`,
          padding: 0,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 9 }}>{streamer.initials}</span>
        {/* Pulsing LIVE dot */}
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#ff2020',
            display: 'block',
          }}
        />
      </button>

      {/* Label below pin */}
      <div
        style={{
          marginTop: 3,
          background: 'rgba(10,15,26,0.82)',
          border: `1px solid ${streamer.color}44`,
          borderRadius: 4,
          padding: '1px 5px',
          fontFamily: 'var(--font-body)',
          fontSize: 8,
          color: streamer.color,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {streamer.name}
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export const WeatherMap: React.FC<WeatherMapProps> = ({ alerts, region, insight }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState('radar');
  const [embedUrl, setEmbedUrl] = useState(() => buildWindyUrl(region, 'radar'));
  const [alertBadgeIndex, setAlertBadgeIndex] = useState(0);
  const [expandedPin, setExpandedPin] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 900, h: 600 });

  // Track container size for pin positioning
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setContainerSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    obs.observe(el);
    setContainerSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => obs.disconnect();
  }, []);

  // Rebuild embed URL when region or overlay changes
  useEffect(() => {
    setEmbedUrl(buildWindyUrl(region, overlay));
    setExpandedPin(null); // close any open popup on region change
  }, [region, overlay]);

  // Rotating storm badge
  const severeAlerts = alerts.filter(
    (a) => a.severity === 'Extreme' || a.severity === 'Severe',
  );
  useEffect(() => {
    if (severeAlerts.length === 0) return;
    const id = setInterval(() => setAlertBadgeIndex(i => (i + 1) % severeAlerts.length), 4000);
    return () => clearInterval(id);
  }, [severeAlerts.length]);
  const badgeAlert = severeAlerts[alertBadgeIndex] ?? null;

  const handleOverlay = useCallback((id: string) => setOverlay(id), []);

  // Compute pin pixel positions from the region's center + zoom
  const [centerLon, centerLat] = region.center;
  const { w, h } = containerSize;

  const pins = STREAMERS.map(s => {
    const { x, y } = latLonToPixel(s.lat, s.lon, centerLat, centerLon, region.zoom, w, h);
    const inBounds = x > -40 && x < w + 40 && y > -40 && y < h + 40;
    return { streamer: s, x, y, inBounds };
  });

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} style={styles.root}>
      {/* Windy iframe */}
      <iframe
        key={embedUrl}
        src={embedUrl}
        style={styles.iframe}
        title="Windy weather map"
        frameBorder="0"
        allow="fullscreen"
        allowFullScreen
      />

      {/* ── OVERLAY: Streamer pins ── */}
      {pins.map(({ streamer, x, y, inBounds }) =>
        inBounds ? (
          <StreamerPin
            key={streamer.id}
            streamer={streamer}
            x={x}
            y={y}
            expanded={expandedPin === streamer.id}
            onToggle={() => setExpandedPin(p => p === streamer.id ? null : streamer.id)}
          />
        ) : null,
      )}

      {/* ── OVERLAY: Storm warning badge (top-left) ── */}
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

      {/* ── OVERLAY: Overlay selector pills (top-centre) ── */}
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

      {/* ── OVERLAY: Claude insight chip (bottom-left) ── */}
      {insight && (
        <div style={styles.insightChip}>
          <span style={styles.insightIcon}>⚡</span>
          <span style={styles.insightText}>{insight.summary.slice(0, 110)}</span>
        </div>
      )}
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
