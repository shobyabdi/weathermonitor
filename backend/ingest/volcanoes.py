"""
Volcanic activity reports from Smithsonian GVP and USGS VHP.
"""
import logging
import re
from typing import Optional

from .news import fetch_rss_feed

logger = logging.getLogger(__name__)

_GVP_RSS_URL  = "https://volcano.si.edu/volcano_rss.cfm"
_USGS_VHP_URL = "https://volcanoes.usgs.gov/rss/vhp_update_rss.xml"

_VOLCANO_PATTERN = re.compile(
    r"^([A-Za-z\s'\-]+?)(?:\s+-\s+|\s*:\s*|(?=\s+Eruption))",
    re.IGNORECASE,
)


def _extract_volcano_name(title: str) -> Optional[str]:
    """
    Attempt to extract the volcano name from a report title.
    Looks for text before ' - ', ':', or 'Eruption'.
    """
    if not title:
        return None
    m = _VOLCANO_PATTERN.match(title.strip())
    if m:
        name = m.group(1).strip()
        return name if name else None
    # Fallback: first two words
    words = title.split()
    return " ".join(words[:2]) if words else None


def fetch_volcanic_activity() -> list:
    """
    Fetch current volcanic activity reports from Smithsonian GVP and USGS VHP.

    Returns
    -------
    list of dict
        Up to 20 combined, deduplicated items sorted by published date
        descending, each with title, link, published, summary, source,
        and volcano_name fields.
    """
    seen_titles: set = set()
    combined: list = []

    # --- Smithsonian GVP ---
    try:
        gvp_items = fetch_rss_feed(_GVP_RSS_URL, limit=50)
        for item in gvp_items:
            title = item.get("title", "")
            if title and title not in seen_titles:
                seen_titles.add(title)
                combined.append({
                    "title":        title,
                    "link":         item.get("link", ""),
                    "published":    item.get("published", ""),
                    "summary":      item.get("summary", ""),
                    "source":       "GVP",
                    "volcano_name": _extract_volcano_name(title),
                })
    except Exception as e:
        logger.error(f"Volcanoes: GVP RSS error: {e}")

    # --- USGS Volcano Hazards Program ---
    try:
        usgs_items = fetch_rss_feed(_USGS_VHP_URL, limit=50)
        for item in usgs_items:
            title = item.get("title", "")
            if title and title not in seen_titles:
                seen_titles.add(title)
                combined.append({
                    "title":        title,
                    "link":         item.get("link", ""),
                    "published":    item.get("published", ""),
                    "summary":      item.get("summary", ""),
                    "source":       "USGS_VHP",
                    "volcano_name": _extract_volcano_name(title),
                })
    except Exception as e:
        logger.error(f"Volcanoes: USGS VHP RSS error: {e}")

    # Sort by published descending (None/empty sorts last)
    combined.sort(key=lambda x: x.get("published") or "", reverse=True)
    return combined[:20]
