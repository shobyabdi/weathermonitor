"""
Normalizer module: converts raw ingest payloads into a unified WeatherEvent format.
"""
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime, timezone


@dataclass
class WeatherEvent:
    id: str
    type: str           # "alert" | "earthquake" | "wildfire"
    severity: str       # "critical" | "high" | "medium" | "low" | "info"
    lat: float
    lon: float
    title: str
    description: str
    timestamp: str      # ISO-8601 UTC string
    source: str         # "NWS" | "USGS" | "NASA_FIRMS"
    raw_data: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Severity mapping helpers
# ---------------------------------------------------------------------------

_NWS_SEVERITY_MAP: dict[str, str] = {
    "Extreme": "critical",
    "Severe": "high",
    "Moderate": "medium",
    "Minor": "low",
    "Unknown": "info",
}


def _nws_severity(raw: str) -> str:
    return _NWS_SEVERITY_MAP.get(raw, "info")


def _eq_severity(magnitude: float) -> str:
    if magnitude >= 7.0:
        return "critical"
    if magnitude >= 6.0:
        return "high"
    if magnitude >= 5.0:
        return "medium"
    if magnitude >= 4.0:
        return "low"
    return "info"


def _fire_severity(confidence: str, frp: float) -> str:
    """Map VIIRS fire confidence + Fire Radiative Power to a severity tier."""
    conf_lower = confidence.lower()
    if conf_lower in ("h", "high") or frp > 100:
        return "high"
    if conf_lower in ("n", "nominal") or frp > 20:
        return "medium"
    return "low"


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ms_epoch_to_iso(ms: int) -> str:
    """Convert millisecond epoch timestamp to ISO-8601 string."""
    try:
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()
    except (ValueError, TypeError, OSError):
        return _utcnow_iso()


# ---------------------------------------------------------------------------
# Individual normalizers
# ---------------------------------------------------------------------------

def normalize_alert(alert: dict) -> WeatherEvent:
    """Normalize an NWS CAP alert dict into a WeatherEvent."""
    centroid = alert.get("centroid") or [0.0, 0.0]
    lat = centroid[1] if len(centroid) > 1 else 0.0
    lon = centroid[0] if len(centroid) > 0 else 0.0

    onset = alert.get("onset") or alert.get("sent") or _utcnow_iso()

    return WeatherEvent(
        id=alert.get("id", ""),
        type="alert",
        severity=_nws_severity(alert.get("severity", "Unknown")),
        lat=lat,
        lon=lon,
        title=alert.get("event", "Weather Alert"),
        description=alert.get("headline") or alert.get("description", "")[:500],
        timestamp=onset,
        source="NWS",
        raw_data=alert,
    )


def normalize_earthquake(eq: dict) -> WeatherEvent:
    """Normalize a USGS earthquake dict into a WeatherEvent."""
    mag = float(eq.get("magnitude", 0))
    time_ms = eq.get("time", 0)
    timestamp = _ms_epoch_to_iso(time_ms) if isinstance(time_ms, (int, float)) else _utcnow_iso()

    place = eq.get("place", "Unknown location")
    title = f"M{mag:.1f} Earthquake – {place}"

    return WeatherEvent(
        id=eq.get("id", ""),
        type="earthquake",
        severity=_eq_severity(mag),
        lat=float(eq.get("lat", 0.0)),
        lon=float(eq.get("lon", 0.0)),
        title=title,
        description=(
            f"Magnitude {mag:.1f} earthquake at depth {eq.get('depth', 0):.1f} km. "
            f"Tsunami potential: {'yes' if eq.get('tsunami') else 'no'}. "
            f"Reports felt: {eq.get('felt', 0) or 0}."
        ),
        timestamp=timestamp,
        source="USGS",
        raw_data=eq,
    )


def normalize_wildfire(fire: dict) -> WeatherEvent:
    """Normalize a NASA FIRMS fire hotspot dict into a WeatherEvent."""
    frp = float(fire.get("frp", 0))
    confidence = str(fire.get("confidence", "n"))
    acq_date = fire.get("acqDate", "")
    acq_time = fire.get("acqTime", "0000").zfill(4)

    # Build ISO timestamp from acquisition date/time
    try:
        ts = datetime.strptime(
            f"{acq_date} {acq_time[:2]}:{acq_time[2:]}",
            "%Y-%m-%d %H:%M"
        ).replace(tzinfo=timezone.utc).isoformat()
    except (ValueError, TypeError):
        ts = _utcnow_iso()

    brightness = float(fire.get("brightness", 0))
    title = f"Active Fire Hotspot – FRP {frp:.0f} MW"

    return WeatherEvent(
        id=fire.get("id", ""),
        type="wildfire",
        severity=_fire_severity(confidence, frp),
        lat=float(fire.get("lat", 0.0)),
        lon=float(fire.get("lon", 0.0)),
        title=title,
        description=(
            f"Satellite-detected fire hotspot. Brightness: {brightness:.0f} K. "
            f"Fire Radiative Power: {frp:.0f} MW. Confidence: {confidence}. "
            f"Detected by {fire.get('satellite', 'VIIRS')} on {acq_date}."
        ),
        timestamp=ts,
        source="NASA_FIRMS",
        raw_data=fire,
    )


# ---------------------------------------------------------------------------
# Batch normalizer
# ---------------------------------------------------------------------------

def normalize_all(
    alerts: list[dict],
    earthquakes: list[dict],
    wildfires: list[dict],
) -> list[WeatherEvent]:
    """
    Normalize all raw ingest payloads into a unified list of WeatherEvents,
    sorted by severity (critical first) then timestamp (newest first).
    """
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

    events: list[WeatherEvent] = []

    for a in alerts:
        try:
            events.append(normalize_alert(a))
        except Exception:
            pass

    for eq in earthquakes:
        try:
            events.append(normalize_earthquake(eq))
        except Exception:
            pass

    for fire in wildfires:
        try:
            events.append(normalize_wildfire(fire))
        except Exception:
            pass

    events.sort(
        key=lambda e: (severity_order.get(e.severity, 99), e.timestamp),
        reverse=False,
    )
    # Within same severity, sort newest first
    events.sort(
        key=lambda e: (severity_order.get(e.severity, 99), e.timestamp[::-1])
    )

    return events
