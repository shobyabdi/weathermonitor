/**
 * TropicalLayer.tsx
 * Utility module for managing tropical storm layers on a MapLibre map.
 * NOT a React component — pure MapLibre layer management functions.
 *
 * Renders:
 *  - Storm centre markers (coloured circles)
 *  - Historical track polylines
 *  - Forecast track polylines
 *  - Simplified forecast cone polygons
 */

import maplibregl from 'maplibre-gl';
import type { TropicalStorm } from '@/types';

export const TROPICAL_SOURCE_ID = 'tropical-storms-source';
export const TROPICAL_CENTER_LAYER_ID = 'tropical-center';
export const TROPICAL_TRACK_LAYER_ID = 'tropical-track';
export const TROPICAL_FORECAST_LAYER_ID = 'tropical-forecast';
export const TROPICAL_CONE_LAYER_ID = 'tropical-cone';
export const TROPICAL_LABEL_LAYER_ID = 'tropical-label';

export function getStormColor(storm: TropicalStorm): string {
  switch (storm.intensity) {
    case 'C5': return '#ff2020'; // Cat 5 — red
    case 'C4': return '#ff7b00'; // Cat 4 — orange
    case 'C3': return '#ff7b00'; // Cat 3 — orange
    case 'C2': return '#f5c518'; // Cat 2 — yellow
    case 'C1': return '#f5c518'; // Cat 1 — yellow
    case 'TS': return '#4ab8ff'; // Tropical Storm — cyan
    case 'TD': return '#60d080'; // Tropical Depression — green
    default:   return '#c040ff'; // Unknown — purple
  }
}

function stormRadius(storm: TropicalStorm): number {
  switch (storm.intensity) {
    case 'C5': return 18;
    case 'C4': return 16;
    case 'C3': return 14;
    case 'C2': return 12;
    case 'C1': return 11;
    case 'TS': return 9;
    case 'TD': return 7;
    default:   return 8;
  }
}

/**
 * Build a simplified forecast cone by offsetting forecast points
 * perpendicular to the track direction.  The cone widens over time.
 */
function buildForecastCone(
  storm: TropicalStorm,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  const points = storm.forecast;
  if (!points || points.length < 2) return null;

  // Start cone at storm current position
  const origin = { lat: storm.lat, lon: storm.lon };
  const allPoints = [origin, ...points];

  const leftCoords: [number, number][] = [];
  const rightCoords: [number, number][] = [];

  allPoints.forEach((pt, i) => {
    // Cone half-width in degrees, growing with forecast horizon
    const halfWidth = 0.3 + i * 0.35;
    leftCoords.push([pt.lon - halfWidth, pt.lat]);
    rightCoords.push([pt.lon + halfWidth, pt.lat]);
  });

  // Close the polygon
  const ring: [number, number][] = [
    ...leftCoords,
    ...rightCoords.reverse(),
    leftCoords[0],
  ];

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: { stormId: storm.id, name: storm.name },
  };
}

function buildGeoJSON(storms: TropicalStorm[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const storm of storms) {
    const color = getStormColor(storm);
    const radius = stormRadius(storm);

    // Storm centre point
    features.push({
      type: 'Feature',
      id: `center-${storm.id}`,
      geometry: { type: 'Point', coordinates: [storm.lon, storm.lat] },
      properties: {
        featureType: 'center',
        stormId: storm.id,
        name: storm.name,
        category: storm.category,
        windSpeed: storm.windSpeed,
        intensity: storm.intensity,
        color,
        radius,
        label: storm.name,
      },
    });

    // Historical track line
    if (storm.track && storm.track.length >= 2) {
      const trackCoords: [number, number][] = storm.track.map((p) => [p.lon, p.lat]);
      // Prepend current position
      features.push({
        type: 'Feature',
        id: `track-${storm.id}`,
        geometry: { type: 'LineString', coordinates: trackCoords },
        properties: { featureType: 'track', stormId: storm.id, color },
      });
    }

    // Forecast track line
    if (storm.forecast && storm.forecast.length >= 2) {
      const forecastCoords: [number, number][] = [
        [storm.lon, storm.lat],
        ...storm.forecast.map((p) => [p.lon, p.lat] as [number, number]),
      ];
      features.push({
        type: 'Feature',
        id: `forecast-${storm.id}`,
        geometry: { type: 'LineString', coordinates: forecastCoords },
        properties: { featureType: 'forecast', stormId: storm.id, color },
      });
    }

    // Forecast cone
    const cone = buildForecastCone(storm);
    if (cone) {
      cone.id = `cone-${storm.id}`;
      features.push(cone);
    }
  }

  return { type: 'FeatureCollection', features };
}

export function addTropicalLayer(map: maplibregl.Map, storms: TropicalStorm[]): void {
  if (map.getSource(TROPICAL_SOURCE_ID)) {
    updateTropicalLayer(map, storms);
    return;
  }

  if (!storms.length) return;

  const geojson = buildGeoJSON(storms);

  map.addSource(TROPICAL_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  // Forecast cone fill
  map.addLayer({
    id: TROPICAL_CONE_LAYER_ID,
    type: 'fill',
    source: TROPICAL_SOURCE_ID,
    filter: ['all', ['==', ['geometry-type'], 'Polygon']],
    paint: {
      'fill-color': '#c040ff',
      'fill-opacity': 0.10,
    },
  });

  // Historical track (solid)
  map.addLayer({
    id: TROPICAL_TRACK_LAYER_ID,
    type: 'line',
    source: TROPICAL_SOURCE_ID,
    filter: ['==', ['get', 'featureType'], 'track'],
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.8,
    },
  });

  // Forecast track (dashed)
  map.addLayer({
    id: TROPICAL_FORECAST_LAYER_ID,
    type: 'line',
    source: TROPICAL_SOURCE_ID,
    filter: ['==', ['get', 'featureType'], 'forecast'],
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2,
      'line-opacity': 0.6,
      'line-dasharray': [4, 3],
    },
  });

  // Storm centre circles
  map.addLayer({
    id: TROPICAL_CENTER_LAYER_ID,
    type: 'circle',
    source: TROPICAL_SOURCE_ID,
    filter: ['==', ['get', 'featureType'], 'center'],
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.9,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });

  // Storm name labels
  map.addLayer({
    id: TROPICAL_LABEL_LAYER_ID,
    type: 'symbol',
    source: TROPICAL_SOURCE_ID,
    filter: ['==', ['get', 'featureType'], 'center'],
    layout: {
      'text-field': ['concat', ['get', 'label'], ' (', ['get', 'intensity'], ')'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 12,
      'text-offset': [0, 1.8],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 2,
    },
  });
}

export function updateTropicalLayer(map: maplibregl.Map, storms: TropicalStorm[]): void {
  const source = map.getSource(TROPICAL_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) {
    addTropicalLayer(map, storms);
    return;
  }
  source.setData(buildGeoJSON(storms));
}

export function removeTropicalLayer(map: maplibregl.Map): void {
  const layers = [
    TROPICAL_LABEL_LAYER_ID,
    TROPICAL_CENTER_LAYER_ID,
    TROPICAL_FORECAST_LAYER_ID,
    TROPICAL_TRACK_LAYER_ID,
    TROPICAL_CONE_LAYER_ID,
  ];
  for (const id of layers) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(TROPICAL_SOURCE_ID)) map.removeSource(TROPICAL_SOURCE_ID);
}
