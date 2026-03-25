"""
Keyword-based weather event classifier with optional Claude fallback.
Mirrors the TypeScript classifier logic on the frontend.
"""
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword dictionaries
# ---------------------------------------------------------------------------

WEATHER_KEYWORDS: dict[str, list[str]] = {
    "critical": [
        "tornado warning", "tornado emergency", "particularly dangerous situation",
        "pds tornado", "hurricane warning", "category 4", "category 5",
        "flash flood emergency", "considerable flash flooding", "storm surge warning",
        "extreme wind warning", "major hurricane", "catastrophic flooding",
        "life-threatening", "imminent threat", "seek shelter immediately",
        "nuclear", "radiological", "tsunami warning",
    ],
    "high": [
        "tornado watch", "severe thunderstorm warning", "hurricane watch",
        "flash flood warning", "storm surge watch", "tropical storm warning",
        "blizzard warning", "ice storm warning", "winter storm warning",
        "high wind warning", "fire weather watch", "red flag warning",
        "excessive heat warning", "wind chill warning", "dense fog warning",
        "significant", "damaging winds", "large hail", "destructive",
        "hurricane force", "gale warning", "earthquake", "magnitude 6",
        "magnitude 7", "magnitude 8", "magnitude 9",
    ],
    "medium": [
        "tornado possible", "severe thunderstorm watch", "tropical storm watch",
        "flash flood watch", "winter storm watch", "high wind watch",
        "freeze warning", "hard freeze warning", "frost advisory",
        "small hail", "frequent lightning", "heavy rain", "flooding possible",
        "wind advisory", "lake effect snow warning", "dense fog advisory",
        "heat advisory", "air quality alert", "smoke advisory",
        "magnitude 4", "magnitude 5", "wildfire", "active fire",
    ],
    "low": [
        "special weather statement", "hazardous weather outlook",
        "winter weather advisory", "freezing fog advisory",
        "frost watch", "beach hazards", "rip current statement",
        "small craft advisory", "brisk winds", "patchy fog",
        "thunder possible", "isolated storms", "slight chance",
        "magnitude 3", "minor flooding", "nuisance flooding",
    ],
    "info": [
        "weather forecast", "climate outlook", "seasonal outlook",
        "precipitation outlook", "drought monitor", "moderate risk",
        "slight risk", "marginal risk", "low pressure", "frontal passage",
        "partly cloudy", "chance of rain", "winds increasing",
        "magnitude 2", "magnitude 1", "tremor",
    ],
}

WEATHER_CATEGORIES: dict[str, list[str]] = {
    "tornado": [
        "tornado", "twister", "funnel cloud", "wall cloud", "rotation",
        "supercell", "mesocyclone", "hook echo",
    ],
    "hurricane": [
        "hurricane", "typhoon", "cyclone", "tropical storm", "tropical depression",
        "storm surge", "eye wall", "eyewall", "category 1", "category 2",
        "category 3", "category 4", "category 5", "nhc", "national hurricane center",
    ],
    "flood": [
        "flood", "flooding", "flash flood", "river flood", "dam failure",
        "levee breach", "inundation", "storm surge", "high water",
        "areal flooding", "urban flooding",
    ],
    "fire": [
        "wildfire", "fire", "burning", "red flag", "fire weather",
        "smoke", "air quality", "evacuation order", "controlled burn",
        "prescribed burn", "fire perimeter", "containment",
    ],
    "winter": [
        "blizzard", "snowstorm", "snow", "ice storm", "freezing rain",
        "sleet", "ice", "wintry mix", "wind chill", "polar vortex",
        "arctic", "lake effect", "whiteout", "black ice",
    ],
    "heat": [
        "excessive heat", "heat wave", "heat index", "heat advisory",
        "dangerous heat", "record high", "oppressive heat", "heat dome",
    ],
    "cold": [
        "wind chill", "extreme cold", "freeze", "hard freeze", "frost",
        "record low", "dangerously cold", "hypothermia", "frostbite",
    ],
    "severe": [
        "severe thunderstorm", "damaging winds", "large hail", "golf ball",
        "baseball sized", "bow echo", "derecho", "squall line",
        "lightning", "thunder",
    ],
    "drought": [
        "drought", "dry conditions", "below normal precipitation",
        "water shortage", "reservoir", "water restrictions",
    ],
    "earthquake": [
        "earthquake", "tremor", "seismic", "magnitude", "richter",
        "aftershock", "fault line", "usgs", "shaking",
    ],
    "volcano": [
        "volcano", "volcanic", "eruption", "lava", "ash cloud",
        "pyroclastic", "magma", "caldera",
    ],
    "airquality": [
        "air quality", "aqi", "pm2.5", "particulate", "ozone",
        "unhealthy air", "hazardous air", "smoke advisory",
    ],
}

# ---------------------------------------------------------------------------
# Pure keyword classifier
# ---------------------------------------------------------------------------

def classify_by_keyword(text: str) -> dict:
    """
    Classify a weather text snippet using keyword matching.

    Returns:
        {
            "severity": "critical|high|medium|low|info",
            "category": str,
            "confidence": float  # 0.0 - 1.0
        }
    """
    lower = text.lower()

    # Determine severity
    severity = "info"
    confidence = 0.3
    for level in ("critical", "high", "medium", "low", "info"):
        for kw in WEATHER_KEYWORDS[level]:
            if kw in lower:
                severity = level
                # Higher confidence for longer / more specific keyword matches
                confidence = min(0.5 + len(kw) * 0.02, 0.9)
                break
        else:
            continue
        break

    # Determine category
    category = "other"
    best_cat_score = 0
    for cat, keywords in WEATHER_CATEGORIES.items():
        hits = sum(1 for kw in keywords if kw in lower)
        if hits > best_cat_score:
            best_cat_score = hits
            category = cat

    if best_cat_score == 0:
        confidence = max(confidence - 0.2, 0.1)

    return {
        "severity": severity,
        "category": category,
        "confidence": round(confidence, 2),
    }


# ---------------------------------------------------------------------------
# Hybrid classifier (keyword + optional Claude fallback)
# ---------------------------------------------------------------------------

def classify_hybrid(text: str, use_claude: bool = True) -> dict:
    """
    Classify using keywords first; fall back to Claude if confidence < 0.7.

    Args:
        text: The headline or description to classify.
        use_claude: Whether to allow Claude API calls for low-confidence results.

    Returns:
        Classification dict with at least {severity, category, confidence}.
    """
    result = classify_by_keyword(text)

    if result["confidence"] >= 0.7 or not use_claude:
        result["source"] = "keyword"
        return result

    # Low confidence — try Claude
    try:
        from intelligence.claude_client import classify_headline  # lazy import to avoid circular deps
        claude_result = classify_headline(text)
        claude_result["source"] = "claude"
        # Merge: keep Claude's category/severity but add keyword confidence as fallback
        if "confidence" not in claude_result or claude_result["confidence"] == 0.0:
            claude_result["confidence"] = 0.75
        return claude_result
    except Exception as e:
        logger.warning(f"Claude fallback failed, using keyword result: {e}")
        result["source"] = "keyword_fallback"
        return result
