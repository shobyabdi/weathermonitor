import React, { useState } from 'react';

interface Stream {
  id: string;
  channelName: string;
  scene: string;
  region: string;
  viewers: number;
  gradientFrom: string;
  gradientTo: string;
  gradientMid?: string;
}

interface LiveStreamsProps {
  streams?: unknown[];
  activeRegion?: string;
}

// ── Hardcoded channel list ───────────────────────────────────────────────────

const HARDCODED_STREAMS: Stream[] = [
  {
    id: 'storm1',
    channelName: 'Reed Timmer Storm Chaser',
    scene: 'Supercell — Oklahoma',
    region: 'Great Plains',
    viewers: 4821,
    gradientFrom: '#0a1020',
    gradientMid: '#1a2a40',
    gradientTo: '#2a1a10',
  },
  {
    id: 'storm2',
    channelName: 'NWS Regional Office — Houston',
    scene: 'Gulf Coast Watch',
    region: 'Gulf Coast',
    viewers: 2103,
    gradientFrom: '#0a1830',
    gradientMid: '#102040',
    gradientTo: '#1a3020',
  },
  {
    id: 'storm3',
    channelName: 'WeatherNation Live',
    scene: 'National Overview',
    region: 'National',
    viewers: 9374,
    gradientFrom: '#100a20',
    gradientMid: '#1a1040',
    gradientTo: '#0a1525',
  },
];

// ── BlinkingDot ──────────────────────────────────────────────────────────────

const BlinkingDot: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: '#ff2020',
      animation: 'blink 1.2s ease-in-out infinite',
      flexShrink: 0,
    }}
  />
);

// ── StreamCard ────────────────────────────────────────────────────────────────

const StreamCard: React.FC<{ stream: Stream; isActive: boolean }> = ({ stream, isActive }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        background: '#111d2e',
        border: `1px solid ${isActive ? '#4ab8ff55' : '#1a2d44'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          position: 'relative',
          background: stream.gradientMid
            ? `linear-gradient(160deg, ${stream.gradientFrom} 0%, ${stream.gradientMid} 50%, ${stream.gradientTo} 100%)`
            : `linear-gradient(160deg, ${stream.gradientFrom} 0%, ${stream.gradientTo} 100%)`,
          overflow: 'hidden',
        }}
      >
        {/* Simulated scan-line texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            pointerEvents: 'none',
          }}
        />
        {/* "Static noise" blobs */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(ellipse 60% 40% at 25% 60%, rgba(255,255,255,0.03) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 75% 30%, rgba(255,255,255,0.025) 0%, transparent 60%)
            `,
          }}
        />

        {/* LIVE badge */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: '#ff2020',
            borderRadius: '10px',
            padding: '2px 7px 2px 5px',
          }}
        >
          <BlinkingDot />
          <span
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '9px',
              color: '#fff',
              letterSpacing: '0.08em',
            }}
          >
            LIVE
          </span>
        </div>

        {/* Viewer count */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: 'rgba(10,15,26,0.75)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: '#d8eaf8',
          }}
        >
          {stream.viewers.toLocaleString()} watching
        </div>

        {/* Channel name overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(0deg, rgba(10,15,26,0.9) 0%, transparent 100%)',
            padding: '12px 8px 6px',
          }}
        >
          <div
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              color: '#d8eaf8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {stream.channelName}
          </div>
        </div>
      </div>

      {/* Scene label */}
      <div
        style={{
          padding: '6px 8px 7px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: '#6a90b8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stream.scene}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#4a6a8a',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {stream.region}
        </span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const LiveStreams: React.FC<LiveStreamsProps> = ({ activeRegion }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Use exactly 3 hardcoded streams
  const streams = HARDCODED_STREAMS;

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
          <BlinkingDot />
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
            Live Streams
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#4a6a8a',
            }}
          >
            {streams.length} feeds
          </span>
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

      {/* Stream panels — exactly 3, no scrollbar */}
      {!collapsed && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            overflow: 'hidden',
          }}
        >
          {streams.map(stream => (
            <StreamCard
              key={stream.id}
              stream={stream}
              isActive={activeRegion ? stream.region.toLowerCase().includes(activeRegion.toLowerCase()) : false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveStreams;
