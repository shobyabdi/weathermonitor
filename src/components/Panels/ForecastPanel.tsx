import React, { useState } from 'react';
import type { ForecastDay } from '../../types';

export interface ForecastPanelProps {
  forecast: ForecastDay[];
  location: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function wmoToEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function wmoDescription(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ heavy hail',
  };
  return map[code] ?? 'Unknown';
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tmrw';
  return d.toLocaleDateString([], { weekday: 'short' });
}

function precipBarColor(prob: number): string {
  if (prob >= 70) return '#4ab8ff';
  if (prob >= 40) return '#6a90b8';
  return '#1a3050';
}

// ── Day Row ──────────────────────────────────────────────────────────────────

const DayRow: React.FC<{ day: ForecastDay; isToday: boolean }> = ({ day, isToday }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '36px 24px 1fr 52px 44px',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 0',
      borderBottom: '1px solid #0d1a2a',
    }}
    title={wmoDescription(day.weatherCode)}
  >
    {/* Day label */}
    <span
      style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: '11px',
        fontWeight: isToday ? 700 : 500,
        color: isToday ? '#4ab8ff' : '#6a90b8',
        whiteSpace: 'nowrap',
      }}
    >
      {formatDayLabel(day.date)}
    </span>

    {/* Weather emoji */}
    <span style={{ fontSize: '14px', textAlign: 'center' }}>{wmoToEmoji(day.weatherCode)}</span>

    {/* Precip bar */}
    <div
      style={{
        height: '5px',
        borderRadius: '3px',
        background: '#0a1525',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, day.precipProb)}%`,
          background: precipBarColor(day.precipProb),
          borderRadius: '3px',
          transition: 'width 0.4s ease',
        }}
      />
    </div>

    {/* Precip probability */}
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        color: day.precipProb >= 50 ? '#4ab8ff' : '#4a6a8a',
        textAlign: 'right',
      }}
    >
      {day.precipProb}%
    </span>

    {/* Temp range */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '3px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
      }}
    >
      <span style={{ color: '#ff7b00', fontWeight: 700 }}>{Math.round(day.tempMax)}°</span>
      <span style={{ color: '#4a6a8a' }}>/</span>
      <span style={{ color: '#4ab8ff' }}>{Math.round(day.tempMin)}°</span>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ forecast, location }) => {
  const [collapsed, setCollapsed] = useState(false);

  const days = forecast.slice(0, 7);
  const today = new Date().toDateString();

  return (
    <div
      style={{
        background: '#0d1525',
        borderBottom: '1px solid #1a2d44',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px 8px',
          borderBottom: collapsed ? 'none' : '1px solid #1a2d44',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6a90b8',
            }}
          >
            7-Day Forecast
          </span>
          {location && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                color: '#4a6a8a',
              }}
            >
              {location}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '16px',
            color: '#6a90b8',
            lineHeight: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
          }}
        >
          ≡
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '4px 14px 8px' }}>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 24px 1fr 52px 44px',
              gap: '6px',
              padding: '4px 0 2px',
            }}
          >
            {['Day', '', 'Precip', '%', 'Hi/Lo'].map((h, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#4a6a8a',
                  textAlign: i >= 3 ? 'right' : 'left',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {days.length === 0 ? (
            <div
              style={{
                padding: '12px 0',
                textAlign: 'center',
                color: '#6a90b8',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                fontStyle: 'italic',
              }}
            >
              No forecast data
            </div>
          ) : (
            days.map((day, i) => (
              <DayRow
                key={day.date ?? i}
                day={day}
                isToday={new Date(day.date + 'T00:00:00').toDateString() === today}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ForecastPanel;
