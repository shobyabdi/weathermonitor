"""
NOAA Tides & Currents — water level observations and tide predictions.
"""
import logging
import time
from datetime import datetime, timedelta
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 15
_BASE_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"

_DEFAULT_STATIONS = [
    "8518750",  # The Battery, NY
    "8723214",  # Virginia Key, FL
    "8726520",  # St. Petersburg, FL
    "8771341",  # Galveston Pleasure Pier, TX
    "9414290",  # San Francisco, CA
    "9447130",  # Seattle, WA
    "8413320",  # Bar Harbor, ME
    "8665530",  # Charleston, SC
]

_COMMON_PARAMS = {
    "datum":     "MLLW",
    "time_zone": "gmt",
    "units":     "english",
    "format":    "json",
}


def _flood_status(deviation: Optional[float]) -> str:
    if deviation is None:
        return "normal"
    abs_dev = abs(deviation)
    if abs_dev < 1:
        return "normal"
    if abs_dev < 2:
        return "elevated"
    if abs_dev < 3:
        return "high"
    return "flood"


def _fetch_station(station_id: str, begin_date: str, end_date: str) -> dict:
    """Fetch water_level and predictions for one station."""

    base_result: dict = {
        "station_id":      station_id,
        "name":            "",
        "lat":             None,
        "lon":             None,
        "current_level_ft": None,
        "mean_level_ft":   None,
        "deviation_ft":    None,
        "status":          "normal",
        "predictions":     [],
        "fetched_at":      time.time(),
    }

    # --- Water level (observations) ---
    obs_params = {
        **_COMMON_PARAMS,
        "begin_date": begin_date,
        "end_date":   end_date,
        "station":    station_id,
        "product":    "water_level",
    }
    try:
        resp = requests.get(_BASE_URL, params=obs_params, timeout=_TIMEOUT)
        resp.raise_for_status()
        obs_data = resp.json()

        metadata = obs_data.get("metadata", {})
        base_result["name"] = metadata.get("name", "")
        try:
            base_result["lat"] = float(metadata.get("lat", 0))
            base_result["lon"] = float(metadata.get("lon", 0))
        except (ValueError, TypeError):
            pass

        observations = obs_data.get("data", [])
        if observations:
            values = []
            for obs in observations:
                try:
                    values.append(float(obs.get("v", 0)))
                except (ValueError, TypeError):
                    pass
            if values:
                base_result["current_level_ft"] = values[-1]
                base_result["mean_level_ft"] = sum(values) / len(values)
                if base_result["current_level_ft"] is not None and base_result["mean_level_ft"] is not None:
                    base_result["deviation_ft"] = base_result["current_level_ft"] - base_result["mean_level_ft"]
                    base_result["status"] = _flood_status(base_result["deviation_ft"])

    except requests.RequestException as e:
        logger.error(f"Tides water_level fetch error for station {station_id}: {e}")
    except (ValueError, KeyError) as e:
        logger.error(f"Tides water_level parse error for station {station_id}: {e}")

    # --- Predictions ---
    pred_params = {
        **_COMMON_PARAMS,
        "begin_date": begin_date,
        "end_date":   end_date,
        "station":    station_id,
        "product":    "predictions",
        "interval":   "hilo",
    }
    try:
        resp = requests.get(_BASE_URL, params=pred_params, timeout=_TIMEOUT)
        resp.raise_for_status()
        pred_data = resp.json()

        predictions = pred_data.get("predictions", [])
        result_preds = []
        for p in predictions[:24]:  # next ~12 hours of hi/lo tides
            try:
                result_preds.append({"t": p.get("t", ""), "v": float(p.get("v", 0))})
            except (ValueError, TypeError):
                pass
        base_result["predictions"] = result_preds

    except requests.RequestException as e:
        logger.error(f"Tides predictions fetch error for station {station_id}: {e}")
    except (ValueError, KeyError) as e:
        logger.error(f"Tides predictions parse error for station {station_id}: {e}")

    return base_result


def fetch_tidal_data(station_ids: list = None) -> list:
    """
    Fetch water level and tide predictions for key coastal stations.

    Parameters
    ----------
    station_ids : list of str, optional
        NOAA station IDs to query. Defaults to 8 major US coastal stations.

    Returns
    -------
    list of dict
        One entry per station with water level, deviation, flood status,
        and tide predictions.
    """
    if station_ids is None:
        station_ids = _DEFAULT_STATIONS

    today = datetime.utcnow()
    begin_date = today.strftime("%Y%m%d")
    end_date = (today + timedelta(days=1)).strftime("%Y%m%d")

    results = []
    for sid in station_ids:
        try:
            results.append(_fetch_station(sid, begin_date, end_date))
        except Exception as e:
            logger.error(f"Tides: unexpected error for station {sid}: {e}")

    return results
