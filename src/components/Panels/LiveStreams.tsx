import React, { useState } from 'react';

interface StreamChannel {
  id: string;
  embedSrc: string;
  name: string;
  description: string;
}

// Use channel live_stream embed for channels, direct video embed for specific streams
const STORM_CHANNELS: StreamChannel[] = [
  {
    id: 'user-stream-1',
    embedSrc: 'https://www.youtube.com/embed/-EvkHNtNqYc?autoplay=0&rel=0',
    name: 'Live Storm Stream',
    description: 'Featured live stream',
  },
  {
    id: 'connor-croff',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCb0U1g5r4kH_NDMGiGRhysA&autoplay=0&rel=0',
    name: 'Connor Croff',
    description: 'Storm chaser — live coverage',
  },
  {
    id: 'reed-timmer',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCV6hWxB0-u_IX7e-h4fEBAw&autoplay=0&rel=0',
    name: 'Reed Timmer',
    description: 'Storm chaser & meteorologist',
  },
  {
    id: 'ryan-hall',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCJHAT3Uvv-g3I8H3GhHWV7w&autoplay=0&rel=0',
    name: "Ryan Hall Y'all",
    description: 'Weather coverage & severe storms',
  },
  {
    id: 'live-storms',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UC1nJElGcVcTpeZJVyxEbzJw&autoplay=0&rel=0',
    name: 'Live Storms Media',
    description: 'Live storm chasing coverage',
  },
  {
    id: 'wx-chasing',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCD3KREyo3IqCLBC-4khGgIw&autoplay=0&rel=0',
    name: 'WxChasing',
    description: 'Brandon Clement — storm chaser',
  },
  {
    id: 'nbc5-chicago',
    embedSrc: 'https://www.youtube.com/embed/live_stream?channel=UCuJCUEDQFRSHBHHsLFMcGQg&autoplay=0&rel=0',
    name: 'NBC5 Chicago',
    description: 'WMAQ — Chicago local news & weather',
  },
];

const StreamEmbed: React.FC<{ channel: StreamChannel }> = ({ channel }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.card}>
      <button onClick={() => setExpanded(e => !e)} style={styles.cardHeader}>
        <div style={styles.cardLeft}>
          <span style={styles.liveDot} />
          <div>
            <div style={styles.channelName}>{channel.name}</div>
            <div style={styles.channelDesc}>{channel.description}</div>
          </div>
        </div>
        <span style={{ ...styles.chevron, transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {expanded && (
        <div style={styles.embedWrapper}>
          <iframe
            src={channel.embedSrc}
            style={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={channel.name}
          />
        </div>
      )}
    </div>
  );
};

export const LiveStreams: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={styles.root}>
      <button onClick={() => setCollapsed(c => !c)} style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.liveDot} />
          <span style={styles.headerLabel}>Live Storm Streams</span>
          <span style={styles.count}>{STORM_CHANNELS.length} channels</span>
        </div>
        <span style={{ ...styles.chevron, transform: collapsed ? 'rotate(-90deg)' : 'none' }}>▾</span>
      </button>

      {!collapsed && (
        <div style={styles.list}>
          {STORM_CHANNELS.map(ch => (
            <StreamEmbed key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg-panel)',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 14px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    fontFamily: 'var(--font-header)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  count: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
  liveDot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#ff2020',
    flexShrink: 0,
    animation: 'blink 1.4s ease-in-out infinite',
  },
  chevron: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    transition: 'transform 0.2s',
  },
  list: {
    maxHeight: 340,
    overflowY: 'auto' as const,
  },
  card: {
    borderBottom: '1px solid var(--border)',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  channelName: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'left' as const,
  },
  channelDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--text-secondary)',
    textAlign: 'left' as const,
  },
  embedWrapper: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
  },
  iframe: {
    position: 'absolute' as const,
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
};

export default LiveStreams;
