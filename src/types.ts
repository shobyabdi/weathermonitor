export interface WeatherAlert {
  id: string;
  event: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  onset: string;
  expires: string;
  geometry: GeoJSONGeometry | null;
  centroid: [number, number] | null;
  storm_score?: number;
}

export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface TropicalStorm {
  id: string;
  name: string;
  basin: string;
  category: number;
  windSpeed: number;
  pressure: number;
  lat: number;
  lon: number;
  movement: string;
  intensity: 'TD' | 'TS' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
  track: Array<{ lat: number; lon: number; time: string }>;
  forecast: Array<{ lat: number; lon: number; time: string; intensity: string }>;
}

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  url: string;
}

export interface Wildfire {
  id: string;
  lat: number;
  lon: number;
  brightness: number;
  frp: number;
  acqDate: string;
  acqTime: string;
  confidence: number;
  satellite: string;
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
}

export interface ClaudeInsight {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  expected: string[];
  recommendation: string;
  threat_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  affected_region: string;
  generated_at: string;
  storm_score: number;
}

export interface WeatherFeatures {
  pressure_drop_3h: number;
  wind_gust_mph: number;
  precip_rate_in_hr: number;
  active_alert_score: number;
  max_dbz: number;
  youtube_storm_signal: boolean;
}

export interface RWIComponents {
  baselineRisk: number;
  activeAlertScore: number;
  radarIntensityScore: number;
  tropicalActivity: number;
  anomalyScore: number;
}

export interface RegionalScore {
  region: string;
  score: number;
  components: RWIComponents;
  alerts: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface AnomalySignal {
  signal_type: string;
  region: string;
  z_score: number;
  current_value: number;
  baseline_mean: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  human_readable: string;
}

export interface LiveStream {
  id: string;
  channelId: string;
  title: string;
  isLive: boolean;
  thumbnail: string;
  viewerCount?: number;
  locationHint: string;
  category: string;
}

export interface BuoyObservation {
  id: string;
  lat: number;
  lon: number;
  waveHeight: number;
  waterTemp: number;
  windSpeed: number;
  pressure: number;
  time: string;
}

export interface AirQualityStation {
  id: string;
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
  pm10: number;
  location: string;
}

export interface ConvergenceZone {
  lat: number;
  lon: number;
  score: number;
  signals: string[];
  location: string;
  timestamp: string;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipMm: number;
  precipProb: number;
  windMax: number;
  weatherCode: number;
  description: string;
}

export interface InfrastructureRisk {
  name: string;
  type: 'airport' | 'nuclear' | 'dam' | 'power' | 'port' | 'refinery' | 'datacenter';
  lat: number;
  lon: number;
  distance_km: number;
  threat_level: 'critical' | 'high' | 'medium' | 'low';
  event_description: string;
}

export type LayerId =
  | 'radar' | 'alerts' | 'tropical' | 'lightning' | 'wildfires'
  | 'earthquakes' | 'flood-gauges' | 'buoys' | 'air-quality'
  | 'sea-surface-temp' | 'snowpack' | 'drought' | 'temp-anomaly'
  | 'precip-anomaly' | 'tropical-tracks' | 'storm-surge'
  | 'fire-weather' | 'wind-field' | 'cloud-cover' | 'pressure'
  | 'infrastructure' | 'stations' | 'webcams' | 'hotspots' | 'convergence'
  | 'spc-outlooks' | 'space-weather' | 'tides' | 'volcanoes'
  | 'sst-anomaly' | 'global-floods';

export interface LayerConfig {
  id: LayerId;
  label: string;
  default: boolean;
  zoomMin: number;
}

export type TimeFilter = '1h' | '3h' | '6h' | '24h' | '48h' | '7d';

export interface Region {
  name: string;
  center: [number, number];
  zoom: number;
}

export interface DataFreshness {
  source: string;
  lastUpdate: Date | null;
  maxAgeMs: number;
  status: 'fresh' | 'stale' | 'error';
}
