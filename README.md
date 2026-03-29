# Weather Intelligence Dashboard

A real-time severe weather monitoring dashboard focused on the Chicago / Bartlett, IL area. Built with React + TypeScript on the frontend and a Python FastAPI backend. Embeds Windy's live weather map with geo-positioned storm chaser streams overlaid on top.

---

## Features

- **Live Windy Map** — full-screen Windy embed with switchable overlays: Radar, Wind, Rain, Temp, Clouds, CAPE
- **Storm Chaser Pins** — geo-positioned YouTube live stream pins for Reed Timmer, Ryan Hall Y'all, Connor Croff, Live Storms Media, and WxChasing
- **AI Weather Brief** — local Ollama (qwen3.5) generates a plain-English weather summary for Bartlett, IL every 10 minutes
- **NWS Alert Feed** — live severe weather alerts for Illinois, colour-coded by severity with rotating storm badge overlay
- **Live Streams Panel** — collapsible YouTube embeds: storm chasers + NBC5 Chicago
- **Weather Tools Panel** — quick-launch links to COD Radar, SPC Outlooks, Pivotal Weather, NWS Chicago, Windy, and more
- **Weather Brief** — 7-day forecast from Open-Meteo for Bartlett, IL
- **PWA** — installable on Android and iOS (Add to Home Screen), runs standalone full-screen

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Map | Windy embed (`embed.windy.com`) |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI | Ollama (qwen3.5:latest) running locally |
| Data | NWS API, RainViewer, USGS, Open-Meteo, NASA FIRMS |
| Tunnel | ngrok (for remote/mobile access) |

---

## Project Structure

```
weathermonitor/
├── backend/
│   ├── api/
│   │   └── server.py          # FastAPI endpoints
│   ├── ingest/                # Data fetchers (alerts, radar, earthquakes, etc.)
│   ├── intelligence/
│   │   ├── claude_client.py   # Ollama LLM client
│   │   └── prompts.py         # AI prompt templates
│   └── main.py
├── src/
│   ├── App.tsx                # Root layout
│   ├── components/
│   │   ├── Map/
│   │   │   └── WeatherMap.tsx # Windy iframe + overlays + streamer pins
│   │   └── Panels/
│   │       ├── LiveStreams.tsx
│   │       ├── WeatherTools.tsx
│   │       ├── AIAnalysis.tsx
│   │       └── AlertsFeed.tsx
│   ├── hooks/                 # Data polling hooks
│   ├── types.ts
│   └── constants.ts
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # App icons (72–512px)
├── index.html
├── vite.config.ts
└── start.sh                   # One-command startup script
```

---

## Requirements

- **Node.js** 18+
- **Python** 3.11–3.13
- **Ollama** running locally with `qwen3.5:latest` pulled

Install Ollama: https://ollama.com

Pull the model:
```bash
ollama pull qwen3.5:latest
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
| `GET /api/alerts?area=ILC` | NWS weather alerts for Illinois |
| `GET /api/radar` | RainViewer radar frames |
| `GET /api/earthquakes` | USGS earthquake feed |
| `GET /api/wildfires` | NASA FIRMS wildfire data |
| `GET /api/tropical` | Tropical storm data |
| `GET /api/forecast?lat=&lon=` | Open-Meteo 7-day forecast |
| `GET /api/insight` | AI-generated weather brief (Ollama) |
| `GET /api/news` | Weather RSS news feed |

---

## Configuration

Default location is **Bartlett, IL 60103** (lat: 41.97, lon: -88.19). To change:

- `src/constants.ts` — update `REGIONS` array (map center/zoom)
- `src/components/WeatherBrief.tsx` — update `BRIEF_URL` lat/lon
- `src/hooks/useWeatherAlerts.ts` — update `area=ILC` NWS area code
- `backend/api/server.py` — update default coords and insight location

---

## License

MIT
