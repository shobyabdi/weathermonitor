/**
 * WeatherMap.tsx
 * Main MapLibre GL JS map component for the Weather Intelligence Dashboard.
 *
 * Renders:
 *  - Carto dark basemap
 *  - RainViewer radar tiles
 *  - NWS alert polygons (colour-coded by event type)
 *  - Earthquake circles
 *  - Wildfire dots
 *  - Tropical storm tracks / centres
 *  - Absolute-positioned HUD overlays
 *  - RadarPlayer timeline at the bottom
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import type {
  WeatherAlert,
  Earthquake,
  Wildfire,
  TropicalStorm,
  RadarFrame,
  LayerId,
  Region,
  ClaudeInsight,
} from '@/types';

import { addAlertsLayer, updateAlertsLayer, removeAlertsLayer } from './layers/AlertsLayer';
import { addRadarLayer, updateRadarTime, removeRadarLayer } from './layers/RadarLayer';
import { addEarthquakeLayer, updateEarthquakeLayer, removeEarthquakeLayer } from './layers/EarthquakeLayer';
import { addFireLayer, updateFireLayer, removeFireLayer } from './layers/FireLayer';
import { addTropicalLayer, updateTropicalLayer, removeTropicalLayer } from './layers/TropicalLayer';
import { RadarPlayer } from './RadarPlayer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeatherMapProps {
  alerts: WeatherAlert[];
  earthquakes: Earthquake[];
  wildfires: Wildfire[];
  tropicalStorms: TropicalStorm[];
  radarFrames: RadarFrame[];
  radarHost: string;
  activeLayers: Set<LayerId>;
  selectedAlert: WeatherAlert | null;
  onAlertClick: (alert: WeatherAlert) => void;
  region: Region;
  insight: ClaudeInsight | null;
}

// ── MapLibre style (Carto dark, no API key needed) ────────────────────────────

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-light',
      type: 'raster',
      source: 'carto-light',
    },
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function severityBadgeColor(severity: string): string {
  switch (severity) {
    case 'Extreme':  return '#ff2020';
    case 'Severe':   return '#ff7b00';
    case 'Moderate': return '#f5c518';
    case 'Minor':    return '#4ab8ff';
    default:         return '#6a90b8';
  }
}

// ── Fake ambient weather strip (placeholder until real data wired) ─────────────

const AMBIENT = { temp: 72, windSpeed: 18, windDir: 'SW' };

// ── YouTube stream thumbnails (placeholder) ───────────────────────────────────

const YT_STREAMS = [
  { id: 'yt1', title: 'Gulf Coast Live', color: '#0d2035' },
  { id: 'yt2', title: 'Tornado Alley', color: '#1a0d2e' },
  { id: 'yt3', title: 'Atlantic Basin', color: '#0d2035' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const WeatherMap: React.FC<WeatherMapProps> = ({
  alerts,
  earthquakes,
  wildfires,
  tropicalStorms,
  radarFrames,
  radarHost,
  activeLayers,
  selectedAlert,
  onAlertClick,
  region,
  insight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);

  const [radarIndex, setRadarIndex] = useState(0);
  const [currentTime] = useState(() => new Date());
  const [alertBadgeIndex, setAlertBadgeIndex] = useState(0);
  const [mapZoom, setMapZoom] = useState(region.zoom);

  // ── initialise map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: region.center,
      zoom: region.zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'imperial' }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );

    map.on('load', () => {
      mapReadyRef.current = true;
      mapRef.current = map;
    });

    map.on('zoom', () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // Only run once on mount — region handled by separate effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fly to region ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: region.center,
      zoom: region.zoom,
      duration: 1400,
      essential: true,
    });
  }, [region]);

  // ── fly to selected alert ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedAlert?.centroid) return;
    mapRef.current.flyTo({
      center: selectedAlert.centroid,
      zoom: Math.max(mapRef.current.getZoom(), 7),
      duration: 900,
    });
  }, [selectedAlert]);

  // ── radar layer ────────────────────────────────────────────────────────────
  const syncRadar = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!activeLayers.has('radar') || radarFrames.length === 0) {
      removeRadarLayer(map);
      return;
    }
    const frame = radarFrames[radarIndex];
    if (!frame) return;
    if (map.getSource('rainviewer-radar')) {
      updateRadarTime(map, radarHost, frame.time);
    } else {
      addRadarLayer(map, radarHost, frame.time, 0.7);
    }
  }, [activeLayers, radarFrames, radarIndex, radarHost]);

  useEffect(() => {
    // Retry until map is ready
    if (!mapReadyRef.current) {
      const id = setTimeout(syncRadar, 500);
      return () => clearTimeout(id);
    }
    syncRadar();
  }, [syncRadar]);

  // Advance to latest frame when new frames arrive
  useEffect(() => {
    if (radarFrames.length > 0) {
      setRadarIndex(radarFrames.length - 1);
    }
  }, [radarFrames.length]);

  // ── alerts layer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!activeLayers.has('alerts')) {
      removeAlertsLayer(map);
      return;
    }
    if (map.getSource('nws-alerts-source')) {
      updateAlertsLayer(map, alerts);
    } else {
      addAlertsLayer(map, alerts);
    }
  }, [alerts, activeLayers]);

  // ── earthquake layer ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!activeLayers.has('earthquakes')) {
      removeEarthquakeLayer(map);
      return;
    }
    if (map.getSource('earthquakes-source')) {
      updateEarthquakeLayer(map, earthquakes);
    } else {
      addEarthquakeLayer(map, earthquakes);
    }
  }, [earthquakes, activeLayers]);

  // ── wildfire layer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!activeLayers.has('wildfires')) {
      removeFireLayer(map);
      return;
    }
    if (map.getSource('wildfires-source')) {
      updateFireLayer(map, wildfires);
    } else {
      addFireLayer(map, wildfires);
    }
  }, [wildfires, activeLayers]);

  // ── tropical layer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (!activeLayers.has('tropical')) {
      removeTropicalLayer(map);
      return;
    }
    if (map.getSource('tropical-storms-source')) {
      updateTropicalLayer(map, tropicalStorms);
    } else {
      addTropicalLayer(map, tropicalStorms);
    }
  }, [tropicalStorms, activeLayers]);

  // ── alert click popups ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const popupRef = { current: new maplibregl.Popup({ closeButton: true, maxWidth: '280px' }) };

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['nws-alerts-fill'],
      });
      if (!features.length) return;
      const props = features[0].properties as Record<string, string>;
      const hit = alerts.find((a) => a.id === props['id']);
      if (!hit) return;
      onAlertClick(hit);

      const color = props['stroke'] ?? '#ff2020';
      popupRef.current
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family:var(--font-header);color:${color};font-size:13px;font-weight:700;margin-bottom:5px">
             ${props['event'] ?? 'Alert'}
           </div>
           <div style="font-family:var(--font-body);font-size:11px;color:#aac4dc;margin-bottom:4px">
             ${props['areaDesc'] ?? ''}
           </div>
           <div style="font-family:var(--font-body);font-size:11px;color:#d8eaf8">
             ${(props['headline'] ?? '').slice(0, 130)}
           </div>`,
        )
        .addTo(map);
    };

    map.on('click', handleClick);
    map.on('mouseenter', 'nws-alerts-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'nws-alerts-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('click', handleClick);
      popupRef.current.remove();
    };
  }, [alerts, onAlertClick]);

  // ── rotating alert badge ───────────────────────────────────────────────────
  const severeAlerts = alerts.filter(
    (a) => a.severity === 'Extreme' || a.severity === 'Severe',
  );

  useEffect(() => {
    if (severeAlerts.length === 0) return;
    const id = setInterval(() => {
      setAlertBadgeIndex((i) => (i + 1) % severeAlerts.length);
    }, 4000);
    return () => clearInterval(id);
  }, [severeAlerts.length]);

  const badgeAlert = severeAlerts[alertBadgeIndex] ?? null;

  // ── radar index handler ────────────────────────────────────────────────────
  const handleRadarIndexChange = useCallback((idx: number) => {
    setRadarIndex(Math.max(0, Math.min(idx, radarFrames.length - 1)));
  }, [radarFrames.length]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Map canvas */}
      <div ref={containerRef} style={styles.mapCanvas} />

      {/* ── OVERLAY: Severe Storm Warning badge (top-left) ── */}
      {badgeAlert && (
        <div style={styles.stormBadge}>
          <div style={styles.stormBadgePulse} />
          <div style={styles.stormBadgeInner}>
            <span style={styles.stormBadgeType}>
              &#9888; {badgeAlert.event.toUpperCase()}
            </span>
            <span style={styles.stormBadgeArea}>{badgeAlert.areaDesc}</span>
            <span
              style={{
                ...styles.stormBadgeSeverity,
                color: severityBadgeColor(badgeAlert.severity),
              }}
            >
              {badgeAlert.severity.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* ── OVERLAY: Timestamp (top-right, left of nav controls) ── */}
      <div style={styles.timestamp}>
        Updated: {formatTimestamp(currentTime)} &#9658;&#9658;
      </div>

      {/* ── OVERLAY: Ambient weather strip (bottom-left) ── */}
      <div style={styles.weatherStrip}>
        &#8658; {AMBIENT.temp}&#176;F&nbsp;|&nbsp;Wind:&nbsp;{AMBIENT.windSpeed}&nbsp;mph&nbsp;{AMBIENT.windDir}
      </div>

      {/* ── OVERLAY: Claude insight chip (bottom-left, above strip) ── */}
      {insight && (
        <div style={styles.insightChip}>
          <span style={styles.insightIcon}>&#9889;</span>
          <span style={styles.insightText}>{insight.summary.slice(0, 90)}</span>
        </div>
      )}

      {/* ── OVERLAY: YouTube stream panels (right edge) ── */}
      <div style={styles.streamPanels}>
        {YT_STREAMS.map((stream) => (
          <div key={stream.id} style={{ ...styles.streamPanel, background: stream.color }}>
            <div style={styles.streamLiveTag}>&#9679; LIVE</div>
            <div style={styles.streamThumbArea}>
              <span style={styles.streamPlayIcon}>&#9654;</span>
            </div>
            <div style={styles.streamTitle}>{stream.title}</div>
          </div>
        ))}
      </div>

      {/* ── OVERLAY: RadarPlayer timeline (bottom) ── */}
      {activeLayers.has('radar') && radarFrames.length > 0 && (
        <RadarPlayer
          frames={radarFrames}
          currentIndex={radarIndex}
          onIndexChange={handleRadarIndexChange}
          host={radarHost}
        />
      )}

      {/* ── Zoom level indicator ── */}
      <div style={styles.zoomIndicator}>
        z{mapZoom.toFixed(1)}
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
  mapCanvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },

  // ── Storm warning badge ──────────────────────────────────────────────
  stormBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    maxWidth: 240,
    cursor: 'default',
  },
  stormBadgePulse: {
    position: 'absolute',
    inset: -4,
    borderRadius: 10,
    border: '2px solid #ff2020',
    animation: 'none',
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

  // ── Timestamp ────────────────────────────────────────────────────────
  timestamp: {
    position: 'absolute',
    top: 12,
    right: 90,          // leave room for nav control (≈46px wide)
    zIndex: 20,
    background: 'rgba(10, 15, 26, 0.88)',
    border: '1px solid #1a2d44',
    borderRadius: 5,
    padding: '4px 10px',
    fontFamily: 'var(--font-numeric)',
    fontSize: 11,
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    whiteSpace: 'nowrap',
  },

  // ── Weather strip ─────────────────────────────────────────────────────
  weatherStrip: {
    position: 'absolute',
    bottom: 88,         // above RadarPlayer (~72px)
    left: 12,
    zIndex: 20,
    background: 'rgba(10, 15, 26, 0.90)',
    border: '1px solid #1a2d44',
    borderRadius: 5,
    padding: '4px 10px',
    fontFamily: 'var(--font-numeric)',
    fontSize: 12,
    color: 'var(--text-primary)',
    letterSpacing: '0.03em',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },

  // ── Claude insight chip ────────────────────────────────────────────────
  insightChip: {
    position: 'absolute',
    bottom: 118,
    left: 12,
    zIndex: 20,
    background: 'rgba(10, 15, 26, 0.94)',
    border: '1px solid #1a2d44',
    borderLeft: '3px solid #f5c518',
    borderRadius: 5,
    padding: '5px 10px',
    maxWidth: 260,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
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

  // ── YouTube stream panels ─────────────────────────────────────────────
  streamPanels: {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  streamPanel: {
    width: 100,
    height: 66,
    borderRadius: 6,
    border: '1px solid #1a2d44',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
  },
  streamLiveTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    background: '#ff2020',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: 8,
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: 3,
    letterSpacing: '0.05em',
    zIndex: 2,
  },
  streamThumbArea: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamPlayIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  streamTitle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(10, 15, 26, 0.82)',
    padding: '2px 5px',
    fontFamily: 'var(--font-body)',
    fontSize: 8,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // ── Zoom indicator ────────────────────────────────────────────────────
  zoomIndicator: {
    position: 'absolute',
    bottom: 88,
    right: 8,
    zIndex: 20,
    background: 'rgba(10, 15, 26, 0.80)',
    border: '1px solid #1a2d44',
    borderRadius: 4,
    padding: '2px 7px',
    fontFamily: 'var(--font-numeric)',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
};

export default WeatherMap;
