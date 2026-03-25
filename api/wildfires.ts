import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxies NASA FIRMS CSV data and returns JSON
// Fetches VIIRS 24h global data
// Parses CSV and returns array of fire hotspots

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv';

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WeatherIntelligence/1.0' }
    });
    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      res.json({ fires: [] });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const fires = [];

    for (const line of lines.slice(1, 1001)) {
      const values = line.split(',');
      if (values.length < headers.length) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim() || ''; });

      try {
        fires.push({
          id: `${row.latitude}_${row.longitude}_${row.acq_date}_${row.acq_time}`,
          lat: parseFloat(row.latitude),
          lon: parseFloat(row.longitude),
          brightness: parseFloat(row.bright_ti4 || '0'),
          frp: parseFloat(row.frp || '0'),
          acqDate: row.acq_date,
          acqTime: row.acq_time,
          confidence: row.confidence,
          satellite: row.satellite || 'VIIRS',
        });
      } catch { continue; }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.json({ fires });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wildfire data', fires: [] });
  }
}
