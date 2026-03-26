"""
FastAPI server for the Weather Intelligence Dashboard backend.
Exposes REST endpoints consumed by the React frontend via the Vite proxy.

Run with:
    uvicorn backend.api.server:app --reload --port 8000
"""
import logging
import time
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from ingest.weather_alerts import fetch_nws_alerts
from ingest.earthquakes import fetch_earthquakes
from ingest.wildfires import fetch_wildfires
from ingest.radar import fetch_radar_frames
from ingest.tropical import fetch_tropical_storms
from ingest.forecast import fetch_forecast
from ingest.air_quality import fetch_air_quality
from ingest.buoys import fetch_buoys
from ingest.floods import fetch_river_gauges
from ingest.news import fetch_rss_feed
from intelligence.claude_client import generate_brief, analyze_storm
from intelligence.prompts import GLOBAL_BRIEF_PROMPT, STORM_ANALYSIS_PROMPT

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
# In-memory cache for the AI brief (15-minute TTL)
# ---------------------------------------------------------------------------

_brief_cache: dict[str, Any] = {"content": None, "generated_at": 0.0}
BRIEF_CACHE_TTL = 15 * 60


def _build_brief_context(
    alerts: list[dict],
    earthquakes: list[dict],
    wildfires: list[dict],
    tropical: list[dict],
) -> str:
    critical_count = sum(1 for a in alerts if a.get("severity") == "Extreme")
    high_count = sum(1 for a in alerts if a.get("severity") == "Severe")

    tropical_summary = (
        "; ".join(
            f"{s['type']} {s['name']} ({s['basin']}, {s['windSpeed']} mph)"
            for s in tropical[:5]
        )
        if tropical
        else "No active tropical systems"
    )

    significant_eq = [e for e in earthquakes if e.get("magnitude", 0) >= 5.0]
    eq_summary = (
        "; ".join(f"M{e['magnitude']:.1f} {e['place']}" for e in significant_eq[:5])
        if significant_eq
        else "No significant earthquakes (M5+) in past 24h"
    )

    high_frp = sorted(wildfires, key=lambda f: f.get("frp", 0), reverse=True)[:5]
    fire_summary = (
        f"{len(wildfires)} active hotspots; top FRP {high_frp[0].get('frp', 0):.0f} MW"
        if high_frp
        else "No significant wildfire hotspots detected"
    )

    headlines = [
        a.get("headline") or a.get("event", "")
        for a in alerts[:10]
        if a.get("headline") or a.get("event")
    ]

    return GLOBAL_BRIEF_PROMPT.format(
        alert_count=len(alerts),
        critical_count=critical_count,
        high_count=high_count,
        tropical_summary=tropical_summary,
        eq_summary=eq_summary,
        fire_summary=fire_summary,
        anomaly_summary="See individual data feeds",
        headlines=" | ".join(headlines) if headlines else "No major headlines",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok", "service": "weather-intelligence-api"}


@app.get("/api/alerts")
def get_alerts(
    area: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=500),
) -> dict:
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
    try:
        quakes = fetch_earthquakes(min_magnitude=min_magnitude, hours=hours, limit=limit)
        return {"count": len(quakes), "earthquakes": quakes}
    except Exception as e:
        logger.error(f"GET /api/earthquakes error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch earthquake data")


@app.get("/api/wildfires")
def get_wildfires(days: int = Query(1, ge=1, le=7)) -> dict:
    try:
        fires = fetch_wildfires(days=days)
        return {"count": len(fires), "wildfires": fires}
    except Exception as e:
        logger.error(f"GET /api/wildfires error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch wildfire data")


@app.get("/api/radar")
def get_radar() -> dict:
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
    try:
        storms = fetch_tropical_storms()
        return {"count": len(storms), "storms": storms}
    except Exception as e:
        logger.error(f"GET /api/tropical error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch tropical storm data")


@app.get("/api/forecast")
def get_forecast(
    lat: float = Query(...),
    lon: float = Query(...),
) -> dict:
    try:
        return fetch_forecast(lat=lat, lon=lon)
    except Exception as e:
        logger.error(f"GET /api/forecast error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch forecast data")


@app.get("/api/air-quality")
def get_air_quality(
    lat: float = Query(39.5),
    lon: float = Query(-98.35),
    radius: int = Query(25000),
) -> dict:
    try:
        locations = fetch_air_quality(lat=lat, lon=lon, radius=radius)
        return {"count": len(locations), "locations": locations}
    except Exception as e:
        logger.error(f"GET /api/air-quality error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch air quality data")


