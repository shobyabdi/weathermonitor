"""
EMSC (European Mediterranean Seismological Centre) earthquake data.
Complements USGS with European/Mediterranean coverage.
"""
import logging
import time
from datetime import datetime, timedelta, timezone

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 10
_EMSC_URL = "https://www.seismicportal.eu/fdsnws/event/1/query"


def fetch_emsc_earthquakes(min_magnitude: float = 2.5, hours: int = 24) -> list:
    """
    Fetch recent earthquakes from the EMSC FDSN web service.

    Parameters
    ----------
    min_magnitude : float
        Minimum magnitude threshold (default 2.5).
    hours : int
        How many hours back to search (default 24).

    Returns
    -------
    list of dict
        Normalized earthquake records matching the USGS schema used in
        earthquakes.py, with an added "source" field set to "EMSC".
    """
    end_time = datetime.now(tz=timezone.utc)
    start_time = end_time - timedelta(hours=hours)

    params = {
        "format":        "json",
        "minmagnitude":  min_magnitude,
        "limit":         100,
        "orderby":       "time",
        "starttime":     start_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "endtime":       end_time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    try:
        resp = requests.get(_EMSC_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"EMSC fetch error: {e}")
        return []
    except ValueError as e:
        logger.error(f"EMSC JSON parse error: {e}")
        return []

    features = data.get("features", [])
    cutoff_ms = int(start_time.timestamp() * 1000)
    results = []

    for feature in features:
        try:
            props = feature.get("properties", {})
            geom  = feature.get("geometry", {})
            coords = geom.get("coordinates", [0, 0, 0])

            # EMSC returns time as ISO string in properties.time
            raw_time = props.get("time", "")
            if raw_time:
                try:
                    dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
                    time_ms = int(dt.timestamp() * 1000)
                except ValueError:
                    time_ms = 0
            else:
                time_ms = 0

            # Filter to requested time window
            if time_ms < cutoff_ms:
                continue

            results.append({
                "id":        feature.get("id", props.get("unid", "")),
                "magnitude": float(props.get("mag", 0)),
                "place":     props.get("flynn_region", props.get("place", "")),
                "time":      time_ms,
                "lat":       float(coords[1]) if len(coords) > 1 else 0.0,
                "lon":       float(coords[0]) if len(coords) > 0 else 0.0,
                "depth_km":  float(coords[2]) if len(coords) > 2 else 0.0,
                "source":    "EMSC",
            })
        except (KeyError, IndexError, TypeError, ValueError) as e:
            logger.warning(f"EMSC: skipping malformed feature: {e}")
            continue

    return results
