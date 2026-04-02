import React, { useState, useEffect, useCallback } from 'react';
import type { WeatherAlert, ClaudeInsight, Region, TimeFilter } from './types';
import { REGIONS } from './constants';
import { useWeatherAlerts } from './hooks/useWeatherAlerts';
import { Header } from './components/Header';
import { WarningBanner } from './components/WarningBanner';
import { WeatherMap } from './components/Map/WeatherMap';
import { AIAnalysis } from './components/AIAnalysis';
import { WeatherBrief } from './components/WeatherBrief';
import { AlertsFeed } from './components/AlertsFeed';
import { LiveStreams } from './components/Panels/LiveStreams';
import { WeatherTools } from './components/Panels/WeatherTools';

const INSIGHT_POLL_INTERVAL = 10 * 60 * 1000;
const INSIGHT_URL = '/api/insight';

function App() {
  const [activeRegion, setActiveRegion] = useState<Region>(REGIONS[0]);
  const [timeFilter] = useState<TimeFilter>('3h');
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);
  const [claudeInsight, setClaudeInsight] = useState<ClaudeInsight | null>(null);

  const { alerts, lastUpdate: alertsLastUpdate } = useWeatherAlerts();

  const handleRegionChange = useCallback((region: Region) => {
    setActiveRegion(region);
    setSelectedAlert(null);
  }, []);

  const refreshInsight = useCallback(async () => {
    try {
      const res = await fetch(`${INSIGHT_URL}?refresh=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ClaudeInsight = await res.json();
      setClaudeInsight(data);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchInsight = async () => {
      try {
        const res = await fetch(INSIGHT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ClaudeInsight = await res.json();
        if (!cancelled) setClaudeInsight(data);
      } catch {
        // Silently fail
      }
    };
    fetchInsight();
    const timer = setInterval(fetchInsight, INSIGHT_POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Header
        activeRegion={activeRegion}
        onRegionChange={handleRegionChange}
        timeFilter={timeFilter}
        onTimeFilterChange={() => {}}
        alertCount={alerts.filter(a => a.severity === 'Extreme' || a.severity === 'Severe').length}
        lastUpdate={alertsLastUpdate}
      />

      <WarningBanner alerts={alerts} lastUpdate={alertsLastUpdate} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Map — 72% */}
        <div style={{ flex: '0 0 72%', position: 'relative', overflow: 'hidden' }}>
          <WeatherMap
            region={activeRegion}
            alerts={alerts}
            selectedAlert={selectedAlert}
            onAlertClick={setSelectedAlert}
            insight={claudeInsight}
          />
        </div>

        {/* Sidebar — 28% */}
        <div style={{ flex: '0 0 28%', display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
          <AIAnalysis insight={claudeInsight} onRefresh={refreshInsight} />
          <div style={{ maxHeight: 320, display: 'flex', flexDirection: 'column', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
            <AlertsFeed
              alerts={alerts}
              onSelectAlert={setSelectedAlert}
              selectedAlert={selectedAlert}
              timeFilter={timeFilter}
            />
          </div>
          <WeatherBrief />
          <WeatherTools />
          <LiveStreams />
        </div>
      </div>
    </div>
  );
}

export default App;
