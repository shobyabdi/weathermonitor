import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const minMag = req.query.minMagnitude || '2.5';
  const hours = req.query.hours || '24';

  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - Number(hours) * 3600000).toISOString();

  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}&minmagnitude=${minMag}&limit=200&orderby=magnitude`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earthquakes', features: [] });
  }
}
