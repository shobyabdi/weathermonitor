import React, { useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type {
  WeatherAlert,
  TropicalStorm,
  Earthquake,
  Wildfire,
  RadarData,
  LayerId,
  Region,
  TimeFilter,
} from '../types';
import { ALERT_COLORS } from '../constants';

const MAPLIBRE_STYLE = import.meta.env.VITE_MAPLIBRE_STYLE ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface WeatherMapProps {
  activeLayers: Set<LayerId>;
  activeRegion: Region;
  timeFilter: TimeFilter;
  alerts: WeatherAlert[];
  storms: TropicalStorm[];
  earthquakes: Earthquake[];
  wildfires: Wildfire[];
  radarData: RadarData | null;
  selectedAlert: WeatherAlert | null;
  onSelectAlert: (alert: WeatherAlert | null) => void;
}

function severityToColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme':  return '#ff2020';
    case 'Severe':   return '#ff7b00';
    case 'Moderate': return '#f5c518';
    case 'Minor':    return '#4ab8ff';
    default:         return '#6a90b8';
  }
}

function categoryToColor(category: number): string {
  if (category >= 5) return '#ff0060';
  if (category >= 4) return '#c040ff';
  if (category >= 3) return '#ff2020';
  if (category >= 2) return '#ff7b00';
  if (category >= 1) return '#f5c518';
  return '#4ab8ff'; // TD/TS
}

function magnitudeToColor(mag: number): string {
  if (mag >= 7.0) return '#ff2020';
  if (mag >= 6.0) return '#ff7b00';
  if (mag >= 5.0) return '#f5c518';
  if (mag >= 4.0) return '#4ab8ff';
  return '#60d080';
}