@app.get("/api/buoys")
def get_buoys() -> dict:
    try:
        buoys = fetch_buoys()
        return {"count": len(buoys), "buoys": buoys}
    except Exception as e:
        logger.error(f"GET /api/buoys error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch buoy data")


@app.get("/api/river-gauges")
def get_river_gauges(state: str = Query("all")) -> dict:
    try:
        gauges = fetch_river_gauges(state=state)
        return {"count": len(gauges), "gauges": gauges}
    except Exception as e:
        logger.error(f"GET /api/river-gauges error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch river gauge data")


@app.get("/api/news-proxy")
def get_news(
    feed: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    try:
        items = fetch_rss_feed(url=feed, limit=limit)
        return {"count": len(items), "items": items}
    except Exception as e:
        logger.error(f"GET /api/news-proxy error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch RSS feed")


@app.get("/api/ai-brief")
def get_ai_brief(refresh: bool = Query(False)) -> dict:
    now = time.time()
    cache_age = now - _brief_cache["generated_at"]

    if not refresh and _brief_cache["content"] and cache_age < BRIEF_CACHE_TTL:
        return {
            "brief": _brief_cache["content"],
            "cached": True,
            "age_seconds": int(cache_age),
            "generated_at": _brief_cache["generated_at"],
        }

    try:
        alerts = fetch_nws_alerts(limit=100)
        earthquakes = fetch_earthquakes(min_magnitude=4.0, hours=24, limit=50)
        wildfires = fetch_wildfires(days=1)
        tropical = fetch_tropical_storms()
    except Exception as e:
        logger.warning(f"Partial data fetch for AI brief: {e}")
        alerts, earthquakes, wildfires, tropical = [], [], [], []

    prompt = _build_brief_context(alerts, earthquakes, wildfires, tropical)

    try:
        brief_text = generate_brief(prompt)
    except Exception as e:
        logger.error(f"Claude brief generation failed: {e}")
        if _brief_cache["content"]:
            return {
                "brief": _brief_cache["content"],
                "cached": True,
                "stale": True,
                "age_seconds": int(cache_age),
                "generated_at": _brief_cache["generated_at"],
            }
        raise HTTPException(status_code=503, detail="AI brief temporarily unavailable")

    _brief_cache["content"] = brief_text
    _brief_cache["generated_at"] = time.time()

    return {
        "brief": brief_text,
        "cached": False,
        "age_seconds": 0,
        "generated_at": _brief_cache["generated_at"],
    }


@app.post("/api/ai-analyze")
async def ai_analyze(request: Request) -> dict:
    try:
        body: dict = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    prompt = STORM_ANALYSIS_PROMPT.format(
        location=body.get("location", "Unknown"),
        storm_score=body.get("storm_score", 0),
        alert_summary=body.get("alert_summary", "None"),
        pressure_trend=body.get("pressure_trend", "0"),
        wind_speed=body.get("wind_speed", "0"),
        wind_gust=body.get("wind_gust", "0"),
        wind_dir=body.get("wind_dir", "N"),
        precip_rate=body.get("precip_rate", "0"),
        max_dbz=body.get("max_dbz", "0"),
        tornado_distance_miles=body.get("tornado_distance_miles", "N/A"),
        youtube_context=body.get("youtube_context", "None"),
        headlines=body.get("headlines", "None"),
    )

    try:
        insight = analyze_storm(prompt)
        insight["storm_score"] = body.get("storm_score", 0)
        insight["generated_at"] = time.time()
        return insight
    except Exception as e:
        logger.error(f"Claude storm analysis failed: {e}")
        return {
            "summary": "AI analysis unavailable. Monitoring weather data feeds.",
            "confidence": "low",
            "expected": ["Continue monitoring conditions", "Check NWS for official guidance"],
            "recommendation": "Monitor official NWS alerts for your area.",
            "threat_type": "other",
            "severity": "info",
            "affected_region": body.get("location", "Unknown"),
            "storm_score": body.get("storm_score", 0),
            "generated_at": time.time(),
            "fallback": True,
        }


@app.get("/api/baseline")
def get_baseline() -> dict:
    return {
        "baselines": {},
        "message": "Local mode — anomaly baseline persisted in browser localStorage.",
    }


@app.post("/api/baseline")
async def update_baseline(request: Request) -> dict:
    return {
        "status": "ok",
        "message": "Local mode — anomaly baseline persisted in browser localStorage.",
    }
