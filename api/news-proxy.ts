import type { VercelRequest, VercelResponse } from '@vercel/node';

// RSS proxy for weather news feeds
// Query param: feed (URL of RSS feed to proxy)
// Parses XML and returns JSON array of items

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const feedUrl = req.query.feed as string;

  if (!feedUrl || !feedUrl.startsWith('http')) {
    res.status(400).json({ error: 'Invalid feed URL' });
    return;
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'WeatherIntelligence/1.0' }
    });
    const xml = await response.text();

    // Parse RSS items
    const items: any[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const item = match[1];
      const extract = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };

      items.push({
        title: extract('title'),
        link: extract('link'),
        description: extract('description'),
        pubDate: extract('pubDate'),
        category: extract('category'),
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    res.json({ items: items.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RSS feed', items: [] });
  }
}
