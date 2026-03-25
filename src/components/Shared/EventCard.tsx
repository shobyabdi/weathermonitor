import React, { useState } from 'react';

export interface EventCardProps {
  title: string;
  subtitle?: string;
  severity: string;
  time?: string;
  location?: string;
  onClick?: () => void;
  selected?: boolean;
}

// ── Severity → border color ──────────────────────────────────────────────────

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#ff2020',
  Extreme:  '#ff2020',
  high:     '#ff7b00',
  Severe:   '#ff7b00',
  medium:   '#f5c518',
  Moderate: '#f5c518',
  low:      '#4ab8ff',
  Minor:    '#4ab8ff',
  info:     '#60d080',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const EventCard: React.FC<EventCardProps> = ({
  title,
  subtitle,
  severity,
  time,
  location,
  onClick,
  selected = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const borderColor = SEVERITY_BORDER[severity] ?? '#4ab8ff';

  const bg = selected
    ? `${borderColor}10`
    : hovered && onClick
    ? 'rgba(255,255,255,0.04)'
    : '#111d2e';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '10px 12px',
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: bg,
        borderRadius: '0 5px 5px 0',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        outline: selected ? `1px solid ${borderColor}44` : 'none',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            color: '#d8eaf8',
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {title}
        </span>
        {time && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#6a90b8',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {time}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: '#6a90b8',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </span>
      )}

      {/* Location */}
      {location && (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            color: '#4a7090',
          }}
        >
          {location}
        </span>
      )}
    </div>
  );
};

export default EventCard;
