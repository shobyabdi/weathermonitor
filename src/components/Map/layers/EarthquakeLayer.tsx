/**
 * EarthquakeLayer.tsx
 * Utility module for managing earthquake circle layers on a MapLibre map.
 * NOT a React component — pure MapLibre layer management functions.
 */

import maplibregl from 'maplibre-gl';
import type { Earthquake } from '@/types';

export const EARTHQUAKE_SOURCE_ID = 'earthquakes-source';
export const EARTHQUAKE_LAYER_ID = 'earthquakes-layer';
export const EARTHQUAKE_LABEL_LAYER_ID = 'earthquakes-label';

function magnitudeToColor(mag: number): string {
  if (mag < 3.0) return '#60d080'; // green — minor
  if (mag < 5.0) return '#f5c518'; // yellow — light/moderate
  if (mag < 6.0) return '#ff7b00'; // orange — strong
  return '#ff2020';                 // red — major / great
}

function magnitudeToRadius(mag: number): number {
  // base: 4px per unit of magnitude, minimum 4px
  return Math.max(4, mag * 4);
}

function buildGeoJSON(earthquakes: Earthquake[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = earthquakes.map((eq) => ({
    type: 'Feature',
    id: eq.id,
    geometry: {
      type: 'Point',
      coordinates: [eq.lon, eq.lat],
    },
    properties: {
      id: eq.id,
      magnitude: eq.magnitude,
      place: eq.place,
      depth: eq.depth,
      time: eq.time,
      color: magnitudeToColor(eq.magnitude),
      radius: magnitudeToRadius(eq.magnitude),
      label: `M${eq.magnitude.toFixed(1)}`,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export function addEarthquakeLayer(map: maplibregl.Map, earthquakes: Earthquake[]): void {
  if (map.getSource(EARTHQUAKE_SOURCE_ID)) {
    updateEarthquakeLayer(map, earthquakes);
    return;
  }

  if (!earthquakes.length) return;

  const geojson = buildGeoJSON(earthquakes);

  map.addSource(EARTHQUAKE_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  // Circle layer
  map.addLayer({
    id: EARTHQUAKE_LAYER_ID,
    type: 'circle',
    source: EARTHQUAKE_SOURCE_ID,
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.80,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
      'circle-stroke-opacity': 0.6,
      // Pulse effect approximated by a larger semi-transparent outer ring
      'circle-blur': 0.15,
    },
  });

  // Label layer for larger quakes (M ≥ 4.5)
  map.addLayer({
    id: EARTHQUAKE_LABEL_LAYER_ID,
    type: 'symbol',
    source: EARTHQUAKE_SOURCE_ID,
    filter: ['>=', ['get', 'magnitude'], 4.5],
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-offset': [0, 1.4],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1.5,
    },
  });
}

export function updateEarthquakeLayer(map: maplibregl.Map, earthquakes: Earthquake[]): void {
  const source = map.getSource(EARTHQUAKE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) {
    addEarthquakeLayer(map, earthquakes);
    return;
  }
  source.setData(buildGeoJSON(earthquakes));
}

export function removeEarthquakeLayer(map: maplibregl.Map): void {
  if (map.getLayer(EARTHQUAKE_LABEL_LAYER_ID)) map.removeLayer(EARTHQUAKE_LABEL_LAYER_ID);
  if (map.getLayer(EARTHQUAKE_LAYER_ID)) map.removeLayer(EARTHQUAKE_LAYER_ID);
  if (map.getSource(EARTHQUAKE_SOURCE_ID)) map.removeSource(EARTHQUAKE_SOURCE_ID);
}
