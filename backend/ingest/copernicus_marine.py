"""
Sea surface temperature anomaly data via NOAA CoastWatch ERDDAP.
(Same satellite data as Copernicus, served through a public ERDDAP instance.)
"""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_TIMEOUT  = 20
_ERDDAP_BASE = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41anom1day.json"


def fetch_sst_anomaly(
    lat_min: float = 15,
    lat_max: float = 50,
    lon_min: float = -100,
    lon_max: float = -60,
) -> dict:
    """
    Fetch sea surface temperature anomaly data from NOAA CoastWatch ERDDAP.

    Parameters
    ----------
    lat_min, lat_max : float
        Latitude bounds of the query region.
    lon_min, lon_max : float
        Longitude bounds of the query region.

    Returns
    -------
    dict
        Region metadata, mean/max/min SST anomaly, warm/cold area
        percentages, data timestamp, and fetch timestamp.
        Returns empty dict {} if the request fails or times out.
    """
    # ERDDAP griddap query string format:
    # variable[(time_spec)][lat_spec][lon_spec]
    # Using "last" for time, and range brackets for lat/lon
    query = (
        f"analysed_sst_anomaly"
        f"[(last)]"
        f"[({lat_min}):({lat_max})]"
        f"[({lon_min}):({lon_max})]"
    )
    url = f"{_ERDDAP_BASE}?{query}"

    try:
        resp = requests.get(url, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        logger.error("CoastWatch ERDDAP request timed out")
        return {}
    except requests.RequestException as e:
        logger.error(f"CoastWatch ERDDAP fetch error: {e}")
        return {}
    except ValueError as e:
        logger.error(f"CoastWatch ERDDAP JSON parse error: {e}")
        return {}

    # ERDDAP JSON format: {"table": {"columnNames": [...], "rows": [...]}}
    try:
        table        = data.get("table", {})
        column_names = table.get("columnNames", [])
        rows         = table.get("rows", [])

        # Find index of the SST anomaly column
        sst_col: Optional[int] = None
        time_col: Optional[int] = None
        for i, name in enumerate(column_names):
            if "sst_anomaly" in name.lower() or "analysed_sst" in name.lower():
                sst_col = i
            if name.lower() == "time":
                time_col = i

        if sst_col is None:
            logger.error("CoastWatch ERDDAP: could not find SST anomaly column")
            return {}

        values = []
        data_time = ""
        for row in rows:
            if time_col is not None and not data_time:
                data_time = str(row[time_col]) if row[time_col] is not None else ""
            try:
                val = row[sst_col]
                if val is not None:
                    values.append(float(val))
            except (TypeError, ValueError, IndexError):
                continue

        if not values:
            logger.warning("CoastWatch ERDDAP: no valid SST anomaly values in response")
            return {}

        total       = len(values)
        mean_anom   = sum(values) / total
        max_anom    = max(values)
        min_anom    = min(values)
        warm_count  = sum(1 for v in values if v > 1.0)
        cold_count  = sum(1 for v in values if v < -1.0)

        return {
            "region": {
                "lat_min": lat_min,
                "lat_max": lat_max,
                "lon_min": lon_min,
                "lon_max": lon_max,
            },
            "mean_anomaly_c": round(mean_anom, 3),
            "max_anomaly_c":  round(max_anom, 3),
            "min_anomaly_c":  round(min_anom, 3),
            "warm_area_pct":  round(100.0 * warm_count / total, 2),
            "cold_area_pct":  round(100.0 * cold_count / total, 2),
            "data_time":      data_time,
            "fetched_at":     time.time(),
        }

    except (KeyError, IndexError, TypeError) as e:
        logger.error(f"CoastWatch ERDDAP parse error: {e}")
        return {}
