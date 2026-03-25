"""
Weather Intelligence — continuous intelligence loop.

Periodically fetches data from all ingest sources, computes a storm score,
calls Claude when the score exceeds the configured threshold, and logs
actionable alerts.

Run directly:
    python -m backend.main
or:
    python backend/main.py
"""
import logging
import sys
import time
from datetime import datetime, timezone

from config import POLL_INTERVAL_SECONDS, STORM_SCORE_THRESHOLD, ALERT_THRESHOLD
from ingest.weather_alerts import fetch_nws_alerts, compute_alert_score
from ingest.earthquakes import fetch_earthquakes
from ingest.wildfires import fetch_wildfires
from ingest.radar import fetch_radar_frames
from ingest.tropical import fetch_tropical_storms
from processing.storm_score import WeatherFeatures, compute_storm_score
from processing.normalizer import normalize_all
from intelligence.claude_client import analyze_storm
from intelligence.prompts import STORM_ANALYSIS_PROMPT
from alerting.alert_engine import ClaudeInsight, evaluate_alert, build_alert_payload

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("weather.main")


# ---------------------------------------------------------------------------
# Helper builders
# ---------------------------------------------------------------------------

def _format_alert_summary(alerts: list[dict]) -> str:
    """Build a short human-readable alert summary."""
    if not alerts:
        return "none"
    counts: dict[str, int] = {}
    for a in alerts:
        sev = a.get("severity", "Unknown")
        counts[sev] = counts.get(sev, 0) + 1
    parts = [f"{v} {k}" for k, v in sorted(counts.items())]
    return ", ".join(parts)


def _format_tropical_summary(storms: list[dict]) -> str:
    if not storms:
        return "none"
    return "; ".join(
        f"{s['type']} {s['name']} ({s['windSpeed']} mph)" for s in storms[:3]
    )


def _format_eq_summary(quakes: list[dict]) -> str:
    significant = [q for q in quakes if q.get("magnitude", 0) >= 5.0]
    if not significant:
        return "none M5+"
    return "; ".join(f"M{q['magnitude']:.1f} {q['place']}" for q in significant[:3])


def _format_fire_summary(fires: list[dict]) -> str:
    if not fires:
        return "no active hotspots"
    high_frp = sorted(fires, key=lambda f: f.get("frp", 0), reverse=True)[:3]
    return f"{len(fires)} hotspots; top FRP {high_frp[0].get('frp', 0):.0f} MW"


def _format_headlines(alerts: list[dict]) -> str:
    headlines = [
        a.get("headline") or a.get("event", "")
        for a in alerts[:5]
        if a.get("headline") or a.get("event")
    ]
    return " | ".join(headlines) if headlines else "none"


# ---------------------------------------------------------------------------
# Main poll cycle
# ---------------------------------------------------------------------------

