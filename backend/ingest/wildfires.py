import requests
import logging
from typing import List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# NASA FIRMS VIIRS active fire data (no-auth version uses CSV)
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv"

def fetch_wildfires(days: int = 1) -> List[dict]:
    """Fetch active wildfire hotspots from NASA FIRMS."""
    # Use the 24h global dataset (no API key required for this endpoint)
    url = f"{FIRMS_URL}/J1_VIIRS_C2_Global_{days}d.csv"

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        lines = response.text.strip().split('\n')
        if len(lines) < 2:
            return []

        headers = [h.strip() for h in lines[0].split(',')]
        fires = []
        for line in lines[1:1001]:  # Limit to 1000
            values = line.split(',')
            if len(values) < len(headers):
                continue
            row = dict(zip(headers, values))
            try:
                fires.append({
                    "id": f"{row.get('latitude','0')}_{row.get('longitude','0')}_{row.get('acq_date','')}_{row.get('acq_time','')}",
                    "lat": float(row.get('latitude', 0)),
                    "lon": float(row.get('longitude', 0)),
                    "brightness": float(row.get('bright_ti4', 0)),
                    "frp": float(row.get('frp', 0)),
                    "acqDate": row.get('acq_date', ''),
                    "acqTime": row.get('acq_time', ''),
                    "confidence": row.get('confidence', 'n'),
                    "satellite": row.get('satellite', 'VIIRS'),
                })
            except (ValueError, KeyError):
                continue
        return fires
    except Exception as e:
        logger.error(f"Failed to fetch wildfires: {e}")
        return []
