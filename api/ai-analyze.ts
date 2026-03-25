import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// POST endpoint for storm analysis
// Body: { location, storm_score, alert_summary, pressure_trend, wind_speed, wind_gust, wind_dir, precip_rate, max_dbz, tornado_distance_miles, youtube_context, headlines }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const {
      location = 'Unknown',
      storm_score = 0,
      alert_summary = 'None',
      pressure_trend = 0,
      wind_speed = 0,
      wind_gust = 0,
      wind_dir = 'N',
      precip_rate = 0,
      max_dbz = 0,
      tornado_distance_miles = 999,
      youtube_context = 'None',
      headlines = 'None',
    } = body;

    const prompt = `You are a meteorological intelligence analyst providing situational awareness briefings.

Analyze the following real-time weather data and return a structured JSON response.

Current conditions:
- Location: ${location}
- Storm score: ${storm_score}/100
- Active NWS alerts: ${alert_summary}
- Pressure trend: ${pressure_trend} hPa over 3 hours
- Wind: ${wind_speed} mph gusting to ${wind_gust} mph from ${wind_dir}
- Precipitation rate: ${precip_rate} in/hr
- Max radar reflectivity: ${max_dbz} dBZ
- Nearest active tornado warning: ${tornado_distance_miles} miles
- YouTube storm signal: ${youtube_context}
- Recent headlines: ${headlines}

Return ONLY valid JSON, no prose, no markdown:
{
  "summary": "2-3 sentence plain English description of current conditions and immediate threat",
  "confidence": "low|medium|high",
  "expected": [
    "specific impact within next 30 minutes",
    "specific impact within next 1-2 hours"
  ],
  "recommendation": "single actionable sentence for affected population",
  "threat_type": "tornado|hurricane|flood|fire|winter|heat|severe|earthquake|other",
  "severity": "critical|high|medium|low|info",
  "affected_region": "human-readable location string"
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as any).text;
    let parsed;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.split('```')[1];
        if (cleanText.startsWith('json')) cleanText = cleanText.slice(4);
      }
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = { summary: text, confidence: 'low', expected: [], recommendation: 'Monitor conditions', threat_type: 'other', severity: 'info', affected_region: location };
    }

    parsed.generated_at = new Date().toISOString();
    parsed.storm_score = storm_score;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(parsed);
  } catch (error: any) {
    console.error('Storm analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      summary: 'Analysis temporarily unavailable',
      confidence: 'low',
      expected: [],
      recommendation: 'Monitor conditions closely',
      threat_type: 'other',
      severity: 'info',
      affected_region: 'Unknown',
    });
  }
}
