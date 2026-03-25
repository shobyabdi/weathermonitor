import React, { useState, useEffect, useCallback } from 'react';

const BRIEF_URL = '/api/brief-text';
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

interface WeatherBriefProps {
  brief?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
}

function minutesAgo(ts: Date | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  return `${diff} minutes ago`;
}

// Split a brief text into up to 3 paragraphs
function splitParagraphs(text: string): string[] {
  // Try splitting by double-newline first
  const parts = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (parts.length >= 2) return parts.slice(0, 3);
  // Fallback: split into thirds by sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length <= 1) return [text];
  const third = Math.ceil(sentences.length / 3);
  return [
    sentences.slice(0, third).join(' '),
    sentences.slice(third, third * 2).join(' '),
    sentences.slice(third * 2).join(' '),
  ].filter(p => p.trim().length > 0);
}

const SkeletonLines: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="skeleton"
        style={{
          height: '12px',
          width: i % 3 === 2 ? '70%' : '100%',
          borderRadius: '4px',
        }}
      />
    ))}
  </div>
);

export const WeatherBrief: React.FC<WeatherBriefProps> = ({
  brief: briefProp,
  loading: loadingProp,
  onRefresh,
}) => {
  const [internalBrief, setInternalBrief] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [spinning, setSpinning] = useState(false);

  // If props are provided, use them; otherwise fetch internally
  const isControlled = briefProp !== undefined;
  const brief = isControlled ? briefProp : internalBrief;
  const loading = isControlled ? (loadingProp ?? false) : internalLoading;

  const fetchBrief = useCallback(async () => {
    if (isControlled) return;
    try {
      const res = await fetch(BRIEF_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = typeof data === 'string' ? data : (data.brief ?? data.text ?? JSON.stringify(data));
      setInternalBrief(text);
      setLastUpdated(new Date());
    } catch {
      // silently fail
    } finally {
      setInternalLoading(false);
    }
  }, [isControlled]);

  useEffect(() => {
    if (isControlled) return;
    fetchBrief();
    const timer = setInterval(fetchBrief, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchBrief, isControlled]);

  const handleRefresh = async () => {
    setSpinning(true);
    if (onRefresh) {
      onRefresh();
    } else {
      await fetchBrief();
    }
    setTimeout(() => setSpinning(false), 600);
  };

  const paragraphs = brief ? splitParagraphs(brief) : [];

  return (
    <div
      style={{
        background: '#0d1525',
        borderBottom: '1px solid #1a2d44',
        flexShrink: 0,
      }}
    >
      {/* ── Header ── */}
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
            Global Weather Brief
          </span>
          {lastUpdated && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '10px',
                color: '#4a6a8a',
              }}
            >
              Updated {minutesAgo(lastUpdated)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title="Refresh brief"
            style={{
              fontSize: '13px',
              color: '#6a90b8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              border: '1px solid #1a2d44',
              background: 'none',
              cursor: 'pointer',
              transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.5s ease, color 0.15s',
            } as React.CSSProperties}
          >
            ↻
          </button>
          {/* Collapse toggle */}
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
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '12px 14px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SkeletonLines count={3} />
              <SkeletonLines count={3} />
              <SkeletonLines count={2} />
            </div>
          ) : paragraphs.length === 0 ? (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#4a6a8a',
                fontStyle: 'italic',
              }}
            >
              Monitoring global weather conditions...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#90afd0',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {para.trim()}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherBrief;
