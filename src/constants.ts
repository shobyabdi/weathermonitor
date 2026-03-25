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
];

export const REGIONS: Region[] = [
  { name: 'Global',            center: [0, 20],    zoom: 2   },
  { name: 'North America',     center: [-95, 40],  zoom: 3.5 },
  { name: 'Gulf/Caribbean',    center: [-85, 22],  zoom: 4   },
  { name: 'Europe',            center: [10, 52],   zoom: 4   },
  { name: 'South/SE Asia',     center: [105, 15],  zoom: 3.5 },
  { name: 'East Asia/Pacific', center: [145, 30],  zoom: 3.5 },
  { name: 'Australia/Oceania', center: [140, -25], zoom: 4   },
  { name: 'Tropics',           center: [0, 10],    zoom: 2.5 },
];

export const STORM_SCORE_THRESHOLD = 60;
export const ALERT_THRESHOLD = 70;

export const DATA_FRESHNESS_CONFIG: Record<string, number> = {
  'NWS Alerts':  2  * 60 * 1000,
  'Radar':       5  * 60 * 1000,
  'Lightning':   1  * 60 * 1000,
  'Earthquakes': 5  * 60 * 1000,
  'Wildfires':   60 * 60 * 1000,
  'NHC':         30 * 60 * 1000,
  'Open-Meteo':  60 * 60 * 1000,
  'NDBC Buoys':  60 * 60 * 1000,
  'USGS Flow':   15 * 60 * 1000,
  'OpenAQ':      30 * 60 * 1000,
  'YouTube':     5  * 60 * 1000,
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
