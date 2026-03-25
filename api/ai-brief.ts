import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

// In-memory cache (per serverless instance, 15 min TTL)
let cache: { content: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

const client = new Anthropic();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end();
    return;
  }

  // Return cached brief if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    return res.json({ brief: cache.content, cached: true, generatedAt: new Date(cache.timestamp).toISOString() });
  }

  try {
    // Fetch current data to contextualize the brief
    const [alertsRes, eqRes] = await Promise.allSettled([
      fetch('https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe&limit=20', {
        headers: { 'User-Agent': 'WeatherIntelligence/1.0' }
      }).then(r => r.json()),
      fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=5.0&limit=10&orderby=magnitude').then(r => r.json()),
    ]);

    const alerts = alertsRes.status === 'fulfilled' ? alertsRes.value?.features || [] : [];
    const earthquakes = eqRes.status === 'fulfilled' ? eqRes.value?.features || [] : [];

    const alertSummary = alerts.slice(0, 5).map((f: any) =>
      `${f.properties?.event}: ${f.properties?.areaDesc}`
    ).join('; ') || 'No critical alerts active';

    const eqSummary = earthquakes.slice(0, 3).map((f: any) =>
      `M${f.properties?.mag} ${f.properties?.place}`
    ).join('; ') || 'No significant earthquakes';

    const prompt = `You are a meteorological intelligence analyst. Synthesize the following real-time weather data into a concise 3-paragraph global weather brief for professionals.

Paragraph 1: Most significant active severe weather events globally. Be specific with storm names, locations, intensity values.
Paragraph 2: Developing situations likely to intensify or expand in the next 24-48 hours.
Paragraph 3: Climatological context — anomalies vs historical baselines, record-setting conditions.

Keep each paragraph to 3-4 sentences. No headers. No bullet points. Plain text only.

Current data:
- Active critical/severe NWS alerts: ${alerts.length} (${alertSummary})
- Significant earthquakes (24h): ${eqSummary}
- Date/time: ${new Date().toUTCString()}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const brief = (message.content[0] as any).text;

    // Cache the result
    cache = { content: brief, timestamp: Date.now() };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    res.json({ brief, cached: false, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('AI brief error:', error);
    res.status(500).json({
      error: 'Failed to generate weather brief',
      brief: 'Weather intelligence brief temporarily unavailable. Please check individual data panels for current conditions.',
    });
  }
}
