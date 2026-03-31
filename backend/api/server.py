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
from intelligence.claude_client import analyze_storm
from intelligence.prompts import STORM_ANALYSIS_PROMPT

try:
    from ingest.spc import fetch_spc_outlooks
except ImportError:
    fetch_spc_outlooks = None

try:
    from ingest.swpc import fetch_space_weather
except ImportError:
    fetch_space_weather = None

try:
    from ingest.tides import fetch_tidal_data
except ImportError:
    fetch_tidal_data = None

try:
    from ingest.seismic_eu import fetch_emsc_earthquakes
except ImportError:
    fetch_emsc_earthquakes = None

try:
    from ingest.volcanoes import fetch_volcanic_activity
except ImportError:
    fetch_volcanic_activity = None

try:
    from ingest.airnow import fetch_airnow
except ImportError:
    fetch_airnow = None

try:
    from ingest.glofas import fetch_glofas_alerts
except ImportError:
    fetch_glofas_alerts = None

try:
    from ingest.copernicus_marine import fetch_sst_anomaly
except ImportError:
    fetch_sst_anomaly = None

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
# In-memory cache for AI insight (15-minute TTL)
# ---------------------------------------------------------------------------

_brief_cache: dict[str, Any] = {"content": None, "generated_at": 0.0}
BRIEF_CACHE_TTL = 15 * 60


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
    lat: float = Query(41.97),
    lon: float = Query(-88.19),
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


@app.get("/api/insight")
def get_insight(refresh: bool = Query(False)) -> dict:
    """Return a structured ClaudeInsight for the current global weather conditions."""
    now = time.time()
    cache_age = now - _brief_cache.get("insight_generated_at", 0)

    if not refresh and _brief_cache.get("insight") and cache_age < BRIEF_CACHE_TTL:
        return _brief_cache["insight"]

    try:
        alerts = fetch_nws_alerts(area="ILC", limit=50)
    except Exception as e:
        logger.warning(f"Partial data fetch for insight: {e}")
        alerts = []

    alert_summary = "; ".join(a.get("headline", "") for a in alerts[:5]) or "None"

    storm_score = min(10 * len(alerts), 100)

    prompt = STORM_ANALYSIS_PROMPT.format(
        location="Bartlett, IL 60103",
        storm_score=storm_score,
        alert_summary=alert_summary,
        pressure_trend="0",
        wind_speed="0",
        wind_gust="0",
        wind_dir="N",
        precip_rate="0",
        max_dbz="0",
        tornado_distance_miles="N/A",
    )

    try:
        insight = analyze_storm(prompt)
        insight["storm_score"] = storm_score
        insight["generated_at"] = time.time()
        _brief_cache["insight"] = insight
        _brief_cache["insight_generated_at"] = time.time()
        return insight
    except Exception as e:
        logger.error(f"Claude insight generation failed: {e}")
        fallback = {
            "summary": "AI analysis temporarily unavailable. Monitoring global weather feeds.",
            "confidence": "low",
            "expected": ["Continue monitoring conditions", "Check NWS for official guidance"],
            "recommendation": "Monitor official NWS alerts for your area.",
            "threat_type": "other",
            "severity": "info",
            "affected_region": "Global",
            "storm_score": storm_score,
            "generated_at": time.time(),
            "fallback": True,
        }
        return fallback


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


@app.get("/api/spc-outlooks")
def get_spc_outlooks() -> dict:
    if not fetch_spc_outlooks:
        raise HTTPException(status_code=503, detail="SPC module unavailable")
    try:
        return fetch_spc_outlooks()
    except Exception as e:
        logger.error(f"GET /api/spc-outlooks error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch SPC outlooks")

@app.get("/api/space-weather")
def get_space_weather() -> dict:
    if not fetch_space_weather:
        raise HTTPException(status_code=503, detail="SWPC module unavailable")
    try:
        return fetch_space_weather()
    except Exception as e:
        logger.error(f"GET /api/space-weather error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch space weather data")

@app.get("/api/tides")
def get_tides(stations: Optional[str] = Query(None, description="Comma-separated station IDs")) -> dict:
    if not fetch_tidal_data:
        raise HTTPException(status_code=503, detail="Tides module unavailable")
    try:
        station_list = stations.split(",") if stations else None
        data = fetch_tidal_data(station_ids=station_list)
        return {"count": len(data), "stations": data}
    except Exception as e:
        logger.error(f"GET /api/tides error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch tidal data")

@app.get("/api/earthquakes/eu")
def get_emsc_earthquakes(
    min_magnitude: float = Query(2.5, ge=0.0, le=10.0),
    hours: int = Query(24, ge=1, le=168),
) -> dict:
    if not fetch_emsc_earthquakes:
        raise HTTPException(status_code=503, detail="EMSC module unavailable")
    try:
        quakes = fetch_emsc_earthquakes(min_magnitude=min_magnitude, hours=hours)
        return {"count": len(quakes), "earthquakes": quakes}
    except Exception as e:
        logger.error(f"GET /api/earthquakes/eu error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch EMSC earthquake data")

@app.get("/api/volcanoes")
def get_volcanoes() -> dict:
    if not fetch_volcanic_activity:
        raise HTTPException(status_code=503, detail="Volcanoes module unavailable")
    try:
        activity = fetch_volcanic_activity()
        return {"count": len(activity), "activity": activity}
    except Exception as e:
        logger.error(f"GET /api/volcanoes error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch volcanic activity")

@app.get("/api/air-quality/us")
def get_airnow(
    lat: float = Query(39.5),
    lon: float = Query(-98.35),
    distance: int = Query(25),
) -> dict:
    if not fetch_airnow:
        raise HTTPException(status_code=503, detail="AirNow module unavailable")
    try:
        data = fetch_airnow(lat=lat, lon=lon, distance=distance)
        return {"count": len(data), "observations": data}
    except Exception as e:
        logger.error(f"GET /api/air-quality/us error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch AirNow data")

@app.get("/api/floods/global")
def get_glofas() -> dict:
    if not fetch_glofas_alerts:
        raise HTTPException(status_code=503, detail="GloFAS module unavailable")
    try:
        alerts = fetch_glofas_alerts()
        return {"count": len(alerts), "alerts": alerts}
    except Exception as e:
        logger.error(f"GET /api/floods/global error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch global flood alerts")

@app.get("/api/sst-anomaly")
def get_sst_anomaly(
    lat_min: float = Query(15.0),
    lat_max: float = Query(50.0),
    lon_min: float = Query(-100.0),
    lon_max: float = Query(-60.0),
) -> dict:
    if not fetch_sst_anomaly:
        raise HTTPException(status_code=503, detail="SST module unavailable")
    try:
        data = fetch_sst_anomaly(lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max)
        return data
    except Exception as e:
        logger.error(f"GET /api/sst-anomaly error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch SST anomaly data")


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
