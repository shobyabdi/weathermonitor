import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxies OpenAQ air quality data
// Query params: lat, lon, radius (km)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = req.query.lat || '39.5';
  const lon = req.query.lon || '-98.35';
  const radius = req.query.radius || '100000';

  const url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=${radius}&limit=20&order_by=distance`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': process.env.OPENAQ_API_KEY || '',
      }
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch air quality data', results: [] });
  }
}
