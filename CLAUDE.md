# CLAUDE.md — Weather Intelligence Dashboard

## Project Overview

Real-time severe weather monitoring dashboard for Bartlett, IL 60103. React/TypeScript frontend + Python FastAPI backend. The map is a Windy embed iframe — we do NOT use MapLibre or react-map-gl for the map itself anymore.

---

## Architecture

### Frontend (Vite + React 18 + TypeScript)
- Entry: `src/main.tsx` → `src/App.tsx`
- Map: `src/components/Map/WeatherMap.tsx` — Windy iframe embed with HTML overlays
- Sidebar panels: `src/components/Panels/`
- Data hooks: `src/hooks/` — each hook polls a `/api/*` endpoint
- Types: `src/types.ts`
- Constants (regions, layer configs): `src/constants.ts`

### Backend (Python FastAPI, port 8000)
- Entry: `backend/api/server.py`
- Ingest modules: `backend/ingest/` — one file per data source
- AI client: `backend/intelligence/claude_client.py` — calls local Ollama
- Vite proxies `/api/*` → `http://localhost:8000`

### AI
- Uses **Ollama** running locally at `http://localhost:11434`
- Model: `qwen3.5:latest`
- `"think": false` must be set in the payload to prevent empty responses
- Timeout: 120s

---

## Key Decisions & Context

### Map
- Switched from custom MapLibre GL JS to **Windy iframe embed** (`embed.windy.com/embed2.html`)
- Reason: MapLibre raster basemap returned "Zoom Level Not Supported" error tiles that could not be resolved
- Windy handles radar, wind, rain, satellite overlays natively
- Streamer pins are geo-positioned HTML elements overlaid on top of the iframe using Mercator projection math
- Pin positions are calculated from `region.center` + `region.zoom` — they do NOT sync with Windy's internal pan/zoom state (cross-origin limitation)

### AI
- Was Anthropic API — switched to Ollama because API credits ran out
- If switching back to Anthropic, update `backend/intelligence/claude_client.py`

### Location
- Default: **Bartlett, IL 60103** (lat: 41.97, lon: -88.19)
- NWS area code: `ILC` (Illinois)
- All four places that reference location must be updated together if changing:
  1. `src/constants.ts` — REGIONS array
  2. `src/components/WeatherBrief.tsx` — BRIEF_URL
  3. `src/hooks/useWeatherAlerts.ts` — ALERTS_URL area param
  4. `backend/api/server.py` — default coords + insight location string

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

For remote/mobile access: `ngrok http 5173`

---

## PWA

- `public/manifest.json` — app manifest
- `public/sw.js` — service worker (network-first, never caches /api or Windy)
- Icons in `public/icons/` — generated via Node.js PNG encoder (no PIL dependency)
- Service worker registered in `index.html`

---

## Known Issues / Gotchas

- **NWS alerts 400**: `area=ILC` occasionally returns 400 from api.weather.gov — transient API issue
- **Streamer pins drift**: If user pans/zooms inside the Windy iframe, HTML pins go out of sync — cannot fix without cross-origin iframe communication
- **ngrok URL changes**: Free ngrok tier generates a new URL each session — update `vite.config.ts` `allowedHosts` or use `allowedHosts: 'all'`
- **Ollama cold start**: First AI insight request after starting Ollama can take 30–60s
- **qwen3.5 think mode**: Must set `"think": false` in Ollama payload — otherwise the model uses all tokens on `<think>` blocks and returns empty content

---

## Code Style

- TypeScript strict mode
- Inline React styles (no CSS modules or Tailwind)
- CSS variables defined in global stylesheet: `--bg-primary`, `--bg-panel`, `--border`, `--accent`, `--text-primary`, `--text-secondary`, `--font-header`, `--font-body`, `--font-numeric`
- No extra abstractions — keep components simple and direct
- Don't add error handling for scenarios that can't happen
- Don't add docstrings or comments to code that wasn't changed
