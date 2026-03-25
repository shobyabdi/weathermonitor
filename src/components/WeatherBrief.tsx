import React, { useState, useEffect } from 'react';
import type { ForecastDay } from '../types';

const BRIEF_URL = '/api/brief';

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Icy Fog',
  51: 'Light Drizzle',
  61: 'Light Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  71: 'Light Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Showers',
  81: 'Heavy Showers',
  82: 'Violent Showers',
  85: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ Hail',
  99: 'Thunderstorm w/ Heavy Hail',
};

function wmoToEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2 || code === 3) return '⛅';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function precipProbColor(prob: number): string {
  if (prob >= 70) return 'var(--accent-low)';
  if (prob >= 40) return 'var(--text-secondary)';
  return 'var(--border)';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  header: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },
  dayCard: {
    background: 'var(--bg-card)',
    borderRadius: '6px',
    padding: '8px 6px',
    textAlign: 'center' as const,
    border: '1px solid var(--border)',
    cursor: 'default',
  },
  dayLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '9px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  weatherIcon: {
    fontSize: '16px',
    lineHeight: 1,
    marginBottom: '4px',
  },
  tempRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    fontFamily: 'var(--font-numeric)',
    fontSize: '11px',
    marginBottom: '4px',
  },
  tempMax: {
    color: 'var(--accent-high)',
    fontWeight: 700,
  },
  tempMin: {
    color: 'var(--accent-low)',
  },
  precipBar: {
    height: '3px',
    borderRadius: '2px',
    transition: 'background 0.2s',
    marginBottom: '2px',
  },
  precipLabel: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '9px',
    color: 'var(--text-secondary)',
  },
  loading: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  },
  skeletonCard: {
    height: '80px',
    borderRadius: '6px',
  },
};

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tmrw';
  return date.toLocaleDateString([], { weekday: 'short' });
}

export const WeatherBrief: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchBrief = async () => {
      try {
        const res = await fetch(BRIEF_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ForecastDay[] = await res.json();
        if (!cancelled) {
          setForecast(data.slice(0, 5));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBrief();
    const timer = setInterval(fetchBrief, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>5-Day Outlook</div>
      {loading ? (
        <div style={styles.loading}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={styles.skeletonCard} />
          ))}
        </div>
      ) : forecast.length === 0 ? (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No forecast data available
        </div>
      ) : (
        <div style={styles.grid}>
          {forecast.map((day, i) => (
            <div key={i} style={styles.dayCard} title={day.description || WMO_DESCRIPTIONS[day.weatherCode] || ''}>
              <div style={styles.dayLabel}>{formatDayLabel(day.date)}</div>
              <div style={styles.weatherIcon}>{wmoToEmoji(day.weatherCode)}</div>
              <div style={styles.tempRow}>
                <span style={styles.tempMax}>{Math.round(day.tempMax)}°</span>
                <span style={styles.tempMin}>{Math.round(day.tempMin)}°</span>
              </div>
              <div
                style={{
                  ...styles.precipBar,
                  background: precipProbColor(day.precipProb),
                  width: '100%',
                }}
                title={`${day.precipProb}% precip probability`}
              />
              <div style={styles.precipLabel}>{day.precipProb}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherBrief;
