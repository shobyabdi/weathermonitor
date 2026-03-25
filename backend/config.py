import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY", "")
YOUTUBE_DATA_API_KEY = os.getenv("YOUTUBE_DATA_API_KEY", "")
NASA_FIRMS_API_KEY = os.getenv("NASA_FIRMS_API_KEY", "")
OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")
TOMORROW_IO_API_KEY = os.getenv("TOMORROW_IO_API_KEY", "")

UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./weather.db")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "600"))
STORM_SCORE_THRESHOLD = float(os.getenv("STORM_SCORE_THRESHOLD", "60"))
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "70"))

# API endpoints
NWS_ALERTS_URL = "https://api.weather.gov/alerts/active"
USGS_EARTHQUAKE_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
RAINVIEWER_URL = "https://api.rainviewer.com/public/weather-maps.json"
NDBC_URL = "https://www.ndbc.noaa.gov/data"
USGS_STREAMFLOW_URL = "https://waterservices.usgs.gov/nwis/iv/"
