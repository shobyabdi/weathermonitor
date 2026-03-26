"""
NDBC (National Data Buoy Center) ocean buoy ingestion.
No API key required.
"""
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

NDBC_URL = "https://www.ndbc.noaa.gov/data/latest_obs/{station_id}.txt"

# Station ID → (name, lat, lon)
STATIONS: dict[str, tuple[str, float, float]] = {
    "41047": ("NE Caribbean", 27.514, -71.494),
    "41048": ("W Central N Atlantic", 31.978, -69.693),
    "44025": ("New York Harbor Approach", 40.251, -73.164),
    "46047": ("Tanner Banks", 32.433, -119.527),
    "51001": ("NW Hawaii", 23.445, -162.279),
}


def _parse_mm(value: str) -> Optional[float]:
    """Return float or None for NDBC missing-value sentinel 'MM'."""
    stripped = value.strip()
    if stripped in ("MM", "N/A", "", "-"):
        return None
    try:
        return float(stripped)
    except ValueError:
        return None


def _c_to_f(celsius: Optional[float]) -> Optional[float]:
    if celsius is None:
        return None
    return round(celsius * 9 / 5 + 32, 1)


def _m_to_ft(metres: Optional[float]) -> Optional[float]:
    if metres is None:
        return None
    return round(metres * 3.28084, 1)


def _ms_to_mph(ms: Optional[float]) -> Optional[float]:
    if ms is None:
        return None
    return round(ms * 2.23694, 1)


def _fetch_station(station_id: str, name: str, lat: float, lon: float) -> Optional[dict]:
    url = NDBC_URL.format(station_id=station_id)
    try:
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        lines = resp.text.splitlines()
    except requests.RequestException as e:
        logger.warning(f"NDBC station {station_id} fetch error: {e}")
        return None

    # Find header lines (start with #) and data line
    headers: list[str] = []
    values: list[str] = []
    for line in lines:
        if line.startswith("#"):
            # Strip leading # and split
            headers = line.lstrip("#").split()
        elif headers and not values:
            values = line.split()

    if not headers or not values:
        logger.warning(f"NDBC station {station_id}: could not parse data")
        return None

    # Build a mapping
    row: dict[str, str] = {}
    for i, h in enumerate(headers):
        if i < len(values):
            row[h] = values[i]

    # Extract fields — NDBC uses: WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
    wind_dir = row.get("WDIR", "MM")
    wind_spd = _ms_to_mph(_parse_mm(row.get("WSPD", "MM")))
    wave_ht = _m_to_ft(_parse_mm(row.get("WVHT", "MM")))
    pressure = _parse_mm(row.get("PRES", "MM"))
    air_temp = _c_to_f(_parse_mm(row.get("ATMP", "MM")))
    water_temp = _c_to_f(_parse_mm(row.get("WTMP", "MM")))

    # Timestamp from YY MM DD hh mm columns
    ts_parts = [row.get(k, "") for k in ["YY", "MM", "DD", "hh", "mm"]]
    timestamp = "-".join(ts_parts) if all(ts_parts) else None

    return {
        "id": station_id,
        "name": name,
        "lat": lat,
        "lon": lon,
        "water_temp_f": water_temp,
        "air_temp_f": air_temp,
        "wave_height_ft": wave_ht,
        "wind_speed_mph": wind_spd,
        "wind_dir": wind_dir if wind_dir != "MM" else None,
        "pressure_mb": pressure,
        "timestamp": timestamp,
    }


def fetch_buoys() -> list[dict]:
    """Fetch the latest observations from the configured NDBC stations."""
    results = []
    for station_id, (name, lat, lon) in STATIONS.items():
        data = _fetch_station(station_id, name, lat, lon)
        if data:
            results.append(data)
    return results
