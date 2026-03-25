import type { VercelRequest, VercelResponse } from '@vercel/node';

// Welford streaming baseline state sync
// GET: returns current baseline stats from Upstash Redis (if configured)
// POST: updates baseline with new observations

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // For now, return empty baseline (Upstash Redis integration can be added later)
  if (req.method === 'GET') {
    res.json({ baseline: {}, message: 'Baseline stored client-side' });
  } else {
    res.json({ success: true });
  }
}
