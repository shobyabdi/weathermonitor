import type { VercelRequest, VercelResponse } from '@vercel/node';

// Parse NHC RSS XML to extract tropical storm info
// Return array of storm objects

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const feeds = [
    'https://www.nhc.noaa.gov/index-at.xml',
    'https://www.nhc.noaa.gov/index-ep.xml',
  ];

  const storms: any[] = [];

  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': 'WeatherIntelligence/1.0' }
      });
      const text = await response.text();

      // Parse XML to extract advisory items
      const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const item = match[1];
        const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const desc = item.match(/<description>(.*?)<\/description>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';

        if (title.includes('Advisory') || title.includes('Special')) {
          // Extract storm info
          const nameMatch = title.match(/(Hurricane|Tropical Storm|Tropical Depression)\s+([A-Za-z]+)/);
          if (nameMatch) {
            storms.push({
              id: link.split('/').pop() || Math.random().toString(36).slice(2),
              name: nameMatch[2],
              type: nameMatch[1],
              basin: feedUrl.includes('-at') ? 'Atlantic' : 'East Pacific',
              title,
              description: desc,
              link,
            });
          }
        }
      }
    } catch (e) {
      // Continue with other feeds
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
  res.json({ storms });
}
