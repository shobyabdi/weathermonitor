from dataclasses import dataclass, field
from typing import Optional


@dataclass
class WeatherFeatures:
    pressure_drop_3h: float = 0.0      # hPa drop in 3 hours
    wind_gust_mph: float = 0.0         # max gust speed
    precip_rate_in_hr: float = 0.0     # inches per hour
    active_alert_score: float = 0.0    # 0-25 from alert severity
    max_dbz: float = 0.0               # max radar reflectivity
    youtube_storm_signal: bool = False  # live storm chaser in area
    location: str = ""
    wind_speed: float = 0.0
    wind_dir: str = "N"
    pressure_trend: float = 0.0
    tornado_distance_miles: float = 999.0


def compute_storm_score(features: WeatherFeatures) -> float:
    """Deterministic weighted storm score 0-100."""
    score = 0.0

    # Pressure drop (hPa/3h) — rapid deepening
    if features.pressure_drop_3h > 3:
        score += 15
    elif features.pressure_drop_3h > 1:
        score += 7

    # Wind speed trend
    if features.wind_gust_mph > 58:
        score += 20   # severe threshold
    elif features.wind_gust_mph > 40:
        score += 12
    elif features.wind_gust_mph > 25:
        score += 5

    # Precipitation intensity
    if features.precip_rate_in_hr > 2:
        score += 20   # flash flood threshold
    elif features.precip_rate_in_hr > 1:
        score += 12
    elif features.precip_rate_in_hr > 0.3:
        score += 5

    # Active NWS/CAP alert severity
    score += features.active_alert_score   # 0-25 from alert tier weights

    # Radar signal
    if features.max_dbz > 65:
        score += 15   # hail/tornado signature
    elif features.max_dbz > 50:
        score += 10
    elif features.max_dbz > 35:
        score += 5

    # YouTube signal (secondary validation only)
    if features.youtube_storm_signal:
        score += 5    # live chaser stream active in area

    return min(score, 100.0)
