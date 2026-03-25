import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end();
    return;
  }

  try {
    const response = await fetch('https://api.weather.gov/alerts/active?status=actual&limit=500', {
      headers: { 'User-Agent': 'WeatherIntelligence/1.0', 'Accept': 'application/geo+json' }
    });
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather alerts', features: [] });
  }
}
