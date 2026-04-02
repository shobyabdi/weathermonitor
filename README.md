# Weather Intelligence Dashboard

A real-time severe weather monitoring dashboard focused on the Chicago / Bartlett, IL area. Built with React + TypeScript on the frontend and a Python FastAPI backend. Embeds Windy's live weather map with geo-positioned storm chaser streams overlaid on top.

---

## Features

- **Live Windy Map** — full-screen Windy embed with switchable overlays: Radar, Wind, Rain, Temp, Clouds, CAPE
- **Storm Chaser Pins** — clickable YouTube live stream embeds for Reed Timmer, Ryan Hall Y'all, Connor Croff, Live Storms Media, WxChasing, and NBC5 Chicago — play directly on the map
- **AI Weather Analysis** — Ollama (minimax-m2.7:cloud) generates a plain-English weather summary every 10 minutes, drawing from NWS alerts, Open-Meteo real-time conditions, NBC5 Chicago RSS, and the NWS Chicago/Romeoville (LOT) Area Forecast Discussion
- **Warning Banner** — top-of-screen alert bar for Extreme/Severe alerts only, expandable to show full description and instructions, with dismiss per alert
- **Multi-Source Alert Feed** — aggregated alerts from NWS API, NWS LOT office products (TOR, SVR, FFW, WSW, etc.), and NBC Chicago weather RSS — polling every 2 minutes
- **Live Streams Panel** — collapsible YouTube embeds in the sidebar: storm chasers + NBC5 Chicago
- **Weather Tools Panel** — quick-launch links to COD Radar, SPC Outlooks, Pivotal Weather, NWS Chicago, Windy, and more
- **5-Day Forecast** — daily forecast from Open-Meteo for Bartlett, IL
- **PWA** — installable on Android and iOS (Add to Home Screen), runs standalone full-screen

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Map | Windy embed (`embed.windy.com`) |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI | Ollama (`minimax-m2.7:cloud`) |
| Weather Data | NWS API, Open-Meteo, RainViewer, USGS |
| Alert Sources | NWS API (IL), NWS LOT office, NBC Chicago RSS |
| Tunnel | ngrok (for remote/mobile access) |

---

## Project Structure

```
weathermonitor/
├── backend/
│   ├── api/
│   │   └── server.py              # FastAPI endpoints
│   ├── ingest/
│   │   ├── alert_aggregator.py    # Multi-source alert aggregator
│   │   ├── weather_alerts.py      # NWS API alerts
│   │   ├── forecast.py            # Open-Meteo forecast
│   │   └── ...                    # Other data fetchers
│   ├── intelligence/
│   │   ├── claude_client.py       # Ollama LLM client
│   │   └── prompts.py             # AI prompt templates
│   └── main.py
├── src/
│   ├── App.tsx                    # Root layout
│   ├── components/
│   │   ├── WarningBanner.tsx      # Top alert bar (Extreme/Severe only)
│   │   ├── Map/
│   │   │   └── WeatherMap.tsx     # Windy iframe + overlays + streamer pins
│   │   └── Panels/
│   │       ├── LiveStreams.tsx
│   │       ├── WeatherTools.tsx
│   │       └── ...
│   ├── hooks/
│   │   ├── useWeatherAlerts.ts    # Polls /api/alerts every 2 min
│   │   └── ...
│   ├── types.ts
│   └── constants.ts
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── icons/
├── index.html
├── vite.config.ts
└── start.sh                       # One-command startup script
```

---

## Requirements

- **Node.js** 18+
- **Python** 3.11–3.13
- **Ollama** running locally with `minimax-m2.7:cloud` pulled

Install Ollama: https://ollama.com

Pull the model:
```bash
ollama pull minimax-m2.7:cloud
```

---

## Getting Started

```bash
git clone https://github.com/shobyabdi/weathermonitor.git
cd weathermonitor
./start.sh
```

Open **http://localhost:5173** in your browser.

The script will:
1. Create a Python virtual environment and install dependencies
2. Start the FastAPI backend on port 8000
3. Start the Vite dev server on port 5173

---

## Mobile / Remote Access

### Same WiFi
Open `http://<your-mac-ip>:5173` on any device on the same network.

### ngrok (anywhere)
```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken YOUR_TOKEN
ngrok http 5173
```
Open the generated `https://` URL on your phone.

### Install as PWA (Android)
1. Open the app URL in Chrome on Android
2. Tap ⋮ → **Add to Home Screen** / **Install app**
3. The app launches standalone with no browser chrome

### Install as PWA (iPhone)
1. Open in Safari
2. Tap Share → **Add to Home Screen**

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/alerts?area=IL` | Aggregated alerts (NWS + LOT + NBC5) |
| `GET /api/insight` | AI-generated weather analysis (Ollama) |
| `GET /api/forecast?lat=&lon=` | Open-Meteo 7-day forecast |
| `GET /api/radar` | RainViewer radar frames |
| `GET /api/earthquakes` | USGS earthquake feed |
| `GET /api/wildfires` | NASA FIRMS wildfire data |
| `GET /api/tropical` | Tropical storm data |
| `GET /api/news` | Weather RSS news feed |

---

## Configuration

Default location is **Bartlett, IL 60103** (lat: 41.97, lon: -88.19). To change:

1. `src/constants.ts` — update `REGIONS` array (map center/zoom)
2. `src/components/WeatherBrief.tsx` — update `BRIEF_URL` lat/lon
3. `src/hooks/useWeatherAlerts.ts` — update `area=IL` NWS state code
4. `backend/api/server.py` — update default coords and insight location string
5. `backend/ingest/alert_aggregator.py` — update LOT office code if outside Chicago area

---

## License

MIT