export const WeatherMap: React.FC<WeatherMapProps> = ({
  activeLayers,
  activeRegion,
  alerts,
  storms,
  earthquakes,
  wildfires,
  radarData,
  selectedAlert,
  onSelectAlert,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = React.useState<{
    lng: number;
    lat: number;
    content: React.ReactNode;
  } | null>(null);

  // Fly to active region when it changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: activeRegion.center,
      zoom: activeRegion.zoom,
      duration: 1200,
    });
  }, [activeRegion]);

  // Fly to selected alert
  useEffect(() => {
    if (!selectedAlert?.centroid || !mapRef.current) return;
    mapRef.current.flyTo({
      center: selectedAlert.centroid,
      zoom: 7,
      duration: 900,
    });
  }, [selectedAlert]);

  // Build GeoJSON for alerts
  const alertsGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: alerts
      .filter(a => a.centroid)
      .map(a => ({
        type: 'Feature' as const,
        properties: {
          id: a.id,
          event: a.event,
          severity: a.severity,
          headline: a.headline,
          areaDesc: a.areaDesc,
          color: ALERT_COLORS[a.event] ?? ALERT_COLORS['default'],
          severityColor: severityToColor(a.severity),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: a.centroid!,
        },
      })),
  }), [alerts]);

  // Build GeoJSON for alert polygons
  const alertPolygonsGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: alerts
      .filter(a => a.geometry)
      .map(a => ({
        type: 'Feature' as const,
        properties: {
          id: a.id,
          severity: a.severity,
          color: severityToColor(a.severity),
        },
        geometry: a.geometry!,
      })),
  }), [alerts]);

  // Build GeoJSON for earthquakes
  const earthquakesGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: earthquakes.map(eq => ({
      type: 'Feature' as const,
      properties: {
        id: eq.id,
        magnitude: eq.magnitude,
        place: eq.place,
        depth: eq.depth,
        color: magnitudeToColor(eq.magnitude),
        radius: Math.max(4, eq.magnitude * 3),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [eq.lon, eq.lat],
      },
    })),
  }), [earthquakes]);

  // Build GeoJSON for wildfires
  const wildfiresGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: wildfires.map(wf => ({
      type: 'Feature' as const,
      properties: {
        id: wf.id,
        brightness: wf.brightness,
        frp: wf.frp,
        confidence: wf.confidence,
        satellite: wf.satellite,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [wf.lon, wf.lat],
      },
    })),
  }), [wildfires]);

  // Build GeoJSON for tropical storms
  const stormsGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: storms.map(s => ({
      type: 'Feature' as const,
      properties: {
        id: s.id,
        name: s.name,
        category: s.category,
        windSpeed: s.windSpeed,
        pressure: s.pressure,
        intensity: s.intensity,
        color: categoryToColor(s.category),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lon, s.lat],
      },
    })),
  }), [storms]);

  // Build GeoJSON for tropical forecast tracks
  const stormTracksGeoJSON = React.useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: storms.flatMap(s => {
      const points = [
        ...s.track.map(p => ({ ...p, phase: 'past' })),
        ...s.forecast.map(p => ({ ...p, phase: 'forecast' })),
      ];
      if (points.length < 2) return [];
      return [{
        type: 'Feature' as const,
        properties: { id: s.id, name: s.name, color: categoryToColor(s.category) },
        geometry: {
          type: 'LineString' as const,
          coordinates: points.map(p => [p.lon, p.lat]),
        },
      }];
    }),
  }), [storms]);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features;
    if (!features || features.length === 0) {
      setPopupInfo(null);
      onSelectAlert(null);
      return;
    }

    const f = features[0];
    const props = f.properties as Record<string, unknown>;

    if (f.layer?.id === 'alerts-circles') {
      const alert = alerts.find(a => a.id === props['id']);
      if (alert) {
        onSelectAlert(alert);
        setPopupInfo({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          content: (
            <div>
              <div style={{ fontFamily: 'var(--font-header)', fontWeight: 600, marginBottom: 4, color: String(props['severityColor']) }}>
                {String(props['event'])}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                {String(props['areaDesc'])}
              </div>
              <div style={{ fontSize: 11 }}>{String(props['headline']).slice(0, 120)}</div>
            </div>
          ),
        });
      }
    } else if (f.layer?.id === 'earthquakes-circles') {
      setPopupInfo({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        content: (
          <div>
            <div style={{ fontFamily: 'var(--font-header)', fontWeight: 600, marginBottom: 4, color: String(props['color']) }}>
              M{Number(props['magnitude']).toFixed(1)} Earthquake
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
              {String(props['place'])}
            </div>
            <div style={{ fontSize: 11 }}>Depth: {Number(props['depth']).toFixed(1)} km</div>
          </div>
        ),
      });
    } else if (f.layer?.id === 'wildfires-circles') {
      setPopupInfo({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        content: (
          <div>
            <div style={{ fontFamily: 'var(--font-header)', fontWeight: 600, marginBottom: 4, color: '#ff7b00' }}>
              Active Wildfire
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
              FRP: {Number(props['frp']).toFixed(1)} MW
            </div>
            <div style={{ fontSize: 11 }}>
              Brightness: {Number(props['brightness']).toFixed(0)} K | Satellite: {String(props['satellite'])}
            </div>
          </div>
        ),
      });
    } else if (f.layer?.id === 'storms-circles') {
      setPopupInfo({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        content: (
          <div>
            <div style={{ fontFamily: 'var(--font-header)', fontWeight: 600, marginBottom: 4, color: String(props['color']) }}>
              {String(props['intensity'])} {String(props['name'])}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Winds: {Number(props['windSpeed'])} mph
            </div>
            <div style={{ fontSize: 11 }}>Pressure: {Number(props['pressure'])} mb</div>
          </div>
        ),
      });
    }
  }, [alerts, onSelectAlert]);

  const interactiveLayerIds = [
    'alerts-circles',
    'earthquakes-circles',
    'wildfires-circles',
    'storms-circles',
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: activeRegion.center[0],
          latitude: activeRegion.center[1],
          zoom: activeRegion.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAPLIBRE_STYLE}
        onClick={handleMapClick}
        interactiveLayerIds={interactiveLayerIds}
        cursor="default"
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Alert polygons fill */}
        {activeLayers.has('alerts') && (
          <Source id="alert-polygons" type="geojson" data={alertPolygonsGeoJSON}>
            <Layer
              id="alert-polygons-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.12,
              }}
            />
            <Layer
              id="alert-polygons-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 1.5,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Alert centroids */}
        {activeLayers.has('alerts') && (
          <Source id="alerts" type="geojson" data={alertsGeoJSON}>
            <Layer
              id="alerts-circles"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': ['get', 'severityColor'],
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1,
                'circle-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* Earthquakes */}
        {activeLayers.has('earthquakes') && (
          <Source id="earthquakes" type="geojson" data={earthquakesGeoJSON}>
            <Layer
              id="earthquakes-circles"
              type="circle"
              paint={{
                'circle-radius': ['get', 'radius'],
                'circle-color': ['get', 'color'],
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1,
                'circle-opacity': 0.75,
              }}
            />
          </Source>
        )}

        {/* Wildfires */}
        {activeLayers.has('wildfires') && (
          <Source id="wildfires" type="geojson" data={wildfiresGeoJSON}>
            <Layer
              id="wildfires-circles"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#ff7b00',
                'circle-stroke-color': '#ff2020',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.85,
              }}
            />
          </Source>
        )}

        {/* Tropical tracks */}
        {(activeLayers.has('tropical') || activeLayers.has('tropical-tracks')) && (
          <Source id="storm-tracks" type="geojson" data={stormTracksGeoJSON}>
            <Layer
              id="storm-tracks-line"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.7,
                'line-dasharray': [4, 2],
              }}
            />
          </Source>
        )}

        {/* Tropical storm centers */}
        {activeLayers.has('tropical') && (
          <Source id="storms" type="geojson" data={stormsGeoJSON}>
            <Layer
              id="storms-circles"
              type="circle"
              paint={{
                'circle-radius': 10,
                'circle-color': ['get', 'color'],
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2,
                'circle-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            maxWidth="280px"
          >
            {popupInfo.content}
          </Popup>
        )}
      </Map>

      {/* Radar legend */}
      {activeLayers.has('radar') && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 12,
            background: 'rgba(13, 21, 37, 0.9)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 10px',
            fontFamily: 'var(--font-numeric)',
            fontSize: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ marginBottom: 4, fontFamily: 'var(--font-header)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Radar dBZ
          </div>
          {[
            { label: '&lt;20', color: '#00e060' },
            { label: '20-35', color: '#e0e000' },
            { label: '35-50', color: '#ff8000' },
            { label: '50-65', color: '#ff0000' },
            { label: '65+',   color: '#ff00ff' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 12, height: 8, background: item.color, borderRadius: 2 }} />
              <span dangerouslySetInnerHTML={{ __html: item.label }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherMap;
