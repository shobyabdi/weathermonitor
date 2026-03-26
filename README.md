# Weather Intelligence Dashboard

A real-time atmospheric situational awareness platform powered by Claude AI. Ingests live data from 20+ weather APIs, scores storm severity deterministically, and uses Claude to generate human-readable intelligence briefs and structured event analysis.

![Dashboard preview](docs/preview.png)

## What it does

- **Live radar** — animated RainViewer tiles (past frames + nowcast forecast) over a satellite basemap
- **NWS alert polygons** — exact CAP geometry rendered by event type (tornado, flood, thunderstorm, etc.)
- **AI analysis** — Claude generates a structured storm brief (summary, confidence, expected impacts, safety advice) when storm score exceeds threshold
- **Global weather brief** — 3-paragraph AI-synthesized situational overview, refreshed every 15 minutes
- **25 toggleable map layers** — radar, alerts, tropical tracks, earthquakes, wildfires, lightning, buoys, air quality, SPC outlooks, space weather, tides, volcanoes, SST anomaly, and more
- **Storm scoring** — deterministic 0–100 score based on pressure drop, wind, precip, radar reflectivity, and active alerts before Claude is ever called
- **Anomaly detection** — Welford streaming baseline (browser localStorage) flags statistically unusual activity per region
- **Regional Weather Index** — 0–100 severity score for 20 monitored regions worldwide
- **Data freshness bar** — per-source staleness tracking with visual indicators

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Map | MapLibre GL JS |
| Backend | Python 3.11, FastAPI, uvicorn |
| AI | Claude (`claude-sonnet-4-20250514`) via Anthropic API |
| Data | 20+ free weather APIs (see below) |

## Data sources

### No API key required

| Source | Data |
|---|---|
| NWS CAP | US severe weather alerts + polygon geometries |
| RainViewer | Radar tiles (past + nowcast frames) |
| USGS FDSNWS | Real-time global earthquakes |
| EMSC | European seismological data |
| NHC RSS | Atlantic + East Pacific tropical storm advisories |
| Open-Meteo | 7-day forecast (temp, precip, wind, weather code) |
| NDBC | Ocean buoy observations (wave height, water temp, pressure) |
| USGS Waterservices | River gauge streamflow + gauge height |
| NOAA Tides & Currents | Water levels + tidal predictions (8 coastal stations) |
| NOAA SWPC | Space weather — Kp index, solar wind, geomagnetic alerts |
| NOAA SPC | Severe weather outlooks (categorical, tornado, wind, hail) |
| Smithsonian GVP | Global volcanic activity reports |
| USGS Volcano Hazards | US volcano updates |
| GDACS | Global disaster alerts including floods |
| ReliefWeb | International flood and disaster events |
| MeteoAlarm | European severe weather alerts |
| Blitzortung | Real-time lightning (WebSocket) |

### Free API key required

| Source | Data | Register at |
|---|---|---|
| Anthropic | Claude AI analysis and briefs | console.anthropic.com |
| OpenWeatherMap | Current conditions for map overlay | openweathermap.org/api |
| NASA FIRMS | Satellite wildfire hotspots | firms.modaps.eosdis.nasa.gov |
| OpenAQ | Global air quality stations | explore.openaq.org |
| EPA AirNow | US air quality observations | airnowapi.org |
| YouTube Data API | Storm chaser stream metadata | console.cloud.google.com |

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+

### Install and run

```bash
git clone https://github.com/shobyabdi/weathermonitor
cd weathermonitor

# Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY at minimum

# Start both servers
npm start
```

`npm start` installs all dependencies if missing, then launches:
- **Backend API** on http://localhost:8000
- **Frontend** on http://localhost:5173

Open http://localhost:5173 in your browser.

### Manual startup (alternative)

```bash
# Terminal 1 — backend
pip install -r requirements.txt
cd backend
uvicorn api.server:app --reload --port 8000

# Terminal 2 — frontend
npm install
npm run dev
```

