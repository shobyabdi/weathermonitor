"""
Alert aggregator — pulls from multiple sources and normalizes to WeatherAlert shape.

Sources:
  1. NWS API          — official government alerts (primary)
  2. NWS LOT products — watches/warnings text from Chicago/Romeoville office
  3. NBC Chicago RSS  — breaking weather news headlines
"""
import hashlib
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests

from ingest.weather_alerts import fetch_nws_alerts

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "WeatherIntelligence/1.0 (contact@example.com)"}

# Keywords that signal an NBC headline is alert-worthy
ALERT_KEYWORDS = re.compile(
    r'\b(warning|watch|advisory|tornado|severe|storm|flood|blizzard|'
    r'hurricane|heat|freeze|wind|hail|lightning|thunderstorm|outbreak|'
    r'dangerous|emergency|evacuation|shelter)\b',
    re.IGNORECASE,
)

# NWS LOT product types to pull (in priority order)
LOT_PRODUCT_TYPES = ["TOR", "SVR", "FFW", "WSW", "WCA", "AFL", "AFD"]


def _stable_id(*parts: str) -> str:
    return "agg-" + hashlib.md5("-".join(parts).encode()).hexdigest()[:12]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expires_iso(hours: int = 2) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _classify_severity(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["tornado warning", "particularly dangerous", "confirmed tornado", "pds"]):
        return "Extreme"
    if any(w in t for w in ["severe thunderstorm warning", "flash flood warning", "tornado watch"]):
        return "Severe"
    if any(w in t for w in ["watch", "advisory", "flood warning"]):
        return "Moderate"
    return "Minor"


# ── NWS LOT office products ───────────────────────────────────────────────────

def _fetch_lot_products() -> list[dict]:
    """Pull latest watch/warning products from NWS LOT office."""
    alerts = []
    for ptype in LOT_PRODUCT_TYPES:
        try:
            resp = requests.get(
                f"https://api.weather.gov/products/types/{ptype}/locations/LOT",
                headers=HEADERS, timeout=10,
            )
            if not resp.ok:
                continue
            graph = resp.json().get("@graph", [])
            if not graph:
                continue
            product_url = graph[0]["@id"]
            prod = requests.get(product_url, headers=HEADERS, timeout=10)
            if not prod.ok:
                continue
            data = prod.json()
            text = data.get("productText", "")
            issued = data.get("issuanceTime", _now_iso())

            # Skip if older than 6 hours
            try:
                issued_dt = datetime.fromisoformat(issued.replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - issued_dt).total_seconds() > 21600:
                    continue
            except Exception:
                pass

            # Extract headline from first non-empty line after header block
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            headline = ""
            for line in lines:
                if len(line) > 20 and not line.startswith(("0", "FXUS", "AFD", "TOR", "SVR", "FFW")):
                    headline = line[:120]
                    break

            if not headline:
                continue

            # Extract key messages if present
            msg_match = re.search(r'\.KEY MESSAGES\.\.\.(.*?)(?:&&|\.\.[A-Z])', text, re.DOTALL)
            description = msg_match.group(1).strip()[:800] if msg_match else text[:600].strip()

            severity = _classify_severity(text)

            alerts.append({
                "id": _stable_id("lot", ptype, issued),
                "event": ptype,
                "severity": severity,
                "urgency": "Expected",
                "headline": f"[NWS LOT] {headline}",
                "description": description,
                "instruction": "",
                "areaDesc": "Chicago/Romeoville NWS Area",
                "onset": issued,
                "expires": _expires_iso(6),
                "geometry": None,
                "centroid": None,
                "source": "nws_lot",
            })
        except Exception as e:
            logger.warning(f"LOT product fetch failed for {ptype}: {e}")

    return alerts


# ── NBC Chicago RSS ───────────────────────────────────────────────────────────

def _fetch_nbc_chicago_alerts() -> list[dict]:
    """Pull NBC Chicago weather RSS and surface alert-worthy headlines."""
    alerts = []
    try:
        resp = requests.get(
            "https://www.nbcchicago.com/tag/weather/feed/",
            headers=HEADERS, timeout=10,
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        channel = root.find("channel") or root
        for item in channel.findall("item")[:20]:
            title_el = item.find("title")
            desc_el = item.find("description")
            pub_el = item.find("pubDate")
            link_el = item.find("link")

            title = (title_el.text or "").strip() if title_el is not None else ""
            if not title or not ALERT_KEYWORDS.search(title):
                continue

            desc = (desc_el.text or "").strip() if desc_el is not None else ""
            # Strip HTML tags from description
            desc = re.sub(r"<[^>]+>", "", desc)[:400]

            pub_str = (pub_el.text or "").strip() if pub_el is not None else ""

            # Skip articles older than 7 days
            if pub_str:
                try:
                    from email.utils import parsedate_to_datetime
                    pub_dt = parsedate_to_datetime(pub_str)
                    if (datetime.now(timezone.utc) - pub_dt).total_seconds() > 7 * 86400:
                        continue
                except Exception:
                    pass

            severity = _classify_severity(title)

            alerts.append({
                "id": _stable_id("nbc", title),
                "event": "NBC5 Weather Alert",
                "severity": severity,
                "urgency": "Expected",
                "headline": f"[NBC5] {title}",
                "description": desc,
                "instruction": (link_el.text or "").strip() if link_el is not None else "",
                "areaDesc": "Chicago Metro Area",
                "onset": _now_iso(),
                "expires": _expires_iso(4),
                "geometry": None,
                "centroid": None,
                "source": "nbc_chicago",
            })
    except Exception as e:
        logger.warning(f"NBC Chicago RSS fetch failed: {e}")

    return alerts


# ── Public API ────────────────────────────────────────────────────────────────

def fetch_aggregated_alerts(area: Optional[str] = "IL", limit: int = 100) -> list[dict]:
    """Return deduplicated alerts from all sources, sorted by severity."""
    severity_order = {"Extreme": 0, "Severe": 1, "Moderate": 2, "Minor": 3, "Unknown": 4}

    nws = fetch_nws_alerts(area=area, limit=limit)
    lot = _fetch_lot_products()
    nbc = _fetch_nbc_chicago_alerts()

    all_alerts = nws + lot + nbc

    # Deduplicate by id
    seen = set()
    deduped = []
    for a in all_alerts:
        if a["id"] not in seen:
            seen.add(a["id"])
            deduped.append(a)

    deduped.sort(key=lambda a: severity_order.get(a.get("severity", "Unknown"), 4))
    return deduped[:limit]
