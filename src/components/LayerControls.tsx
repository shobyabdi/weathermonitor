import React, { useState } from 'react';
import type { LayerId } from '../types';
import { WEATHER_LAYERS } from '../constants';

interface LayerControlsProps {
  activeLayers: Set<LayerId>;
  onToggleLayer: (id: LayerId) => void;
}

const LAYER_GROUPS: { label: string; ids: LayerId[] }[] = [
  {
    label: 'Core',
    ids: ['radar', 'alerts', 'lightning', 'hotspots', 'convergence'],
  },
  {
    label: 'Hazards',
    ids: ['tropical', 'wildfires', 'earthquakes', 'flood-gauges', 'storm-surge'],
  },
  {
    label: 'Atmosphere',
    ids: ['wind-field', 'pressure', 'cloud-cover', 'temp-anomaly', 'precip-anomaly'],
  },
  {
    label: 'Ocean/Land',
    ids: ['buoys', 'sea-surface-temp', 'snowpack', 'drought', 'fire-weather'],
  },
  {
    label: 'Tracks',
    ids: ['tropical-tracks', 'air-quality', 'infrastructure', 'stations', 'webcams'],
  },
];

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute' as const,
    top: '12px',
    left: '12px',
    zIndex: 10,
    width: '220px',
    maxHeight: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  panel: {
    background: 'rgba(13, 21, 37, 0.95)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: 'calc(100vh - 100px)',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  toggleLabel: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  chevron: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    transition: 'transform 0.2s',
  },
  scrollBody: {
    overflowY: 'auto' as const,
    padding: '8px 0',
  },
  group: {
    marginBottom: '4px',
  },
  groupLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '9px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
    padding: '6px 12px 3px',
  },
  layerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 12px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderRadius: '3px',
    margin: '0 4px',
  },
  layerLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    userSelect: 'none' as const,
  },
  toggle: {
    width: '28px',
    height: '14px',
    borderRadius: '7px',
    position: 'relative' as const,
    transition: 'background 0.2s',
    flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute' as const,
    top: '2px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
  },
};

export const LayerControls: React.FC<LayerControlsProps> = ({
  activeLayers,
  onToggleLayer,
}) => {
  const [expanded, setExpanded] = useState(true);

  const layerMap = Object.fromEntries(WEATHER_LAYERS.map(l => [l.id, l]));

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div
          style={styles.toggleButton}
          onClick={() => setExpanded(e => !e)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') setExpanded(prev => !prev); }}
          aria-expanded={expanded}
          aria-label="Toggle layer controls"
        >
          <span style={styles.toggleLabel}>Map Layers</span>
          <span
            style={{
              ...styles.chevron,
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            &#9660;
          </span>
        </div>

        {expanded && (
          <div style={styles.scrollBody} className="scroll-y">
            {LAYER_GROUPS.map(group => (
              <div key={group.label} style={styles.group}>
                <div style={styles.groupLabel}>{group.label}</div>
                {group.ids.map(id => {
                  const layer = layerMap[id];
                  if (!layer) return null;
                  const active = activeLayers.has(id);
                  return (
                    <div
                      key={id}
                      style={{
                        ...styles.layerRow,
                        background: active ? 'rgba(74, 184, 255, 0.06)' : 'transparent',
                      }}
                      onClick={() => onToggleLayer(id)}
                      role="checkbox"
                      aria-checked={active}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleLayer(id);
                        }
                      }}
                    >
                      <span
                        style={{
                          ...styles.layerLabel,
                          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {layer.label}
                      </span>
                      <div
                        style={{
                          ...styles.toggle,
                          background: active ? 'var(--accent-low)' : 'var(--border)',
                        }}
                      >
                        <div
                          style={{
                            ...styles.toggleThumb,
                            left: active ? '16px' : '2px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerControls;
