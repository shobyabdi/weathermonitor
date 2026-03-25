import React, { useState } from 'react';
import type { TimeFilter } from '../../types';

export interface TimeFilterProps {
  activeFilter: TimeFilter;
  onChange: (filter: TimeFilter) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: '1h',  label: '1h'  },
  { value: '6h',  label: '6h'  },
  { value: '24h', label: '24h' },
  { value: '48h', label: '48h' },
  { value: '7d',  label: '7d'  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const TimeFilterComponent: React.FC<TimeFilterProps> = ({
  activeFilter,
  onChange,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: '#0a1220',
        border: '1px solid #1a2d44',
        borderRadius: '6px',
        padding: '2px',
        flexShrink: 0,
      }}
      role="group"
      aria-label="Time filter"
    >
      {TIME_OPTIONS.map(opt => (
        <TimePill
          key={opt.value}
          option={opt}
          isActive={opt.value === activeFilter}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
};

// ── Pill sub-component ────────────────────────────────────────────────────────

const TimePill: React.FC<{
  option: { value: TimeFilter; label: string };
  isActive: boolean;
  onClick: () => void;
}> = ({ option, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={isActive}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: isActive ? 700 : 400,
        fontSize: '12px',
        padding: '3px 9px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: isActive
          ? '#1a3a5c'
          : hovered
          ? 'rgba(74,184,255,0.06)'
          : 'transparent',
        color: isActive ? '#4ab8ff' : hovered ? '#90b8d8' : '#6a90b8',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        lineHeight: 1.4,
        outline: isActive ? '1px solid rgba(74,184,255,0.3)' : 'none',
      }}
    >
      {option.label}
    </button>
  );
};

export default TimeFilterComponent;
