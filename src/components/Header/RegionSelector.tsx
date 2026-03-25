import React, { useState } from 'react';
import type { Region } from '../../types';

export interface RegionSelectorProps {
  regions: Region[];
  activeRegion: Region;
  onSelect: (region: Region) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  activeRegion,
  onSelect,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
      }}
      role="group"
      aria-label="Region selector"
    >
      {regions.map(region => (
        <RegionPill
          key={region.name}
          region={region}
          isActive={region.name === activeRegion.name}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

// ── Pill sub-component ────────────────────────────────────────────────────────

const RegionPill: React.FC<{
  region: Region;
  isActive: boolean;
  onSelect: (region: Region) => void;
}> = ({ region, isActive, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(region)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={isActive}
      style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontWeight: isActive ? 700 : 500,
        fontSize: '12px',
        padding: '3px 10px',
        borderRadius: '20px',
        border: isActive
          ? '1px solid #4ab8ff'
          : hovered
          ? '1px solid #2a4a6a'
          : '1px solid #1a2d44',
        backgroundColor: isActive
          ? 'rgba(74, 184, 255, 0.18)'
          : hovered
          ? 'rgba(74, 184, 255, 0.06)'
          : 'transparent',
        color: isActive ? '#4ab8ff' : hovered ? '#90b8d8' : '#6a90b8',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {region.name}
    </button>
  );
};

export default RegionSelector;
