"""
FastAPI server for the Weather Intelligence Dashboard backend.
Exposes REST endpoints consumed by the frontend.
"""
import logging
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from ingest.weather_alerts import fetch_nws_alerts
from ingest.earthquakes import fetch_earthquakes
from ingest.wildfires import fetch_wildfires
from ingest.radar import fetch_radar_frames
from ingest.tropical import fetch_tropical_storms
from intelligence.claude_client import generate_brief
from intelligence.prompts import GLOBAL_BRIEF_PROMPT

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Weather Intelligence Dashboard API",
    version="1.0.0",
    description="Real-time weather data aggregation and AI analysis backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Simple in-memory cache for the AI brief (15 minutes TTL)
# ---------------------------------------------------------------------------

_brief_cache: dict[str, Any] = {
    "content": None,
    "generated_at": 0.0,
}
BRIEF_CACHE_TTL = 15 * 60  # 15 minutes in seconds


def _build_brief_context(
    alerts: list[dict],
    earthquakes: list[dict],
    wildfires: list[dict],
    tropical: list[dict],
) -> str:
    """Summarise live data into the GLOBAL_BRIEF_PROMPT template variables."""
    # Alert counts by severity
    sev_map = {"Extreme": "critical", "Severe": "high", "Moderate": "medium", "Minor": "low"}
    critical_count = sum(1 for a in alerts if a.get("severity") == "Extreme")
    high_count = sum(1 for a in alerts if a.get("severity") == "Severe")

    # Tropical summary
    if tropical:
        tropical_summary = "; ".join(
            f"{s['type']} {s['name']} ({s['basin']}, {s['windSpeed']} mph)"
            for s in tropical[:5]
        )
    else:
        tropical_summary = "No active tropical systems"

    # Earthquake summary
    significant_eq = [e for e in earthquakes if e.get("magnitude", 0) >= 5.0]
    if significant_eq:
        eq_summary = "; ".join(
            f"M{e['magnitude']:.1f} {e['place']}" for e in significant_eq[:5]
        )
    else:
        eq_summary = "No significant earthquakes (M5+) in past 24h"

    # Wildfire summary
    high_frp = sorted(wildfires, key=lambda f: f.get("frp", 0), reverse=True)[:5]
    if high_frp:
        fire_summary = f"{len(wildfires)} active hotspots globally; top FRP {high_frp[0].get('frp', 0):.0f} MW"
    else:
        fire_summary = "No significant wildfire hotspots detected"

    # Headline extraction from alerts
    headlines = [
        a.get("headline") or a.get("event", "")
        for a in alerts[:10]
        if a.get("headline") or a.get("event")
    ]
    headlines_str = " | ".join(headlines) if headlines else "No major headlines"

    return GLOBAL_BRIEF_PROMPT.format(
        alert_count=len(alerts),
        critical_count=critical_count,
        high_count=high_count,
        tropical_summary=tropical_summary,
        eq_summary=eq_summary,
        fire_summary=fire_summary,
        anomaly_summary="See individual data feeds",
        headlines=headlines_str,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health_check() -> dict:
    """Liveness/readiness probe."""
    return {"status": "ok", "service": "weather-intelligence-api"}


@app.get("/api/alerts")
def get_alerts(
    area: Optional[str] = Query(None, description="Two-letter state code, e.g. TX"),
    severity: Optional[str] = Query(None, description="Extreme|Severe|Moderate|Minor"),
    limit: int = Query(500, ge=1, le=500),
) -> dict:
    """Return active NWS CAP alerts."""
    try:
        alerts = fetch_nws_alerts(area=area, severity=severity, limit=limit)
        return {"count": len(alerts), "alerts": alerts}
    except Exception as e:
        logger.error(f"GET /api/alerts error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch NWS alerts")


@app.get("/api/earthquakes")
def get_earthquakes(
    min_magnitude: float = Query(2.5, ge=0.0, le=10.0),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(200, ge=1, le=1000),
) -> dict:
    """Return recent USGS earthquakes."""
    try:
        quakes = fetch_earthquakes(
            min_magnitude=min_magnitude,
            hours=hours,
            limit=limit,
        )
        return {"count": len(quakes), "earthquakes": quakes}
    except Exception as e:
        logger.error(f"GET /api/earthquakes error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch earthquake data")


@app.get("/api/wildfires")
def get_wildfires(
    days: int = Query(1, ge=1, le=7, description="Number of days of data (1 or 7)"),
) -> dict:
    """Return active wildfire hotspots from NASA FIRMS."""
    try:
        fires = fetch_wildfires(days=days)
        return {"count": len(fires), "wildfires": fires}
    except Exception as e:
        logger.error(f"GET /api/wildfires error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch wildfire data")


@app.get("/api/radar")
def get_radar() -> dict:
    """Return RainViewer radar frame metadata."""
    try:
        frames = fetch_radar_frames()
        if frames is None:
            raise HTTPException(status_code=502, detail="Radar data unavailable")
        return frames
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GET /api/radar error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch radar data")


@app.get("/api/tropical")
def get_tropical() -> dict:
    """Return active NHC tropical storm advisories."""
    try:
        storms = fetch_tropical_storms()
        return {"count": len(storms), "storms": storms}
    except Exception as e:
        logger.error(f"GET /api/tropical error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch tropical storm data")


@app.get("/api/ai-brief")
def get_ai_brief(refresh: bool = Query(False, description="Force cache refresh")) -> dict:
    """
    Return a Claude-generated global weather brief.
    Cached in memory for 15 minutes; pass ?refresh=true to force regeneration.
    """
    now = time.time()
    cache_age = now - _brief_cache["generated_at"]

    if not refresh and _brief_cache["content"] and cache_age < BRIEF_CACHE_TTL:
        return {
            "brief": _brief_cache["content"],
            "cached": True,
            "age_seconds": int(cache_age),
            "generated_at": _brief_cache["generated_at"],
        }

    # Fetch live data to build context
    try:
        alerts = fetch_nws_alerts(limit=100)
        earthquakes = fetch_earthquakes(min_magnitude=4.0, hours=24, limit=50)
        wildfires = fetch_wildfires(days=1)
        tropical = fetch_tropical_storms()
    except Exception as e:
        logger.warning(f"Partial data fetch error for AI brief: {e}")
        alerts, earthquakes, wildfires, tropical = [], [], [], []

    prompt = _build_brief_context(alerts, earthquakes, wildfires, tropical)

    try:
        brief_text = generate_brief(prompt)
    except Exception as e:
        logger.error(f"Claude brief generation failed: {e}")
        if _brief_cache["content"]:
            # Return stale cache rather than error
            return {
                "brief": _brief_cache["content"],
                "cached": True,
                "stale": True,
                "age_seconds": int(cache_age),
                "generated_at": _brief_cache["generated_at"],
            }
        raise HTTPException(status_code=503, detail="AI brief generation temporarily unavailable")

    _brief_cache["content"] = brief_text
    _brief_cache["generated_at"] = time.time()

    return {
        "brief": brief_text,
        "cached": False,
        "age_seconds": 0,
        "generated_at": _brief_cache["generated_at"],
    }
