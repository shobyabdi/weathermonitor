import requests
import logging
from typing import List
import re
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

NHC_ATLANTIC_RSS = "https://www.nhc.noaa.gov/index-at.xml"
NHC_PACIFIC_RSS = "https://www.nhc.noaa.gov/index-ep.xml"


def _parse_nhc_rss(url: str, basin: str) -> List[dict]:
    """Fetch and parse NHC RSS feed, return list of storm dicts."""
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "WeatherIntelligence/1.0"})
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
    except Exception as e:
        logger.error(f"Failed to fetch {basin} NHC RSS: {e}")
        return []

    channel = root.find("channel")
    if channel is None:
        return []

    storms = []
    for item in channel.findall("item"):
        title_el = item.find("title")
        desc_el = item.find("description")
        title = (title_el.text or "").strip() if title_el is not None else ""
        summary = (desc_el.text or "").strip() if desc_el is not None else ""

        if "Advisory" in title or "Special" in title:
            storm = parse_advisory(title, summary, basin)
            if storm:
                storms.append(storm)

    return storms


def fetch_tropical_storms() -> List[dict]:
    """Fetch active tropical systems from NHC RSS feeds."""
    storms = []
    for basin, url in [("Atlantic", NHC_ATLANTIC_RSS), ("East Pacific", NHC_PACIFIC_RSS)]:
        storms.extend(_parse_nhc_rss(url, basin))
    return storms


def parse_advisory(title: str, summary: str, basin: str) -> dict | None:
    """Parse storm advisory text."""
    name_match = re.search(
        r'(Hurricane|Tropical Storm|Tropical Depression|Subtropical Storm)\s+([A-Z][a-z]+)',
        title,
    )
    if not name_match:
        return None

    storm_type = name_match.group(1)
    storm_name = name_match.group(2)

    wind_match = re.search(
        r'(\d+)\s*(?:mph|MPH|kt|KT)\s*(?:max|maximum)?\s*(?:sustained)?\s*winds',
        summary,
        re.IGNORECASE,
    )
    wind_speed = int(wind_match.group(1)) if wind_match else 0

    cat = 0
    if storm_type == "Hurricane":
        if wind_speed >= 157:
            cat = 5
        elif wind_speed >= 130:
            cat = 4
        elif wind_speed >= 111:
            cat = 3
        elif wind_speed >= 96:
            cat = 2
        else:
            cat = 1

    return {
        "id": f"{basin.lower().replace(' ', '_')}_{storm_name.lower()}",
        "name": storm_name,
        "type": storm_type,
        "basin": basin,
        "category": cat,
        "windSpeed": wind_speed,
        "pressure": 0,
        "lat": 0,
        "lon": 0,
        "movement": "",
        "summary": summary[:500],
    }
