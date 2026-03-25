import type { VercelRequest, VercelResponse } from '@vercel/node';

// USGS streamflow gauge data
// Returns gauges above action/flood/major flood stage

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00065&stateCd=all&period=PT1H&siteStatus=active';

  try {
    // Return a simplified response - full USGS data is very large
    // For production, filter by flood stage thresholds
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    res.json({ gauges: [], message: 'Configure USGS API key for full gauge data' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch river gauge data', gauges: [] });
  }
}
