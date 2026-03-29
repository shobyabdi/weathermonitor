/**
 * RadarLayer.tsx
 * Utility module for managing RainViewer radar tile layers on a MapLibre map.
 * NOT a React component — pure MapLibre layer management functions.
 */

import maplibregl from 'maplibre-gl';

export const RADAR_SOURCE_ID = 'rainviewer-radar';
export const RADAR_LAYER_ID = 'rainviewer-radar-layer';

// path is the full path from RainViewer API e.g. "/v2/radar/500fb7f87406"
function buildRadarTileURL(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function addRadarLayer(
  map: maplibregl.Map,
  host: string,
  path: string,
  opacity: number = 0.85,
): void {
  if (map.getSource(RADAR_SOURCE_ID)) {
    updateRadarTime(map, host, path);
    return;
  }

  map.addSource(RADAR_SOURCE_ID, {
    type: 'raster',
    tiles: [buildRadarTileURL(host, path)],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 12,
    attribution: 'RainViewer',
  });

  map.addLayer({
    id: RADAR_LAYER_ID,
    type: 'raster',
    source: RADAR_SOURCE_ID,
    minzoom: 0,
    paint: {
      'raster-opacity': opacity,
    },
  });
}

export function updateRadarTime(map: maplibregl.Map, host: string, path: string): void {
  // MapLibre 4.x: re-create the source to force a tile refresh with new URL
  if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
  if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

  map.addSource(RADAR_SOURCE_ID, {
    type: 'raster',
    tiles: [buildRadarTileURL(host, path)],
    tileSize: 256,
    minzoom: 0,
    maxzoom: 12,
    attribution: 'RainViewer',
  });

  map.addLayer({
    id: RADAR_LAYER_ID,
    type: 'raster',
    source: RADAR_SOURCE_ID,
    minzoom: 0,
    paint: {
      'raster-opacity': 0.85,
    },
  });
}

export function removeRadarLayer(map: maplibregl.Map): void {
  if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
  if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
}
