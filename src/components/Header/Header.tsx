import React, { useState } from 'react';
import type { Region, TimeFilter } from '../../types';
import { RegionSelector } from './RegionSelector';
import { TimeFilterComponent } from './TimeFilter';
import { REGIONS } from '../../constants';

export interface HeaderProps {
  region: Region;
  onRegionChange: (region: Region) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  alertCount: number;
  onNotificationsClick?: () => void;
  // Legacy prop alias used in App.tsx
  activeRegion?: Region;
  lastUpdate?: Date | null;
}

const NAV_ITEMS = ['Radar Overview', 'Live Feeds', 'Alert History', 'Settings'] as const;

export const Header: React.FC<HeaderProps> = ({
  region,
  activeRegion,
  onRegionChange,
  timeFilter,
  onTimeFilterChange,
  alertCount,
  onNotificationsClick,
}) => {
  const [activeNav, setActiveNav] = useState<string>('Radar Overview');

  // Support both prop names for backwards compat
  const currentRegion = region ?? activeRegion ?? REGIONS[0];

  return (
    <header
      style={{
        backgroundColor: '#0a0f1a',
        borderBottom: '1px solid #1a2d44',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ── Top row: Logo | Nav | Actions ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '48px',
          gap: '12px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            color: '#d8eaf8',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⛈</span>
          <span style={{ color: '#4ab8ff' }}>Weather</span>
          <span style={{ color: '#d8eaf8', fontWeight: 400 }}> Intelligence</span>
        </div>

        {/* Center nav */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {NAV_ITEMS.map((item, idx) => {
            const isActive = item === activeNav;
            return (
              <React.Fragment key={item}>
                {idx > 0 && (
                  <span
                    style={{
                      color: '#1a2d44',
                      fontSize: '14px',
                      margin: '0 2px',
                      pointerEvents: 'none',
                    }}
                  >
                    |
                  </span>
                )}
                <NavButton
                  label={item}
                  isActive={isActive}
                  onClick={() => setActiveNav(item)}
                />
              </React.Fragment>
            );
          })}
        </nav>

        {/* Right actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {/* Alert bell */}
          <button
            onClick={onNotificationsClick}
            title={`${alertCount} active alert${alertCount !== 1 ? 's' : ''}`}
            style={{
              position: 'relative',
              background: alertCount > 0 ? 'rgba(255,123,0,0.08)' : 'none',
              border: `1px solid ${alertCount > 0 ? '#ff7b0055' : '#1a2d44'}`,
              borderRadius: '6px',
              padding: '5px 8px',
              cursor: 'pointer',
              fontSize: '16px',
              color: alertCount > 0 ? '#ff7b00' : '#6a90b8',
              transition: 'all 0.15s ease',
              lineHeight: 1,
            }}
          >
            🔔
            {alertCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#ff2020',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  minWidth: '17px',
                  height: '17px',
                  borderRadius: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1,
                  animation: 'pulse-shadow 2s ease infinite',
                }}
              >
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* Email icon */}
          <IconButton title="Email notifications" icon="✉" />

          {/* Settings gear */}
          <IconButton title="Settings" icon="⚙" />
        </div>
      </div>

      {/* ── Bottom row: RegionSelector + TimeFilter ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px 6px',
          gap: '12px',
          borderTop: '1px solid #0d1a2a',
        }}
      >
        <RegionSelector
          regions={REGIONS}
          activeRegion={currentRegion}
          onSelect={onRegionChange}
        />
        <TimeFilterComponent
          activeFilter={timeFilter}
          onChange={onTimeFilterChange}
        />
      </div>
    </header>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontWeight: isActive ? 700 : 400,
        fontSize: '13px',
        padding: '4px 10px',
        border: 'none',
        borderBottom: isActive ? '2px solid #4ab8ff' : '2px solid transparent',
        backgroundColor: 'transparent',
        color: isActive ? '#4ab8ff' : hovered ? '#90b8d8' : '#6a90b8',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        borderRadius: '0',
        lineHeight: '24px',
      }}
    >
      {label}
    </button>
  );
};

const IconButton: React.FC<{ title: string; icon: string; onClick?: () => void }> = ({
  title,
  icon,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: '1px solid #1a2d44',
        borderRadius: '6px',
        padding: '5px 8px',
        cursor: 'pointer',
        fontSize: '15px',
        color: hovered ? '#90b8d8' : '#6a90b8',
        transition: 'color 0.15s ease, border-color 0.15s ease',
        borderColor: hovered ? '#2a4a6a' : '#1a2d44',
        lineHeight: 1,
      }}
    >
      {icon}
    </button>
  );
};

export default Header;
