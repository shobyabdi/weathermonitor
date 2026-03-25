import feedparser
import requests
import logging
from typing import List
import re

logger = logging.getLogger(__name__)

NHC_ATLANTIC_RSS = "https://www.nhc.noaa.gov/index-at.xml"
NHC_PACIFIC_RSS = "https://www.nhc.noaa.gov/index-ep.xml"

def fetch_tropical_storms() -> List[dict]:
    """Fetch active tropical systems from NHC RSS feeds."""
    storms = []

    for basin, url in [("Atlantic", NHC_ATLANTIC_RSS), ("East Pacific", NHC_PACIFIC_RSS)]:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                title = entry.get('title', '')
                summary = entry.get('summary', '')

                # Check if it's an advisory entry
                if 'Advisory' in title or 'Special' in title:
                    storm = parse_advisory(title, summary, basin)
                    if storm:
                        storms.append(storm)
        except Exception as e:
            logger.error(f"Failed to fetch {basin} tropical data: {e}")

    return storms

def parse_advisory(title: str, summary: str, basin: str) -> dict | None:
    """Parse storm advisory text."""
    # Extract basic info from advisory text
    name_match = re.search(
        r'(Hurricane|Tropical Storm|Tropical Depression|Subtropical Storm)\s+([A-Z][a-z]+)',
        title
    )
    if not name_match:
        return None

    storm_type = name_match.group(1)
    storm_name = name_match.group(2)

    # Extract wind speed
    wind_match = re.search(
        r'(\d+)\s*(?:mph|MPH|kt|KT)\s*(?:max|maximum)?\s*(?:sustained)?\s*winds',
        summary,
        re.IGNORECASE
    )
    wind_speed = int(wind_match.group(1)) if wind_match else 0

    # Determine category
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
