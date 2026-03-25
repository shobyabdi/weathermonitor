/**
 * LayerControls.tsx
 * Collapsible map layer toggle panel, absolutely positioned on the map.
 * Groups layers into Always On / Active / Optional categories.
 * Layers whose zoomMin exceeds the current map zoom are shown disabled.
 */

import React, { useState } from 'react';
import type { LayerConfig, LayerId } from '@/types';

interface LayerControlsProps {
  layers: LayerConfig[];
  activeLayers: Set<LayerId>;
  onToggle: (id: LayerId) => void;
  zoom: number;
}

// ── Layer grouping ────────────────────────────────────────────────────────────

const ALWAYS_ON_IDS: LayerId[] = ['radar', 'alerts', 'tropical'];
const ACTIVE_IDS: LayerId[] = ['lightning', 'wildfires', 'earthquakes'];

interface LayerGroup {
  label: string;
  ids: LayerId[];
}

function buildGroups(layers: LayerConfig[]): LayerGroup[] {
  const allIds = new Set(layers.map((l) => l.id));
  const alwaysOnSet = new Set(ALWAYS_ON_IDS.filter((id) => allIds.has(id)));
  const activeSet = new Set(ACTIVE_IDS.filter((id) => allIds.has(id)));

  const optionalIds = layers
    .map((l) => l.id)
    .filter((id) => !alwaysOnSet.has(id) && !activeSet.has(id));

  return [
    { label: 'Always On', ids: ALWAYS_ON_IDS.filter((id) => allIds.has(id)) },
    { label: 'Active Hazards', ids: ACTIVE_IDS.filter((id) => allIds.has(id)) },
    { label: 'Optional', ids: optionalIds },
  ].filter((g) => g.ids.length > 0);
}

// ── Colour dot per layer ──────────────────────────────────────────────────────