def run_poll_cycle() -> None:
    """Execute one full data-fetch + analysis cycle."""
    cycle_start = datetime.now(timezone.utc).isoformat()
    logger.info(f"=== Poll cycle starting at {cycle_start} ===")

    # --- Fetch all data sources ---
    logger.info("Fetching NWS alerts …")
    alerts = fetch_nws_alerts(limit=200)
    logger.info(f"  Got {len(alerts)} alerts")

    logger.info("Fetching USGS earthquakes …")
    earthquakes = fetch_earthquakes(min_magnitude=2.5, hours=24, limit=100)
    logger.info(f"  Got {len(earthquakes)} earthquakes")

    logger.info("Fetching NASA FIRMS wildfires …")
    wildfires = fetch_wildfires(days=1)
    logger.info(f"  Got {len(wildfires)} wildfire hotspots")

    logger.info("Fetching RainViewer radar …")
    radar = fetch_radar_frames()
    logger.info(f"  Radar frames available: {radar is not None}")

    logger.info("Fetching NHC tropical storms …")
    tropical = fetch_tropical_storms()
    logger.info(f"  Got {len(tropical)} active tropical systems")

    # --- Normalize into unified events ---
    events = normalize_all(alerts, earthquakes, wildfires)
    logger.info(f"Normalized {len(events)} total events")

    # --- Compute storm score ---
    alert_score = compute_alert_score(alerts)

    features = WeatherFeatures(
        active_alert_score=alert_score,
        # Remaining fields default to 0/False — in production these would come
        # from Open-Meteo, radar processing, or YouTube signal detection.
        location="Global / CONUS",
    )

    storm_score = compute_storm_score(features)
    logger.info(f"Storm score: {storm_score:.1f}/100 (alert score contribution: {alert_score:.1f})")

    # --- Claude analysis (only when score warrants it) ---
    if storm_score < STORM_SCORE_THRESHOLD:
        logger.info(
            f"Storm score {storm_score:.1f} below threshold {STORM_SCORE_THRESHOLD} — skipping Claude analysis"
        )
        return

    logger.info(f"Storm score {storm_score:.1f} >= threshold {STORM_SCORE_THRESHOLD} — calling Claude …")

    prompt = STORM_ANALYSIS_PROMPT.format(
        location=features.location or "CONUS",
        storm_score=round(storm_score, 1),
        alert_summary=_format_alert_summary(alerts),
        pressure_trend=features.pressure_trend,
        wind_speed=features.wind_speed,
        wind_gust=features.wind_gust_mph,
        wind_dir=features.wind_dir,
        precip_rate=features.precip_rate_in_hr,
        max_dbz=features.max_dbz,
        tornado_distance_miles=features.tornado_distance_miles,
        youtube_context="no active storm chaser streams detected",
        headlines=_format_headlines(alerts),
    )

    try:
        raw = analyze_storm(prompt)
    except Exception as e:
        logger.error(f"Claude analysis failed: {e}")
        return

    insight = ClaudeInsight(
        summary=raw.get("summary", ""),
        confidence=raw.get("confidence", "low"),
        expected=raw.get("expected", []),
        recommendation=raw.get("recommendation", ""),
        threat_type=raw.get("threat_type", "other"),
        severity=raw.get("severity", "info"),
        affected_region=raw.get("affected_region", "Unknown"),
        generated_at=cycle_start,
        storm_score=storm_score,
    )

    logger.info(
        f"Claude insight: severity={insight.severity}, confidence={insight.confidence}, "
        f"threat={insight.threat_type}"
    )
    logger.info(f"  Summary: {insight.summary}")
    logger.info(f"  Recommendation: {insight.recommendation}")

    # --- Alert evaluation ---
    should_alert = evaluate_alert(storm_score, insight)
    if should_alert:
        payload = build_alert_payload(
            location=features.location or "CONUS",
            storm_score=storm_score,
            insight=insight,
        )
        logger.warning(
            f"ALERT TRIGGERED — score={storm_score:.1f}, severity={insight.severity}, "
            f"region={insight.affected_region}"
        )
        logger.warning(f"Alert payload: {payload}")
        # In production: dispatch payload to notification service / webhook
    else:
        logger.info(
            f"No alert dispatched (score={storm_score:.1f}, confidence={insight.confidence})"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info(
        f"Weather Intelligence Loop starting — "
        f"poll interval: {POLL_INTERVAL_SECONDS}s, "
        f"storm threshold: {STORM_SCORE_THRESHOLD}, "
        f"alert threshold: {ALERT_THRESHOLD}"
    )

    while True:
        try:
            run_poll_cycle()
        except KeyboardInterrupt:
            logger.info("Shutting down gracefully.")
            break
        except Exception as e:
            logger.exception(f"Unhandled error in poll cycle: {e}")

        logger.info(f"Sleeping {POLL_INTERVAL_SECONDS}s until next cycle …")
        try:
            time.sleep(POLL_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            logger.info("Shutting down gracefully.")
            break


if __name__ == "__main__":
    main()
