/**
 * feeds.ts
 * RSS / Atom / JSON feed definitions for the Weather Intelligence Dashboard.
 * Organized by category and annotated with update cadence expectations.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Feed {
  url: string;
  name: string;
  category: string;
  region?: string;
  updateIntervalMin: number;
}

// ---------------------------------------------------------------------------
// Feed definitions
// ---------------------------------------------------------------------------

export const FEEDS: Feed[] = [
  // --------------------------------------------------------------------------
  // Severe Weather — US National Weather Service
  // --------------------------------------------------------------------------
  {
    url: 'https://alerts.weather.gov/cap/us.php?x=1',
    name: 'NWS US Alerts (CAP)',
    category: 'severe',
    region: 'United States',
    updateIntervalMin: 2,
  },
  {
    url: 'https://alerts.weather.gov/cap/ak.php?x=1',
    name: 'NWS Alaska Alerts',
    category: 'severe',
    region: 'Alaska',
    updateIntervalMin: 2,
  },
  {
    url: 'https://alerts.weather.gov/cap/hi.php?x=1',
    name: 'NWS Hawaii Alerts',
    category: 'severe',
    region: 'Hawaii',
    updateIntervalMin: 2,
  },

  // --------------------------------------------------------------------------
  // Tropical / Hurricane — NOAA NHC
  // --------------------------------------------------------------------------
  {
    url: 'https://www.nhc.noaa.gov/index-at.xml',
    name: 'NHC Atlantic Tropical Cyclones',
    category: 'tropical',
    region: 'Atlantic Basin',
    updateIntervalMin: 30,
  },
  {
    url: 'https://www.nhc.noaa.gov/index-ep.xml',
    name: 'NHC Eastern Pacific Tropical Cyclones',
    category: 'tropical',
    region: 'Eastern Pacific',
    updateIntervalMin: 30,
  },
  {
    url: 'https://www.nhc.noaa.gov/index-cp.xml',
    name: 'NHC Central Pacific Tropical Cyclones',
    category: 'tropical',
    region: 'Central Pacific',
    updateIntervalMin: 30,
  },
  {
    url: 'https://rammb-data.cira.colostate.edu/tc_realtime/products/shear_rss.xml',
    name: 'CIRA TC Realtime Shear Feed',
    category: 'tropical',
    region: 'Global',
    updateIntervalMin: 60,
  },

  // --------------------------------------------------------------------------
  // Earthquakes — USGS
  // --------------------------------------------------------------------------
  {
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.atom',
    name: 'USGS M2.5+ Earthquakes (24h)',
    category: 'earthquake',
    region: 'Global',
    updateIntervalMin: 5,
  },
  {
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom',
    name: 'USGS Significant Earthquakes (7d)',
    category: 'earthquake',
    region: 'Global',
    updateIntervalMin: 15,
  },
  {
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom',
    name: 'USGS M4.5+ Earthquakes (24h)',
    category: 'earthquake',
    region: 'Global',
    updateIntervalMin: 5,
  },

  // --------------------------------------------------------------------------
  // Wildfires — NIFC / NASA FIRMS / InciWeb
  // --------------------------------------------------------------------------
  {
    url: 'https://inciweb.nwcg.gov/feeds/rss/incidents/',
    name: 'InciWeb Active US Wildfires',
    category: 'wildfire',
    region: 'United States',
    updateIntervalMin: 60,
  },
  {
    url: 'https://www.nifc.gov/nicc/sitreprt.pdf',
    name: 'NIFC National Situation Report',
    category: 'wildfire',
    region: 'United States',
    updateIntervalMin: 1440,
  },

  // --------------------------------------------------------------------------
  // Global Disaster Alerts — GDACS / ReliefWeb
  // --------------------------------------------------------------------------
  {
    url: 'https://www.gdacs.org/xml/rss.xml',
    name: 'GDACS Global Disaster Alerts',
    category: 'disaster',
    region: 'Global',
    updateIntervalMin: 60,
  },
  {
    url: 'https://reliefweb.int/disasters/rss.xml',
    name: 'ReliefWeb Disasters',
    category: 'disaster',
    region: 'Global',
    updateIntervalMin: 60,
  },
  {
    url: 'https://reliefweb.int/updates/rss.xml',
    name: 'ReliefWeb Updates',
    category: 'disaster',
    region: 'Global',
    updateIntervalMin: 60,
  },

  // --------------------------------------------------------------------------
  // Flooding — FloodList / USGS Streamflow
  // --------------------------------------------------------------------------
  {
    url: 'https://floodlist.com/feed',
    name: 'FloodList Global Flood News',
    category: 'flood',
    region: 'Global',
    updateIntervalMin: 30,
  },
  {
    url: 'https://waterwatch.usgs.gov/index.php?id=ww_flood&region=us&style=rss',
    name: 'USGS WaterWatch Flood Stage',
    category: 'flood',
    region: 'United States',
    updateIntervalMin: 15,
  },

  // --------------------------------------------------------------------------
  // Air Quality — AirNow / OpenAQ
  // --------------------------------------------------------------------------
  {
    url: 'https://www.airnow.gov/rss/airnow.xml',
    name: 'AirNow US AQI Alerts',
    category: 'airquality',
    region: 'United States',
    updateIntervalMin: 60,
  },
  {
    url: 'https://api.openaq.org/v2/latest?limit=100&format=json',
    name: 'OpenAQ Latest Measurements',
    category: 'airquality',
    region: 'Global',
    updateIntervalMin: 30,
  },

  // --------------------------------------------------------------------------
  // Space Weather / Geomagnetic — NOAA SWPC
  // --------------------------------------------------------------------------
  {
    url: 'https://services.swpc.noaa.gov/products/alerts.json',
    name: 'NOAA SWPC Space Weather Alerts',
    category: 'spaceweather',
    region: 'Global',
    updateIntervalMin: 15,
  },
  {
    url: 'https://www.spaceweather.com/index.php?view=rss',
    name: 'SpaceWeather.com News',
    category: 'spaceweather',
    region: 'Global',
    updateIntervalMin: 60,
  },

  // --------------------------------------------------------------------------
  // Drought — NDMC / USDA
  // --------------------------------------------------------------------------
  {
    url: 'https://droughtmonitor.unl.edu/DmData/DataTables.aspx?mode=table&aoi=huc2&date=current',
    name: 'US Drought Monitor Current Conditions',
    category: 'drought',
    region: 'United States',
    updateIntervalMin: 10080, // weekly release
  },

  // --------------------------------------------------------------------------
  // Volcanic Activity — USGS / Smithsonian GVP
  // --------------------------------------------------------------------------
  {
    url: 'https://volcanoes.usgs.gov/vhp/updates.rss',
    name: 'USGS Volcano Hazards Updates',
    category: 'volcano',
    region: 'United States',
    updateIntervalMin: 60,
  },
  {
    url: 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml',
    name: 'Smithsonian GVP Weekly Volcanic Activity',
    category: 'volcano',
    region: 'Global',
    updateIntervalMin: 10080, // weekly
  },

  // --------------------------------------------------------------------------
  // Tsunami — PTWC / NTWC
  // --------------------------------------------------------------------------
  {
    url: 'https://ptwc.weather.gov/rss.php?region=1',
    name: 'PTWC Pacific Tsunami Warnings',
    category: 'tsunami',
    region: 'Pacific Ocean',
    updateIntervalMin: 5,
  },

  // --------------------------------------------------------------------------
  // Climate / Extended Outlooks — CPC / WMO / ECMWF
  // --------------------------------------------------------------------------
  {
    url: 'https://www.cpc.ncep.noaa.gov/products/outlooks/SL.us08MB_CG.lc.xml',
    name: 'CPC US Seasonal Outlook',
    category: 'climate',
    region: 'United States',
    updateIntervalMin: 10080,
  },
  {
    url: 'https://www.wmo.int/rss/index_en.xml',
    name: 'WMO Global Weather News',
    category: 'climate',
    region: 'Global',
    updateIntervalMin: 120,
  },

  // --------------------------------------------------------------------------
  // NASA Earthdata / Remote Sensing
  // --------------------------------------------------------------------------
  {
    url: 'https://earthdata.nasa.gov/feeds/news.rss',
    name: 'NASA Earthdata News',
    category: 'satellite',
    region: 'Global',
    updateIntervalMin: 360,
  },
  {
    url: 'https://firms.modaps.eosdis.nasa.gov/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv',
    name: 'NASA FIRMS VIIRS Fire Detections (24h)',
    category: 'wildfire',
    region: 'Global',
    updateIntervalMin: 60,
  },
];

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

/** Returns all feeds for a given category. */
export function getFeedsByCategory(category: string): Feed[] {
  return FEEDS.filter((f) => f.category === category);
}

/** Returns all feeds for a given region (partial match, case-insensitive). */
export function getFeedsByRegion(region: string): Feed[] {
  const lower = region.toLowerCase();
  return FEEDS.filter((f) => f.region?.toLowerCase().includes(lower));
}

/** Returns feeds whose updateIntervalMin is at or below the given threshold. */
export function getRealTimeFeeds(maxIntervalMin = 5): Feed[] {
  return FEEDS.filter((f) => f.updateIntervalMin <= maxIntervalMin);
}
