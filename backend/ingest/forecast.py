"""
Open-Meteo 7-day forecast ingestion.
No API key required.
"""
import logging
import requests

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def fetch_forecast(lat: float, lon: float) -> dict:
    """
    Fetch 7-day daily forecast from Open-Meteo.
    Returns the raw JSON response shaped for the frontend ForecastPanel.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "weathercode",
            "windspeed_10m_max",
            "precipitation_sum",
        ],
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "forecast_days": 7,
        "timezone": "auto",
    }

    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data
    except requests.RequestException as e:
        logger.error(f"Open-Meteo fetch error: {e}")
        return {
            "error": str(e),
            "daily": {
                "time": [],
                "temperature_2m_max": [],
                "temperature_2m_min": [],
                "precipitation_probability_max": [],
                "weathercode": [],
                "windspeed_10m_max": [],
                "precipitation_sum": [],
            },
        }
