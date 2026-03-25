import requests
import logging
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

NWS_URL = "https://api.weather.gov/alerts/active"
HEADERS = {"User-Agent": "WeatherIntelligence/1.0 (contact@example.com)"}

def fetch_nws_alerts(
    area: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 500
) -> List[dict]:
    """Fetch active NWS CAP alerts."""
    params = {"status": "actual", "limit": limit}
    if area:
        params["area"] = area
    if severity:
        params["severity"] = severity

    try:
        response = requests.get(NWS_URL, params=params, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()
        alerts = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            # Compute centroid if geometry available
            centroid = None
            if geom and geom.get("type") == "Polygon":
                coords = geom["coordinates"][0]
                if coords:
                    avg_lon = sum(c[0] for c in coords) / len(coords)
                    avg_lat = sum(c[1] for c in coords) / len(coords)
                    centroid = [avg_lon, avg_lat]

            alerts.append({
                "id": props.get("id", ""),
                "event": props.get("event", ""),
                "severity": props.get("severity", "Unknown"),
                "urgency": props.get("urgency", ""),
                "headline": props.get("headline", ""),
                "description": props.get("description", ""),
                "instruction": props.get("instruction", ""),
                "areaDesc": props.get("areaDesc", ""),
                "onset": props.get("onset", ""),
                "expires": props.get("expires", ""),
                "geometry": geom,
                "centroid": centroid,
                "sent": props.get("sent", ""),
            })
        return alerts
    except Exception as e:
        logger.error(f"Failed to fetch NWS alerts: {e}")
        return []

def compute_alert_score(alerts: List[dict]) -> float:
    """Convert alert list to 0-25 storm score contribution."""
    severity_weights = {
        "Extreme": 25, "Severe": 18, "Moderate": 10, "Minor": 3
    }
    if not alerts:
        return 0.0
    max_score = max(severity_weights.get(a.get("severity", ""), 0) for a in alerts)
    return float(min(max_score, 25))
