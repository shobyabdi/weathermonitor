# CLAUDE.md — Weather Intelligence Dashboard

## Project Overview

Real-time severe weather monitoring dashboard for Bartlett, IL 60103. React/TypeScript frontend + Python FastAPI backend. The map is a Windy embed iframe — we do NOT use MapLibre or react-map-gl for the map itself anymore.

---

## Architecture

### Frontend (Vite + React 18 + TypeScript)
- Entry: `src/main.tsx` → `src/App.tsx`
- Map: `src/components/Map/WeatherMap.tsx` — Windy iframe embed with HTML overlays
- Warning banner: `src/components/WarningBanner.tsx` — top bar, Extreme/Severe only, expandable
- Sidebar panels: `src/components/Panels/` and `src/components/AlertsFeed.tsx`
- Data hooks: `src/hooks/` — each hook polls a `/api/*` endpoint
- Types: `src/types.ts`
- Constants (regions, layer configs): `src/constants.ts`

### Backend (Python FastAPI, port 8000)
- Entry: `backend/api/server.py`
- Ingest modules: `backend/ingest/` — one file per data source
- Alert aggregator: `backend/ingest/alert_aggregator.py` — pulls NWS API + NWS LOT + NBC Chicago RSS
- AI client: `backend/intelligence/claude_client.py` — calls local Ollama
- Prompt template: `backend/intelligence/prompts.py`
- Vite proxies `/api/*` → `http://localhost:8000`

### AI
- Uses **Ollama** running locally at `http://localhost:11434`
- Model: `minimax-m2.7:cloud` (Minimax cloud model via Ollama)
- Timeout: 120s
- `max_tokens` for analyze_storm: 2048 (minimax is more verbose than qwen3.5)

### Alert Aggregation (`backend/ingest/alert_aggregator.py`)
- **NWS API** — `fetch_nws_alerts(area="IL")` — official CAP alerts for Illinois
- **NWS LOT office** — fetches product types: TOR, SVR, FFW, WSW, WCA, AFL, AFD from `api.weather.gov/products/types/{type}/locations/LOT`
- **NBC Chicago RSS** — `https://www.nbcchicago.com/tag/weather/feed/` — keyword-filtered headlines
- NBC items: onset set to `now()` so they pass frontend time filter; articles >7 days old are skipped
- All sources normalized to `WeatherAlert` shape and sorted by severity

### AI Insight Data Sources (`backend/api/server.py` → `get_insight`)
- **NWS alerts** — `fetch_nws_alerts(area="IL")`
- **Open-Meteo current conditions** — `_fetch_current_conditions()` — wind, gusts, direction, precip, pressure, 3h pressure trend for lat=41.97, lon=-88.19
- **NBC5 Chicago RSS** — top 5 weather headlines
- **NWS LOT AFD** — `_fetch_nws_lot_discussion()` — KEY MESSAGES section from latest Area Forecast Discussion

---

## Key Decisions & Context

### Map
- Switched from custom MapLibre GL JS to **Windy iframe embed** (`embed.windy.com/embed2.html`)
- Reason: MapLibre raster basemap returned "Zoom Level Not Supported" error tiles that could not be resolved
- Windy handles radar, wind, rain, satellite overlays natively
- Streamer pins are clickable dock on the right side of the map — click to open inline YouTube embed (320px wide, 16:9)
- Location names removed from streamer pins since chasers move around

### AI
- Was Anthropic API → switched to local Ollama (qwen3.5) when credits ran out → switched to minimax-m2.7:cloud via Ollama
- Storm score removed from AI prompt — still computed internally for display
- If switching back to Anthropic, update `backend/intelligence/claude_client.py`

### Alerts
- NWS area code changed from `ILC` (invalid) to `IL` (state code)
- Warning banner: shows only Extreme/Severe, expandable to full description + instructions
- Alert feed: all severities, shown below AI Analysis in sidebar, max 320px height with internal scroll
- Poll interval: 2 minutes — displayed in banner as "Polling every 2 min · Last checked HH:MM"

### Location
- Default: **Bartlett, IL 60103** (lat: 41.97, lon: -88.19)
- NWS state code: `IL`
- NWS office: `LOT` (Chicago/Romeoville)
- All places that reference location must be updated together if changing:
  1. `src/constants.ts` — REGIONS array
  2. `src/components/WeatherBrief.tsx` — BRIEF_URL
  3. `src/hooks/useWeatherAlerts.ts` — ALERTS_URL area param
  4. `backend/api/server.py` — default coords + insight location string + `_fetch_current_conditions` lat/lon
  5. `backend/ingest/alert_aggregator.py` — LOT office code if outside Chicago area

### Layers / Sidebar
- All data layers are always on — there is no layer toggle UI
- `ALL_LAYERS` constant in `App.tsx` passes a full Set to WeatherMap (kept for interface compat)
- The WeatherMap component no longer uses activeLayers, radarFrames, earthquakes, wildfires, or tropicalStorms props — Windy handles all of that

---

## Running the App

```bash
./start.sh
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Ollama must be running: `ollama serve`
- Model must be pulled: `ollama pull minimax-m2.7:cloud`

For remote/mobile access: `ngrok http 5173`

---

## PWA

- `public/manifest.json` — app manifest
- `public/sw.js` — service worker (network-first, never caches /api or Windy)
- Icons in `public/icons/` — generated via Node.js PNG encoder (no PIL dependency)
- Service worker registered in `index.html`

---

## Known Issues / Gotchas

- **Streamer pins drift**: If user pans/zooms inside the Windy iframe, HTML pins go out of sync — cannot fix without cross-origin iframe communication
- **ngrok URL changes**: Free ngrok tier generates a new URL each session — update `vite.config.ts` `allowedHosts` or use `allowedHosts: 'all'`
- **Ollama cold start**: First AI insight request after starting Ollama can take 30–60s
- **minimax token length**: `max_tokens` must be 2048+ for analyze_storm — minimax responses are longer than qwen3.5 and truncation breaks JSON parsing
- **NBC5 RSS old articles**: NBC weather RSS can surface months-old articles — articles >7 days old are filtered; `onset` is set to `now()` so they pass the frontend time filter
- **NWS LOT product age**: LOT products older than 6 hours are skipped to avoid stale warnings

---

## Code Style

- TypeScript strict mode
- Inline React styles (no CSS modules or Tailwind)
- CSS variables defined in global stylesheet: `--bg-primary`, `--bg-panel`, `--border`, `--accent`, `--text-primary`, `--text-secondary`, `--font-header`, `--font-body`, `--font-numeric`
- No extra abstractions — keep components simple and direct
- Don't add error handling for scenarios that can't happen
- Don't add docstrings or comments to code that wasn't changed
