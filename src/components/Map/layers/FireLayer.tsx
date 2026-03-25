/**
 * FireLayer.tsx
 * Utility module for managing wildfire heat-point layers on a MapLibre map.
 * NOT a React component — pure MapLibre layer management functions.
 */

import maplibregl from 'maplibre-gl';
import type { Wildfire } from '@/types';

export const FIRE_SOURCE_ID = 'wildfires-source';
export const FIRE_LAYER_ID = 'wildfires-layer';
export const FIRE_HALO_LAYER_ID = 'wildfires-halo';

/**
 * Normalise FRP (Fire Radiative Power, MW) to an opacity in [0.4, 1.0].
 * Typical values: low < 50 MW, moderate 50–300 MW, extreme > 300 MW.
 */
function frpToOpacity(frp: number): number {
  const clamped = Math.min(Math.max(frp, 0), 500);
  return 0.4 + (clamped / 500) * 0.6;
}

/**
 * Map brightness temperature to a colour.
 * VIIRS I4 brightness ranges ~300–500 K for active fires.
 */
function brightnessToColor(brightness: number): string {
  if (brightness >= 420) return '#ff0000'; // extreme — deep red
  if (brightness >= 380) return '#ff4500'; // high — orange-red
  if (brightness >= 340) return '#ff8c00'; // moderate — orange
  return '#ffaa00';                        // low — amber
}

function buildGeoJSON(wildfires: Wildfire[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = wildfires.map((fire) => ({
    type: 'Feature',
    id: fire.id,
    geometry: {
      type: 'Point',
      coordinates: [fire.lon, fire.lat],
    },
    properties: {
      id: fire.id,
      brightness: fire.brightness,
      frp: fire.frp,
      confidence: fire.confidence,
      color: brightnessToColor(fire.brightness),
      opacity: frpToOpacity(fire.frp),
      // Larger circle for higher FRP
      radius: Math.max(4, Math.min(12, 4 + (fire.frp / 100) * 4)),
    },
  }));

  return { type: 'FeatureCollection', features };
}

export function addFireLayer(map: maplibregl.Map, wildfires: Wildfire[]): void {
  if (map.getSource(FIRE_SOURCE_ID)) {
    updateFireLayer(map, wildfires);
    return;
  }

  if (!wildfires.length) return;

  const geojson = buildGeoJSON(wildfires);

  map.addSource(FIRE_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  // Outer glow halo
  map.addLayer({
    id: FIRE_HALO_LAYER_ID,
    type: 'circle',
    source: FIRE_SOURCE_ID,
    paint: {
      'circle-radius': ['*', ['get', 'radius'], 2.2],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.18,
      'circle-blur': 1,
    },
  });

  // Core fire dot
  map.addLayer({
    id: FIRE_LAYER_ID,
    type: 'circle',
    source: FIRE_SOURCE_ID,
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['get', 'opacity'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 0.5,
      'circle-stroke-opacity': 0.4,
    },
  });
}

export function updateFireLayer(map: maplibregl.Map, wildfires: Wildfire[]): void {
  const source = map.getSource(FIRE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) {
    addFireLayer(map, wildfires);
    return;
  }
  source.setData(buildGeoJSON(wildfires));
}

export function removeFireLayer(map: maplibregl.Map): void {
  if (map.getLayer(FIRE_LAYER_ID)) map.removeLayer(FIRE_LAYER_ID);
  if (map.getLayer(FIRE_HALO_LAYER_ID)) map.removeLayer(FIRE_HALO_LAYER_ID);
  if (map.getSource(FIRE_SOURCE_ID)) map.removeSource(FIRE_SOURCE_ID);
}
