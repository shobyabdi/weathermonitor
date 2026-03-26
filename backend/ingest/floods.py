"""
USGS Streamflow (river gauge) ingestion.
No API key required.
"""
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

USGS_IV_URL = "https://waterservices.usgs.gov/nwis/iv/"

# Parameter codes
PARAM_DISCHARGE = "00060"   # Discharge, ft³/s
PARAM_GAUGE_HT = "00065"   # Gauge height, ft


def _safe_float(value: str) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _gauge_status(gauge_ht: Optional[float], flood_stage: Optional[float], action_stage: Optional[float]) -> str:
    if gauge_ht is None:
        return "unknown"
    if flood_stage and gauge_ht >= flood_stage * 1.5:
        return "major_flood"
    if flood_stage and gauge_ht >= flood_stage:
        return "flood"
    if action_stage and gauge_ht >= action_stage:
        return "action"
    return "normal"


def fetch_river_gauges(state: str = "all") -> list[dict]:
    """
    Fetch active USGS streamflow gauges.
    If state != 'all', filter by two-letter state code (e.g. 'TX').
    Returns up to 200 gauges.
    """
    params: dict = {
        "format": "json",
        "parameterCd": f"{PARAM_DISCHARGE},{PARAM_GAUGE_HT}",
        "siteStatus": "active",
        "period": "PT2H",
        "siteType": "ST",
    }
    if state.lower() != "all":
        params["stateCd"] = state.upper()

    try:
        resp = requests.get(USGS_IV_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"USGS streamflow fetch error: {e}")
        return []

    time_series = data.get("value", {}).get("timeSeries", [])

    # Group by site number
    sites: dict[str, dict] = {}
    for ts in time_series:
        site_info = ts.get("sourceInfo", {})
        site_no = site_info.get("siteCode", [{}])[0].get("value", "")
        if not site_no:
            continue

        geo = site_info.get("geoLocation", {}).get("geogLocation", {})
        lat = _safe_float(geo.get("latitude"))
        lon = _safe_float(geo.get("longitude"))

        if site_no not in sites:
            sites[site_no] = {
                "id": site_no,
                "name": site_info.get("siteName", "Unknown"),
                "lat": lat,
                "lon": lon,
                "discharge_cfs": None,
                "gauge_height_ft": None,
                "action_stage": None,
                "flood_stage": None,
                "status": "unknown",
            }

        # Extract latest value
        variable = ts.get("variable", {})
        param_code = variable.get("variableCode", [{}])[0].get("value", "")
        values_list = ts.get("values", [{}])[0].get("value", [])
        latest_value = None
        if values_list:
            raw = values_list[-1].get("value")
            if raw not in (None, "-999999"):
                latest_value = _safe_float(raw)

        if param_code == PARAM_DISCHARGE:
            sites[site_no]["discharge_cfs"] = latest_value
        elif param_code == PARAM_GAUGE_HT:
            sites[site_no]["gauge_height_ft"] = latest_value

    # Compute status for each site
    results = []
    for site in list(sites.values())[:200]:
        site["status"] = _gauge_status(
            site["gauge_height_ft"],
            site["flood_stage"],
            site["action_stage"],
        )
        results.append(site)

    return results
