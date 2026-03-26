"""
EPA AirNow — US air quality observations.
Requires AIRNOW_API_KEY environment variable (free at airnowapi.org).
"""
import logging
import os
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)

_TIMEOUT  = 10
_BASE_URL = "https://www.airnowapi.org/aq/observation/latLong/current/"


def fetch_airnow(lat: float, lon: float, distance: int = 25) -> list:
    """
    Fetch current US air quality observations near a lat/lon point.

    Parameters
    ----------
    lat : float
        Latitude of the point of interest.
    lon : float
        Longitude of the point of interest.
    distance : int
        Search radius in miles (default 25).

    Returns
    -------
    list of dict
        Normalized AQI observations; empty list if API key is missing or
        the request fails.
    """
    api_key = os.environ.get("AIRNOW_API_KEY", "").strip()
    if not api_key:
        logger.warning("AIRNOW_API_KEY not set — skipping AirNow fetch")
        return []

    params = {
        "latitude":  lat,
        "longitude": lon,
        "distance":  distance,
        "API_KEY":   api_key,
        "format":    "application/json",
    }

    try:
        resp = requests.get(_BASE_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"AirNow fetch error: {e}")
        return []
    except ValueError as e:
        logger.error(f"AirNow JSON parse error: {e}")
        return []

    results = []
    for obs in data:
        if not isinstance(obs, dict):
            continue
        try:
            date_str = obs.get("DateObserved", "").strip()
            hour     = obs.get("HourObserved", 0)
            tz_name  = obs.get("LocalTimeZone", "UTC")
            # Build a simple ISO-ish datetime string
            try:
                observed_at = f"{date_str}T{int(hour):02d}:00 {tz_name}"
            except (ValueError, TypeError):
                observed_at = date_str

            category     = obs.get("Category", {})
            cat_number   = category.get("Number", 0) if isinstance(category, dict) else 0
            cat_name     = category.get("Name", "")  if isinstance(category, dict) else str(category)

            results.append({
                "reporting_area":  obs.get("ReportingArea", ""),
                "state":           obs.get("StateCode", ""),
                "lat":             float(obs.get("Latitude",  0)),
                "lon":             float(obs.get("Longitude", 0)),
                "parameter":       obs.get("ParameterName", ""),
                "aqi":             int(obs.get("AQI", 0)),
                "category":        cat_name,
                "category_number": int(cat_number),
                "observed_at":     observed_at,
            })
        except (KeyError, TypeError, ValueError) as e:
            logger.warning(f"AirNow: skipping malformed observation: {e}")
            continue

    return results
