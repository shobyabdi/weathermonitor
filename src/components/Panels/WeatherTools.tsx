import React, { useState } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  icon: string;
}

const TOOLS: Tool[] = [
  {
    id: 'cod-radar',
    name: 'COD Radar Viewer',
    description: 'Full-resolution NEXRAD radar mosaic',
    url: 'https://weather.cod.edu/satrad/',
    category: 'Radar',
    icon: '📡',
  },
  {
    id: 'spc-outlooks',
    name: 'SPC Storm Outlooks',
    description: 'NOAA Storm Prediction Center outlooks',
    url: 'https://www.spc.noaa.gov/products/outlook/',
    category: 'Severe',
    icon: '⚡',
  },
  {
    id: 'spc-mesoscale',
    name: 'SPC Mesoscale Discussion',
    description: 'Active mesoscale discussions & watches',
    url: 'https://www.spc.noaa.gov/products/md/',
    category: 'Severe',
    icon: '🌀',
  },
  {
    id: 'pivotal-weather',
    name: 'Pivotal Weather',
    description: 'Model data, soundings & severe indices',
    url: 'https://www.pivotalweather.com/model.php',
    category: 'Models',
    icon: '🗺️',
  },
  {
    id: 'nws-forecast',
    name: 'NWS Chicago Forecast',
    description: 'Official NWS forecast for Chicago/IL',
    url: 'https://www.weather.gov/lot/',
    category: 'Forecast',
    icon: '🌤️',
  },
  {
    id: 'college-of-dupage',
    name: 'COD Satellite',
    description: 'GOES-East visible & IR satellite',
    url: 'https://weather.cod.edu/satrad/?parms=local-ChicagoIL-14-24-0-100-1',
    category: 'Satellite',
    icon: '🛰️',
  },
  {
    id: 'windy',
    name: 'Windy.com',
    description: 'Interactive wind & weather visualiser',
    url: 'https://www.windy.com/?41.969,-88.188,9',
    category: 'Models',
    icon: '💨',
  },
  {
    id: 'ryan-hall-yt',
    name: "Ryan Hall Y'all",
    description: 'Forecast videos & severe weather coverage',
    url: 'https://www.youtube.com/@RyanHallYall/streams',
    category: 'Streams',
    icon: '▶️',
  },
];

const CATEGORY_ORDER = ['Radar', 'Severe', 'Satellite', 'Models', 'Forecast', 'Streams'];

export const WeatherTools: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = CATEGORY_ORDER.filter(c => TOOLS.some(t => t.category === c));
  const filtered = activeCategory ? TOOLS.filter(t => t.category === activeCategory) : TOOLS;

  return (
    <div style={styles.panel}>
      <button style={styles.header} onClick={() => setCollapsed(c => !c)}>
        <span style={styles.headerTitle}>Weather Tools</span>
        <span style={styles.chevron}>{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div style={styles.body}>
          {/* Category filter pills */}
          <div style={styles.pills}>
            <button
              style={{ ...styles.pill, ...(activeCategory === null ? styles.pillActive : {}) }}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                style={{ ...styles.pill, ...(activeCategory === cat ? styles.pillActive : {}) }}
                onClick={() => setActiveCategory(c => c === cat ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tool grid */}
          <div style={styles.grid}>
            {filtered.map(tool => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.tile}
              >
                <span style={styles.tileIcon}>{tool.icon}</span>
                <div style={styles.tileText}>
                  <div style={styles.tileName}>{tool.name}</div>
                  <div style={styles.tileDesc}>{tool.description}</div>
                </div>
                <span style={styles.tileArrow}>↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
  },
  headerTitle: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--accent)',
  },
  chevron: {
    fontSize: 9,
    color: 'var(--text-secondary)',
  },
  body: {
    padding: '0 10px 10px',
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  pill: {
    padding: '2px 8px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    cursor: 'pointer',
  },
  pillActive: {
    background: 'var(--accent)',
    color: '#000',
    borderColor: 'var(--accent)',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  tileIcon: {
    fontSize: 14,
    flexShrink: 0,
    width: 20,
    textAlign: 'center',
  },
  tileText: {
    flex: 1,
    minWidth: 0,
  },
  tileName: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tileDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: 9,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tileArrow: {
    fontSize: 10,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
};
