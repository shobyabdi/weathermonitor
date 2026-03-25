import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxies Open-Meteo 7-day forecast (no API key required)
// Query params: lat, lon

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = req.query.lat || '39.5';
  const lon = req.query.lon || '-98.35';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
}
