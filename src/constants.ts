import type { LayerConfig, Region } from './types';

export const WEATHER_LAYERS: LayerConfig[] = [
  { id: 'radar',            label: 'Radar',                   default: true,  zoomMin: 0 },
  { id: 'alerts',           label: 'Severe Alerts',           default: true,  zoomMin: 0 },
  { id: 'tropical',         label: 'Tropical Cyclones',       default: true,  zoomMin: 0 },
  { id: 'lightning',        label: 'Lightning',               default: true,  zoomMin: 0 },
  { id: 'wildfires',        label: 'Active Wildfires',        default: true,  zoomMin: 0 },
  { id: 'earthquakes',      label: 'Earthquakes (24h)',       default: true,  zoomMin: 0 },
  { id: 'flood-gauges',     label: 'Flood Gauges',            default: false, zoomMin: 5 },
  { id: 'buoys',            label: 'Ocean Buoys',             default: false, zoomMin: 3 },
  { id: 'air-quality',      label: 'Air Quality Index',       default: false, zoomMin: 0 },
  { id: 'sea-surface-temp', label: 'Sea Surface Temp',        default: false, zoomMin: 0 },
  { id: 'snowpack',         label: 'Snowpack Anomaly',        default: false, zoomMin: 3 },
  { id: 'drought',          label: 'Drought Monitor',         default: false, zoomMin: 0 },
  { id: 'temp-anomaly',     label: 'Temperature Anomaly',     default: false, zoomMin: 0 },
  { id: 'precip-anomaly',   label: 'Precipitation Anomaly',   default: false, zoomMin: 0 },
  { id: 'tropical-tracks',  label: 'Historical Tracks (30d)', default: false, zoomMin: 0 },
  { id: 'storm-surge',      label: 'Storm Surge Forecast',    default: false, zoomMin: 4 },
  { id: 'fire-weather',     label: 'Fire Weather Outlook',    default: false, zoomMin: 0 },
  { id: 'wind-field',       label: 'Wind Field (Animated)',   default: false, zoomMin: 0 },
  { id: 'cloud-cover',      label: 'Cloud Cover',             default: false, zoomMin: 0 },
  { id: 'pressure',         label: 'Pressure Systems',        default: false, zoomMin: 0 },
  { id: 'infrastructure',   label: 'Infrastructure Risk',     default: false, zoomMin: 4 },
  { id: 'stations',         label: 'Weather Stations',        default: false, zoomMin: 6 },
  { id: 'webcams',          label: 'Storm Webcams',           default: false, zoomMin: 5 },
  { id: 'hotspots',         label: 'Weather Hotspots',        default: true,  zoomMin: 0 },
  { id: 'convergence',      label: 'Convergence Zones',       default: true,  zoomMin: 0 },
  { id: 'spc-outlooks',     label: 'SPC Storm Outlooks',      default: true,  zoomMin: 0 },
  { id: 'space-weather',    label: 'Space Weather / Kp',      default: false, zoomMin: 0 },
  { id: 'tides',            label: 'Tidal Gauges',            default: false, zoomMin: 4 },
  { id: 'volcanoes',        label: 'Volcanic Activity',       default: false, zoomMin: 0 },
  { id: 'sst-anomaly',      label: 'Sea Surface Temp Anomaly', default: false, zoomMin: 0 },
  { id: 'global-floods',    label: 'Global Flood Alerts',     default: false, zoomMin: 0 },
];

export const REGIONS: Region[] = [
  { name: 'Bartlett, IL',  center: [-88.19, 41.97], zoom: 9 },
  { name: 'Chicago Metro', center: [-87.90, 41.88], zoom: 7 },
  { name: 'Illinois',      center: [-89.20, 40.00], zoom: 6 },
  { name: 'USA',           center: [-98, 39],        zoom: 4 },
];

export const STORM_SCORE_THRESHOLD = 60;
export const ALERT_THRESHOLD = 70;

export const DATA_FRESHNESS_CONFIG: Record<string, number> = {
  'NWS Alerts':    2  * 60 * 1000,
  'Radar':         5  * 60 * 1000,
  'Lightning':     1  * 60 * 1000,
  'Earthquakes':   5  * 60 * 1000,
  'Wildfires':     60 * 60 * 1000,
  'NHC':           30 * 60 * 1000,
  'Open-Meteo':    60 * 60 * 1000,
  'NDBC Buoys':    60 * 60 * 1000,
  'USGS Flow':     15 * 60 * 1000,
  'OpenAQ':        30 * 60 * 1000,
  'YouTube':       5  * 60 * 1000,
  'SPC Outlooks':  30 * 60 * 1000,
  'Space Weather': 15 * 60 * 1000,
  'Tidal Gauges':  30 * 60 * 1000,
  'Volcanic Activity': 60 * 60 * 1000,
};

export const MONITORED_REGIONS = [
  'Gulf Coast', 'Great Plains', 'Southeast US', 'Pacific Northwest',
  'Southwest US', 'Caribbean', 'Mexico/Central America', 'Western Europe',
  'Mediterranean', 'UK/Ireland', 'Scandinavia', 'Eastern Europe',
  'South Asia (Monsoon)', 'Southeast Asia', 'East Asia/Japan',
  'Bay of Bengal', 'Australia/Oceania', 'Amazon Basin', 'Sahel', 'Southern Africa',
];

export const ALERT_COLORS: Record<string, string> = {
  'Tornado Warning':             '#ff0000',
  'Tornado Emergency':           '#ff0000',
  'Severe Thunderstorm Warning': '#ff8c00',
  'Flash Flood Warning':         '#00ff00',
  'Hurricane Warning':           '#dc143c',
  'default':                     '#e03030',
};
