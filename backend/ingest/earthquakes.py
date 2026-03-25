import requests
import logging
from typing import List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"

def fetch_earthquakes(
    min_magnitude: float = 2.5,
    hours: int = 24,
    limit: int = 200
) -> List[dict]:
    """Fetch recent earthquakes from USGS."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)

    params = {
        "format": "geojson",
        "starttime": start_time.isoformat(),
        "endtime": end_time.isoformat(),
        "minmagnitude": min_magnitude,
        "limit": limit,
        "orderby": "magnitude",
    }

    try:
        response = requests.get(USGS_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        quakes = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            coords = feature["geometry"]["coordinates"]
            quakes.append({
                "id": feature.get("id", ""),
                "magnitude": props.get("mag", 0),
                "place": props.get("place", ""),
                "time": props.get("time", 0),
                "lat": coords[1],
                "lon": coords[0],
                "depth": coords[2],
                "url": props.get("url", ""),
                "tsunami": props.get("tsunami", 0),
                "felt": props.get("felt", 0),
            })
        return quakes
    except Exception as e:
        logger.error(f"Failed to fetch earthquakes: {e}")
        return []
