import type { VercelRequest, VercelResponse } from '@vercel/node';

// Returns a curated list of NDBC buoy latest observations
// Fetches from NDBC for a few key buoys

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Key NDBC buoy station IDs for major regions
  const stationIds = ['41048', '41049', '42001', '42002', '42003', '46042', '46026', '44025', '44013'];

  const buoys = [];
  for (const stationId of stationIds.slice(0, 5)) {
    try {
      const response = await fetch(`https://www.ndbc.noaa.gov/data/latest_obs/${stationId}.txt`, {
        headers: { 'User-Agent': 'WeatherIntelligence/1.0' }
      });
      if (!response.ok) continue;
      const text = await response.text();
      const lines = text.trim().split('\n');
      if (lines.length < 3) continue;

      // NDBC format: headers on line 1-2, data starts line 3
      const headers = lines[0].replace(/^#/, '').trim().split(/\s+/);
      const units = lines[1].replace(/^#/, '').trim().split(/\s+/);
      const values = lines[2].trim().split(/\s+/);

      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || 'MM'; });

      buoys.push({
        id: stationId,
        waveHeight: row.WVHT !== 'MM' ? parseFloat(row.WVHT) : null,
        waterTemp: row.WTMP !== 'MM' ? parseFloat(row.WTMP) : null,
        windSpeed: row.WSPD !== 'MM' ? parseFloat(row.WSPD) : null,
        pressure: row.PRES !== 'MM' ? parseFloat(row.PRES) : null,
        time: `${row.YY || ''}-${row.MM || ''}-${row.DD || ''} ${row.hh || ''}:${row.mm || ''}`,
      });
    } catch { continue; }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
  res.json({ buoys });
}
