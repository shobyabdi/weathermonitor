"""
RSS/Atom feed proxy ingestion.
"""
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)


def _parse_rfc2822(date_str: str) -> Optional[str]:
    """Parse RFC 2822 date (RSS pubDate) → ISO string."""
    try:
        dt = parsedate_to_datetime(date_str)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return date_str


def _parse_iso(date_str: str) -> Optional[str]:
    """Return ISO date string as-is (Atom published)."""
    return date_str.strip() if date_str else None


def _strip_cdata(text: Optional[str]) -> str:
    if not text:
        return ""
    # Remove CDATA wrappers if present
    text = text.strip()
    if text.startswith("<![CDATA[") and text.endswith("]]>"):
        text = text[9:-3]
    return text.strip()


def fetch_rss_feed(url: str, limit: int = 50) -> list[dict]:
    """
    Fetch and parse an RSS 2.0 or Atom feed.
    Returns up to `limit` items sorted by published date descending.
    """
    try:
        resp = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": "WeatherIntelligence/1.0 (+https://github.com/shobyabdi/weathermonitor)"},
        )
        resp.raise_for_status()
        content = resp.text
    except requests.RequestException as e:
        logger.error(f"RSS fetch error for {url}: {e}")
        return []

    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        logger.error(f"RSS parse error for {url}: {e}")
        return []

    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "media": "http://search.yahoo.com/mrss/",
    }

    items: list[dict] = []

    # Detect feed type
    tag = root.tag.lower()
    is_atom = "atom" in tag or root.tag == "{http://www.w3.org/2005/Atom}feed"

    if is_atom:
        # Atom feed
        entries = root.findall("{http://www.w3.org/2005/Atom}entry")
        for entry in entries[:limit]:
            title_el = entry.find("{http://www.w3.org/2005/Atom}title")
            link_el = entry.find("{http://www.w3.org/2005/Atom}link")
            pub_el = entry.find("{http://www.w3.org/2005/Atom}published") or entry.find("{http://www.w3.org/2005/Atom}updated")
            summary_el = entry.find("{http://www.w3.org/2005/Atom}summary") or entry.find("{http://www.w3.org/2005/Atom}content")

            title = _strip_cdata(title_el.text if title_el is not None else "")
            link = link_el.get("href", "") if link_el is not None else ""
            published = _parse_iso(pub_el.text if pub_el is not None else "")
            summary = _strip_cdata(summary_el.text if summary_el is not None else "")

            items.append({
                "title": title,
                "link": link,
                "published": published,
                "summary": summary[:500],
                "source": url,
            })
    else:
        # RSS 2.0 — channel/item
        channel = root.find("channel")
        if channel is None:
            channel = root

        for item in channel.findall("item")[:limit]:
            title_el = item.find("title")
            link_el = item.find("link")
            pub_el = item.find("pubDate")
            desc_el = item.find("description")

            title = _strip_cdata(title_el.text if title_el is not None else "")
            link = (link_el.text or "").strip() if link_el is not None else ""
            published = _parse_rfc2822(pub_el.text or "") if pub_el is not None else None
            summary = _strip_cdata(desc_el.text if desc_el is not None else "")

            items.append({
                "title": title,
                "link": link,
                "published": published,
                "summary": summary[:500],
                "source": url,
            })

    # Sort by published descending (None sorts last)
    items.sort(key=lambda x: x.get("published") or "", reverse=True)
    return items[:limit]
