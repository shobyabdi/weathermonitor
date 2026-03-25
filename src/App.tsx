import React, { useState, useEffect, useCallback } from 'react';
import type { WeatherAlert, ClaudeInsight, LayerId, Region, TimeFilter } from './types';
import { WEATHER_LAYERS, REGIONS } from './constants';
import { useWeatherAlerts } from './hooks/useWeatherAlerts';
import { useTropical } from './hooks/useTropical';
import { useRadar } from './hooks/useRadar';
import { useEarthquakes } from './hooks/useEarthquakes';
import { useWildfires } from './hooks/useWildfires';
import { Header } from './components/Header';
import { WeatherMap } from './components/WeatherMap';
import { AIAnalysis } from './components/AIAnalysis';
import { WeatherBrief } from './components/WeatherBrief';
import { AlertsFeed } from './components/AlertsFeed';
import { LayerControls } from './components/LayerControls';

// Derive initial active layers from layer config defaults
const DEFAULT_ACTIVE_LAYERS = new Set<LayerId>(
  WEATHER_LAYERS.filter(l => l.default).map(l => l.id)
);

const INSIGHT_POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes
const INSIGHT_URL = '/api/insight';

function App() {
  // UI state
  const [activeLayers, setActiveLayers] = useState<Set<LayerId>>(DEFAULT_ACTIVE_LAYERS);
  const [activeRegion, setActiveRegion] = useState<Region>(REGIONS[0]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);
  const [claudeInsight, setClaudeInsight] = useState<ClaudeInsight | null>(null);

  // Data hooks
  const { alerts, lastUpdate: alertsLastUpdate } = useWeatherAlerts();
  const { storms } = useTropical();
  const { frames: radarFrames, host: radarHost } = useRadar();
  const radarData = radarFrames.length > 0
    ? { generated: 0, host: radarHost, radar: { past: radarFrames, nowcast: [] } }
    : null;
  const { earthquakes } = useEarthquakes();
  const { wildfires } = useWildfires();

  // Layer toggle handler
  const handleToggleLayer = useCallback((id: LayerId) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Region change handler — deselects any selected alert
  const handleRegionChange = useCallback((region: Region) => {
    setActiveRegion(region);
    setSelectedAlert(null);
  }, []);

  // Fetch Claude insight
  useEffect(() => {
    let cancelled = false;

    const fetchInsight = async () => {
      try {
        const res = await fetch(INSIGHT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ClaudeInsight = await res.json();
        if (!cancelled) setClaudeInsight(data);
      } catch {
        // Silently fail — insight will remain null (loading skeleton shown)
      }
    };

    fetchInsight();
    const timer = setInterval(fetchInsight, INSIGHT_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header Bar ── */}
      <Header
        activeRegion={activeRegion}
        onRegionChange={handleRegionChange}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        alertCount={alerts.filter(a => a.severity === 'Extreme' || a.severity === 'Severe').length}
        lastUpdate={alertsLastUpdate}
      />

      {/* ── Main Content ── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* ── Left: Map (72%) ── */}
        <div
          style={{
            flex: '0 0 72%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <WeatherMap
            activeLayers={activeLayers}
            activeRegion={activeRegion}
            timeFilter={timeFilter}
            alerts={alerts}
            storms={storms}
            earthquakes={earthquakes}
            wildfires={wildfires}
            radarData={radarData}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
          />
          {/* Layer controls overlaid on map */}
          <LayerControls
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
          />
        </div>

        {/* ── Right: Sidebar (28%) ── */}
        <div
          style={{
            flex: '0 0 28%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* AI Insight */}
          <AIAnalysis insight={claudeInsight} />

          {/* 5-Day Brief */}
          <WeatherBrief />

          {/* Live Alerts Feed — takes remaining space and scrolls */}
          <AlertsFeed
            alerts={alerts}
            onSelectAlert={setSelectedAlert}
            selectedAlert={selectedAlert}
            timeFilter={timeFilter}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
