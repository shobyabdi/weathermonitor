"""
Global flood alerts via GDACS RSS and ReliefWeb API.
"""
import logging
from typing import Optional

import requests

from .news import fetch_rss_feed

logger = logging.getLogger(__name__)

_TIMEOUT       = 10
_GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
_RELIEFWEB_URL = "https://api.reliefweb.int/v1/disasters"


def _gdacs_severity(item: dict) -> str:
    """
    Attempt to parse GDACS event severity from the item summary or title.
    Falls back to 'unknown'.
    """
    text = (item.get("summary", "") + " " + item.get("title", "")).lower()
    if "red" in text:
        return "red"
    if "orange" in text:
        return "orange"
    if "green" in text:
        return "green"
    return "unknown"


def _fetch_reliefweb_floods() -> list:
    """Fetch recent flood disaster entries from ReliefWeb."""
    params = {
        "appname":             "weatherintel",
        "filter[field]":       "type.name",
        "filter[value]":       "Flood",
        "limit":               20,
        "sort[]":              "date:desc",
        "fields[include][]":   "name,date,status,country,type",
    }
    try:
        resp = requests.get(_RELIEFWEB_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"GloFAS/ReliefWeb fetch error: {e}")
        return []
    except ValueError as e:
        logger.error(f"GloFAS/ReliefWeb JSON parse error: {e}")
        return []

    items = []
    for entry in data.get("data", []):
        fields = entry.get("fields", {})
        name   = fields.get("name", "")
        date_info = fields.get("date", {})
        published = date_info.get("created", "") if isinstance(date_info, dict) else ""
        url    = entry.get("href", "")
        status = fields.get("status", "")

        country_list = fields.get("country", [])
        country_str  = ", ".join(
            c.get("name", "") for c in country_list if isinstance(c, dict)
        ) if isinstance(country_list, list) else ""

        summary = f"Status: {status}. Country: {country_str}." if country_str else f"Status: {status}."

        items.append({
            "title":     name,
            "link":      url,
            "published": published,
            "summary":   summary,
            "source":    "ReliefWeb",
            "severity":  "unknown",
        })

    return items


def fetch_glofas_alerts() -> list:
    """
    Fetch current global flood alerts from GDACS RSS and ReliefWeb.

    Returns
    -------
    list of dict
        Up to 20 combined, deduplicated flood alerts sorted by published
        date descending, each with title, link, published, summary,
        source, and severity fields.
    """
    seen_titles: set = set()
    combined: list = []

    # --- GDACS RSS ---
    try:
        gdacs_items = fetch_rss_feed(_GDACS_RSS_URL, limit=100)
        for item in gdacs_items:
            title = item.get("title", "")
            if not title:
                continue
            # Filter to flood items
            if "flood" not in title.lower():
                continue
            if title not in seen_titles:
                seen_titles.add(title)
                combined.append({
                    "title":     title,
                    "link":      item.get("link", ""),
                    "published": item.get("published", ""),
                    "summary":   item.get("summary", ""),
                    "source":    "GDACS",
                    "severity":  _gdacs_severity(item),
                })
    except Exception as e:
        logger.error(f"GloFAS: GDACS RSS error: {e}")

    # --- ReliefWeb ---
    try:
        rw_items = _fetch_reliefweb_floods()
        for item in rw_items:
            title = item.get("title", "")
            if title and title not in seen_titles:
                seen_titles.add(title)
                combined.append(item)
    except Exception as e:
        logger.error(f"GloFAS: ReliefWeb error: {e}")

    combined.sort(key=lambda x: x.get("published") or "", reverse=True)
    return combined[:20]