### Environment variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — features degrade gracefully without these
OPENWEATHERMAP_API_KEY=...   # current conditions overlay
NASA_FIRMS_API_KEY=...       # satellite wildfire hotspots
OPENAQ_API_KEY=...           # global air quality
AIRNOW_API_KEY=...           # US air quality (airnowapi.org)
YOUTUBE_DATA_API_KEY=...     # storm chaser stream metadata

# Backend tuning
POLL_INTERVAL_SECONDS=600    # intelligence loop interval (default: 10 min)
STORM_SCORE_THRESHOLD=60     # minimum score to invoke Claude (default: 60)
ALERT_THRESHOLD=70           # minimum score to dispatch alert (default: 70)
```

## API endpoints

The FastAPI backend exposes these endpoints (proxied from the frontend via Vite):

| Endpoint | Source | Notes |
|---|---|---|
| `GET /api/alerts` | NWS CAP | Active severe weather alerts |
| `GET /api/radar` | RainViewer | Radar frame metadata |
| `GET /api/earthquakes` | USGS | Recent earthquakes |
| `GET /api/earthquakes/eu` | EMSC | European earthquakes |
| `GET /api/wildfires` | NASA FIRMS | Active fire hotspots |
| `GET /api/tropical` | NHC RSS | Active tropical systems |
| `GET /api/forecast` | Open-Meteo | 7-day forecast |
| `GET /api/buoys` | NDBC | Ocean buoy observations |
| `GET /api/river-gauges` | USGS | Streamflow gauges |
| `GET /api/tides` | NOAA | Coastal water levels |
| `GET /api/air-quality` | OpenAQ | Global air quality |
| `GET /api/air-quality/us` | EPA AirNow | US air quality |
| `GET /api/spc-outlooks` | NOAA SPC | Severe weather outlooks |
| `GET /api/space-weather` | NOAA SWPC | Kp index + solar wind |
| `GET /api/volcanoes` | GVP + USGS | Volcanic activity |
| `GET /api/floods/global` | GDACS + ReliefWeb | Global flood alerts |
| `GET /api/sst-anomaly` | Copernicus/ERDDAP | Sea surface temp anomaly |
| `GET /api/news-proxy` | Any RSS/Atom | Feed proxy |
| `GET /api/ai-brief` | Claude | Global weather brief (15 min cache) |
| `POST /api/ai-analyze` | Claude | Structured storm analysis |

Interactive API docs available at http://localhost:8000/docs when the backend is running.

## How the AI works

Claude is only called when the deterministic storm score exceeds 60/100. The score is computed from:

- Pressure drop rate (hPa/3h)
- Wind speed and gusts
- Precipitation intensity
- Active NWS alert severity
- Radar reflectivity (dBZ)
- YouTube storm chaser signal (secondary validation)

When score > 60, Claude receives structured weather data and returns a JSON object with summary, confidence level, expected impacts, and a safety recommendation. When score > 70 and confidence is medium or high, an alert is dispatched.

The global weather brief is generated every 15 minutes from aggregated alert, earthquake, wildfire, and tropical data — independent of the storm score.

## Project structure

```
weathermonitor/
├── backend/                  # Python FastAPI backend
│   ├── api/server.py         # 20 REST endpoints
│   ├── ingest/               # Per-source data fetchers
│   ├── intelligence/         # Claude client + prompts
│   ├── processing/           # Storm scoring, normalisation
│   └── main.py               # Continuous intelligence loop
├── src/                      # React/TypeScript frontend
│   ├── components/           # Map, panels, header, shared
│   ├── hooks/                # Data fetching hooks
│   └── lib/                  # RWI, convergence, classifier
├── data/                     # Static reference data
│   ├── youtube-channels.json # Curated storm chaser channels
│   └── feeds.ts              # 100+ RSS feed definitions
├── start.sh                  # One-command launcher
└── requirements.txt          # Python dependencies
```

## License

MIT