const LAYER_DOTS: Partial<Record<LayerId, string>> = {
  radar: '#00e060',
  alerts: '#ff2020',
  tropical: '#c040ff',
  lightning: '#f5c518',
  wildfires: '#ff7b00',
  earthquakes: '#4ab8ff',
  'flood-gauges': '#228b22',
  buoys: '#00bfff',
  'air-quality': '#aaffaa',
  'sea-surface-temp': '#0099ff',
  snowpack: '#87ceeb',
  drought: '#cc8844',
  'temp-anomaly': '#ff4500',
  'precip-anomaly': '#4444ff',
  'tropical-tracks': '#c040ff',
  'storm-surge': '#00aaff',
  'fire-weather': '#ff6600',
  'wind-field': '#aaaaff',
  'cloud-cover': '#cccccc',
  pressure: '#88aaff',
  infrastructure: '#ffcc00',
  stations: '#aaffff',
  webcams: '#ff88aa',
  hotspots: '#ff3300',
  convergence: '#00ffcc',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const LayerControls: React.FC<LayerControlsProps> = ({
  layers,
  activeLayers,
  onToggle,
  zoom,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Always On', 'Active Hazards']),
  );

  const layerMap = Object.fromEntries(layers.map((l) => [l.id, l]));
  const groups = buildGroups(layers);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        {/* ── Header ── */}
        <div
          style={styles.header}
          onClick={() => setExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label="Toggle layer controls panel"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((prev) => !prev);
            }
          }}
        >
          <span style={styles.headerIcon}>&#9776;</span>
          <span style={styles.headerLabel}>Map Layers</span>
          <span
            style={{
              ...styles.headerChevron,
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            &#9660;
          </span>
        </div>

        {/* ── Active layer count badge ── */}
        {!expanded && activeLayers.size > 0 && (
          <div style={styles.collapsedBadge}>{activeLayers.size} active</div>
        )}

        {/* ── Body ── */}
        {expanded && (
          <div style={styles.body} className="scroll-y">
            {groups.map((group) => {
              const isGroupOpen = expandedGroups.has(group.label);
              return (
                <div key={group.label} style={styles.group}>
                  {/* Group header */}
                  <div
                    style={styles.groupHeader}
                    onClick={() => toggleGroup(group.label)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(group.label);
                      }
                    }}
                  >
                    <span style={styles.groupLabel}>{group.label}</span>
                    <span
                      style={{
                        ...styles.groupChevron,
                        transform: isGroupOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      }}
                    >
                      &#9660;
                    </span>
                  </div>

                  {/* Layer rows */}
                  {isGroupOpen &&
                    group.ids.map((id) => {
                      const layer = layerMap[id];
                      if (!layer) return null;

                      const active = activeLayers.has(id);
                      const zoomDisabled = layer.zoomMin > zoom;
                      const dot = LAYER_DOTS[id] ?? '#6a90b8';

                      return (
                        <LayerRow
                          key={id}
                          layer={layer}
                          active={active}
                          disabled={zoomDisabled}
                          dot={dot}
                          zoom={zoom}
                          onToggle={onToggle}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── LayerRow sub-component ────────────────────────────────────────────────────

interface LayerRowProps {
  layer: LayerConfig;
  active: boolean;
  disabled: boolean;
  dot: string;
  zoom: number;
  onToggle: (id: LayerId) => void;
}

const LayerRow: React.FC<LayerRowProps> = ({
  layer,
  active,
  disabled,
  dot,
  zoom,
  onToggle,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.layerRow,
        background: hovered && !disabled ? 'rgba(74,184,255,0.06)' : 'transparent',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => {
        if (!disabled) onToggle(layer.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="checkbox"
      aria-checked={active}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onToggle(layer.id);
        }
      }}
      title={
        disabled
          ? `Zoom in to z${layer.zoomMin}+ to enable (current: z${Math.floor(zoom)})`
          : layer.label
      }
    >
      {/* Colour dot */}
      <div
        style={{
          ...styles.colorDot,
          background: active ? dot : 'transparent',
          border: `1.5px solid ${active ? dot : '#3a5570'}`,
        }}
      />

      {/* Label */}
      <span
        style={{
          ...styles.layerLabel,
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {layer.label}
      </span>

      {/* Zoom hint */}
      {disabled && (
        <span style={styles.zoomHint}>z{layer.zoomMin}+</span>
      )}

      {/* Toggle switch */}
      <div
        style={{
          ...styles.toggle,
          background: active ? dot : '#1a2d44',
          boxShadow: active ? `0 0 6px ${dot}66` : 'none',
        }}
      >
        <div
          style={{
            ...styles.toggleThumb,
            left: active ? 14 : 2,
          }}
        />
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 56,
    right: 10,
    zIndex: 15,
    width: 210,
    maxHeight: 'calc(100vh - 200px)',
    display: 'flex',
    flexDirection: 'column',
  },
  panel: {
    background: 'rgba(10, 15, 26, 0.96)',
    border: '1px solid #1a2d44',
    borderRadius: 8,
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'inherit',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    borderBottom: '1px solid #1a2d44',
    flexShrink: 0,
    userSelect: 'none',
  },
  headerIcon: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  headerLabel: {
    fontFamily: 'var(--font-header)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    flex: 1,
  },
  headerChevron: {
    fontSize: 9,
    color: 'var(--text-secondary)',
    transition: 'transform 0.2s',
  },
  collapsedBadge: {
    padding: '4px 10px',
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
  body: {
    overflowY: 'auto',
    paddingBottom: 6,
  },
  group: {
    borderBottom: '1px solid rgba(26, 45, 68, 0.6)',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 10px 4px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  groupLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: 'var(--text-secondary)',
  },
  groupChevron: {
    fontSize: 8,
    color: 'var(--text-secondary)',
    transition: 'transform 0.18s',
  },
  layerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    transition: 'background 0.1s',
    borderRadius: 3,
    margin: '1px 4px',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.2s, border-color 0.2s',
  },
  layerLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    flex: 1,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  zoomHint: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 8,
    color: '#3a5570',
    flexShrink: 0,
  },
  toggle: {
    width: 28,
    height: 14,
    borderRadius: 7,
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s, box-shadow 0.2s',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ffffff',
    transition: 'left 0.2s',
  },
};

export default LayerControls;
