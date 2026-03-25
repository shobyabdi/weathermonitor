/**
 * RadarLayer.tsx
 * Utility module for managing RainViewer radar tile layers on a MapLibre map.
 * NOT a React component — pure MapLibre layer management functions.
 */

import maplibregl from 'maplibre-gl';

export const RADAR_SOURCE_ID = 'rainviewer-radar';
export const RADAR_LAYER_ID = 'rainviewer-radar-layer';

function buildRadarTileURL(host: string, time: number): string {
  return `${host}/v2/radar/${time}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function addRadarLayer(
  map: maplibregl.Map,
  host: string,
  time: number,
  opacity: number = 0.7,
): void {
  if (map.getSource(RADAR_SOURCE_ID)) {
    updateRadarTime(map, host, time);
    return;
  }

  map.addSource(RADAR_SOURCE_ID, {
    type: 'raster',
    tiles: [buildRadarTileURL(host, time)],
    tileSize: 256,
    attribution: 'RainViewer',
  });

  map.addLayer(
    {
      id: RADAR_LAYER_ID,
      type: 'raster',
      source: RADAR_SOURCE_ID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paint: {
        'raster-opacity': opacity,
        'raster-opacity-transition': { duration: 300, delay: 0 },
      } as any,
    },
    // Insert above base tiles but below alert polygons / labels
    undefined,
  );
}

export function updateRadarTime(map: maplibregl.Map, host: string, time: number): void {
  const source = map.getSource(RADAR_SOURCE_ID) as maplibregl.RasterTileSource | undefined;
  if (!source) return;

  // MapLibre 4.x: re-create the source to force a tile refresh with new URL
  const opacity =
    (map.getPaintProperty(RADAR_LAYER_ID, 'raster-opacity') as number | undefined) ?? 0.7;

  if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
  if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

  map.addSource(RADAR_SOURCE_ID, {
    type: 'raster',
    tiles: [buildRadarTileURL(host, time)],
    tileSize: 256,
    attribution: 'RainViewer',
  });

  map.addLayer({
    id: RADAR_LAYER_ID,
    type: 'raster',
    source: RADAR_SOURCE_ID,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paint: {
      'raster-opacity': opacity,
      'raster-opacity-transition': { duration: 300, delay: 0 },
    } as any,
  });
}

export function removeRadarLayer(map: maplibregl.Map): void {
  if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
  if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
}
