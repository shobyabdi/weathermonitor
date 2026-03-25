import React from 'react';

export interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
  size?: 'sm' | 'md' | 'lg';
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: '#fff',    bg: '#ff2020',   border: '#ff2020', label: 'CRITICAL' },
  Extreme:  { color: '#fff',    bg: '#ff2020',   border: '#ff2020', label: 'EXTREME'  },
  high:     { color: '#fff',    bg: '#ff7b00',   border: '#ff7b00', label: 'HIGH'     },
  Severe:   { color: '#fff',    bg: '#ff7b00',   border: '#ff7b00', label: 'SEVERE'   },
  medium:   { color: '#0a0f1a', bg: '#f5c518',   border: '#f5c518', label: 'MEDIUM'   },
  Moderate: { color: '#0a0f1a', bg: '#f5c518',   border: '#f5c518', label: 'MODERATE' },
  low:      { color: '#0a0f1a', bg: '#4ab8ff',   border: '#4ab8ff', label: 'LOW'      },
  Minor:    { color: '#0a0f1a', bg: '#4ab8ff',   border: '#4ab8ff', label: 'MINOR'    },
  info:     { color: '#0a0f1a', bg: '#60d080',   border: '#60d080', label: 'INFO'     },
};

const SIZE_CONFIG = {
  sm: { fontSize: '9px',  padding: '2px 6px',  borderRadius: '4px',  letterSpacing: '0.04em' },
  md: { fontSize: '11px', padding: '3px 8px',  borderRadius: '4px',  letterSpacing: '0.05em' },
  lg: { fontSize: '13px', padding: '4px 12px', borderRadius: '5px',  letterSpacing: '0.06em' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG['info'];
  const sizeStyle = SIZE_CONFIG[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Chakra Petch', sans-serif",
        fontWeight: 700,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...sizeStyle,
      }}
    >
      {config.label}
    </span>
  );
};

export default SeverityBadge;
