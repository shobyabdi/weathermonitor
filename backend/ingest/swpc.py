"""
NOAA Space Weather Prediction Center (SWPC) conditions.
"""
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 10

_KP_URL     = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
_PLASMA_URL = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
_ALERTS_URL = "https://services.swpc.noaa.gov/products/alerts.json"


def _kp_level(kp: float) -> str:
    if kp <= 2:
        return "quiet"
    if kp == 3:
        return "unsettled"
    if kp == 4:
        return "active"
    if kp <= 6:
        return "storm"
    if kp <= 8:
        return "severe_storm"
    return "extreme"


def _fetch_json(url: str):
    """Return parsed JSON or None on error."""
    try:
        resp = requests.get(url, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f"SWPC fetch error for {url}: {e}")
        return None
    except ValueError as e:
        logger.error(f"SWPC JSON parse error for {url}: {e}")
        return None


def fetch_space_weather() -> dict:
    """
    Fetch current space weather conditions from NOAA SWPC.

    Returns a dict with Kp index, solar wind speed, active alerts,
    grid risk flag, aurora visibility flag, and fetch timestamp.
    """
    # --- Kp index ---
    kp_value: float = 0.0
    kp_data = _fetch_json(_KP_URL)
    if kp_data and isinstance(kp_data, list):
        # Skip header row (first element is a list of column names)
        rows = [r for r in kp_data if isinstance(r, list) and len(r) >= 2]
        # Skip header if first element is a string
        data_rows = [r for r in rows if not isinstance(r[0], str) or r[0][0].isdigit()]
        # Take last 24 entries
        recent = data_rows[-24:] if len(data_rows) > 24 else data_rows
        if recent:
            try:
                kp_value = float(recent[-1][1])
            except (ValueError, TypeError) as e:
                logger.warning(f"SWPC: could not parse Kp value: {e}")

    # --- Solar wind speed ---
    solar_wind_speed: Optional[float] = None
    plasma_data = _fetch_json(_PLASMA_URL)
    if plasma_data and isinstance(plasma_data, list):
        # Format: [time_tag, density, speed, temperature]; skip header row
        data_rows = [r for r in plasma_data if isinstance(r, list) and len(r) >= 3
                     and not isinstance(r[0], str) or (
                         isinstance(r[0], str) and r[0][0].isdigit()
                     )]
        # Rebuild properly: filter rows where index 0 looks like a timestamp
        plasma_rows = []
        for r in plasma_data:
            if isinstance(r, list) and len(r) >= 3 and isinstance(r[0], str):
                if r[0][0].isdigit():
                    plasma_rows.append(r)
        if plasma_rows:
            try:
                solar_wind_speed = float(plasma_rows[-1][2])
            except (ValueError, TypeError) as e:
                logger.warning(f"SWPC: could not parse solar wind speed: {e}")

    # --- Active alerts ---
    active_alerts: list = []
    alerts_data = _fetch_json(_ALERTS_URL)
    if alerts_data and isinstance(alerts_data, list):
        keywords = ("WARNING", "WATCH", "ALERT")
        filtered = [
            a for a in alerts_data
            if isinstance(a, dict)
            and any(kw in a.get("message", "").upper() for kw in keywords)
        ]
        for alert in filtered[:10]:
            active_alerts.append({
                "message": alert.get("message", ""),
                "issued":  alert.get("issue_datetime", ""),
            })

    return {
        "kp_index":            kp_value,
        "kp_level":            _kp_level(kp_value),
        "solar_wind_speed_kms": solar_wind_speed,
        "active_alerts":       active_alerts,
        "grid_risk":           kp_value >= 5,
        "aurora_visible":      kp_value >= 5,
        "fetched_at":          time.time(),
    }
