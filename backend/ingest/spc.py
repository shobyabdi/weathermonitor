"""
NOAA Storm Prediction Center (SPC) severe weather outlooks.
"""
import logging
import time

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 10
_EMPTY_FC = {"type": "FeatureCollection", "features": []}

_URLS = {
    "categorical": "https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson",
    "tornado":     "https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson",
    "wind":        "https://www.spc.noaa.gov/products/outlook/day1otlk_wind.nolyr.geojson",
    "hail":        "https://www.spc.noaa.gov/products/outlook/day1otlk_hail.nolyr.geojson",
}


def _fetch_geojson(url: str) -> dict:
    """Fetch a GeoJSON URL and return parsed dict, or empty FeatureCollection on error."""
    try:
        resp = requests.get(url, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        # Ensure it looks like a FeatureCollection
        if not isinstance(data, dict) or "features" not in data:
            logger.warning(f"SPC: unexpected structure from {url}")
            return dict(_EMPTY_FC)
        return data
    except requests.RequestException as e:
        logger.error(f"SPC fetch error for {url}: {e}")
        return dict(_EMPTY_FC)
    except ValueError as e:
        logger.error(f"SPC JSON parse error for {url}: {e}")
        return dict(_EMPTY_FC)


def fetch_spc_outlooks() -> dict:
    """
    Fetch SPC day-1 categorical, tornado, wind, and hail outlooks.

    Returns a dict with keys: categorical, tornado, wind, hail (each a GeoJSON
    FeatureCollection), valid_time (str), and fetched_at (float).
    """
    result: dict = {}

    for key, url in _URLS.items():
        result[key] = _fetch_geojson(url)

    # Extract valid_time from first feature of categorical outlook (or any available)
    valid_time = ""
    for key in ("categorical", "tornado", "wind", "hail"):
        features = result.get(key, {}).get("features", [])
        if features:
            props = features[0].get("properties", {})
            valid_time = props.get("VALID") or props.get("EXPIRE") or ""
            if valid_time:
                break

    result["valid_time"] = valid_time
    result["fetched_at"] = time.time()
    return result
