import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

RAINVIEWER_URL = "https://api.rainviewer.com/public/weather-maps.json"

def fetch_radar_frames() -> Optional[dict]:
    """Fetch available RainViewer radar frame timestamps."""
    try:
        response = requests.get(RAINVIEWER_URL, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "generated": data.get("generated"),
            "host": data.get("host", "https://tilecache.rainviewer.com"),
            "radar": {
                "past": data.get("radar", {}).get("past", []),
                "nowcast": data.get("radar", {}).get("nowcast", []),
            }
        }
    except Exception as e:
        logger.error(f"Failed to fetch radar frames: {e}")
        return None
