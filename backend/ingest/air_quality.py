"""
OpenAQ air quality ingestion.
Free API key available at explore.openaq.org — optional but raises rate limits.
"""
import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)

OPENAQ_URL = "https://api.openaq.org/v3/locations"


def _pm25_to_aqi_category(pm25: Optional[float]) -> str:
    if pm25 is None:
        return "unknown"
    if pm25 <= 50:
        return "good"
    if pm25 <= 100:
        return "moderate"
    if pm25 <= 150:
        return "unhealthy_sensitive"
    if pm25 <= 200:
        return "unhealthy"
    if pm25 <= 300:
        return "very_unhealthy"
    return "hazardous"


def fetch_air_quality(lat: float, lon: float, radius: int = 25000) -> list[dict]:
    """
    Fetch air quality stations near the given coordinates from OpenAQ v3.
    radius is in metres (default 25 km).
    """
    api_key = os.environ.get("OPENAQ_API_KEY", "")
    headers = {"X-API-Key": api_key} if api_key else {}

    params = {
        "coordinates": f"{lat},{lon}",
        "radius": radius,
        "limit": 20,
        "order_by": "distance",
    }

    try:
        resp = requests.get(OPENAQ_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"OpenAQ fetch error: {e}")
        return []

    results = []
    for loc in data.get("results", []):
        coords = loc.get("coordinates") or {}
        # Extract PM2.5 if available
        pm25_val: Optional[float] = None
        dominant: str = "unknown"
        measurements: list[dict] = []

        for sensor in loc.get("sensors", []):
            param = sensor.get("name", "")
            latest = sensor.get("latest", {})
            value = latest.get("value")
            if value is not None:
                measurements.append({"parameter": param, "value": value, "unit": sensor.get("units", "")})
                if param == "pm25":
                    pm25_val = float(value)
                    dominant = "pm25"

        results.append({
            "id": loc.get("id"),
            "name": loc.get("name", "Unknown"),
            "lat": coords.get("latitude"),
            "lon": coords.get("longitude"),
            "aqi": pm25_val,
            "dominant_pollutant": dominant,
            "aqi_category": _pm25_to_aqi_category(pm25_val),
            "measurements": measurements,
            "distance_km": round(loc.get("distance", 0) / 1000, 1) if loc.get("distance") else None,
        })

    return results
