/**
 * RadarPlayer.tsx
 * Full radar timeline scrubber component.
 * Renders at the bottom of the map with a gradient bar, draggable thumb,
 * PAST / FORECAST navigation buttons, and a dBZ intensity legend.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RadarFrame } from '@/types';

interface RadarPlayerProps {
  frames: RadarFrame[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  host: string;
}

function formatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const DBZ_LEGEND = [
  { label: '<20', color: '#00e060' },
  { label: '20', color: '#40d060' },
  { label: '30', color: '#e0e000' },
  { label: '40', color: '#ff8000' },
  { label: '50', color: '#ff2020' },
  { label: '65+', color: '#ff00ff' },
];

export const RadarPlayer: React.FC<RadarPlayerProps> = ({
  frames,
  currentIndex,
  onIndexChange,
  host: _host,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(currentIndex);

  const totalFrames = frames.length;
  const clampedIndex = Math.max(0, Math.min(currentIndex, totalFrames - 1));

  // Keep ref in sync so the playback interval can read the latest index
  useEffect(() => {
    currentIndexRef.current = clampedIndex;
  }, [clampedIndex]);

  // ── playback ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    playIntervalRef.current = setInterval(() => {
      const next = currentIndexRef.current + 1;
      if (next >= totalFrames) {
        setIsPlaying(false);
        onIndexChange(totalFrames - 1);
      } else {
        onIndexChange(next);
      }
    }, 300);
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalFrames, onIndexChange]);

  // ── drag helpers ──────────────────────────────────────────────────────────
  const posToIndex = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || totalFrames === 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * (totalFrames - 1));
    },
    [totalFrames],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onIndexChange(posToIndex(e.clientX));
    },
    [onIndexChange, posToIndex],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setTooltipX(ratio * rect.width);
      setHoverIndex(posToIndex(e.clientX));
      if (dragging) {
        onIndexChange(posToIndex(e.clientX));
      }
    },
    [dragging, onIndexChange, posToIndex],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(true);
      onIndexChange(posToIndex(e.clientX));
    },
    [onIndexChange, posToIndex],
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleMouseLeave = useCallback(() => {
    setDragging(false);
    setHoverIndex(null);
  }, []);

  // ── touch support ─────────────────────────────────────────────────────────
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!trackRef.current || e.touches.length === 0) return;
      onIndexChange(posToIndex(e.touches[0].clientX));
    },
    [onIndexChange, posToIndex],
  );

  if (totalFrames === 0) return null;

  const thumbPercent = totalFrames > 1 ? (clampedIndex / (totalFrames - 1)) * 100 : 0;
  const currentFrame = frames[clampedIndex];
  const hoverFrame = hoverIndex !== null ? frames[hoverIndex] : null;

  return (
    <div style={styles.wrapper}>
      {/* ── top row: label + timestamp + controls ── */}
      <div style={styles.topRow}>
        <span style={styles.radarLabel}>RADAR</span>
        <span style={styles.timestamp}>
          {currentFrame ? formatDateTime(currentFrame.time) : '--'}
        </span>
        <div style={styles.controls}>
          <button
            style={styles.ctrlBtn}
            onClick={() => onIndexChange(Math.max(0, clampedIndex - 1))}
            title="Previous frame"
          >
            &#9664;
          </button>
          <button
            style={styles.ctrlBtn}
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (clampedIndex >= totalFrames - 1) onIndexChange(0);
                setIsPlaying(true);
              }
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            style={styles.ctrlBtn}
            onClick={() => onIndexChange(Math.min(totalFrames - 1, clampedIndex + 1))}
            title="Next frame"
          >
            &#9654;
          </button>
        </div>
      </div>

      {/* ── track area ── */}
      <div style={styles.trackArea}>
        {/* PAST label */}
        <button
          style={styles.sideBtn}
          onClick={() => onIndexChange(0)}
          title="Go to oldest frame"
        >
          &#9664; PAST
        </button>

        {/* Main gradient track */}
        <div
          ref={trackRef}
          style={styles.track}
          onClick={handleTrackClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={totalFrames - 1}
          aria-valuenow={clampedIndex}
          aria-label="Radar timeline"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onIndexChange(Math.max(0, clampedIndex - 1));
            if (e.key === 'ArrowRight') onIndexChange(Math.min(totalFrames - 1, clampedIndex + 1));
          }}
        >
          {/* Gradient fill bar */}
          <div style={styles.gradientBar} />

          {/* Tick marks */}
          {frames.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.tick,
                left: `${totalFrames > 1 ? (i / (totalFrames - 1)) * 100 : 0}%`,
                opacity: i === clampedIndex ? 0 : 0.35,
              }}
            />
          ))}

          {/* Progress overlay */}
          <div
            style={{
              ...styles.progressOverlay,
              width: `${thumbPercent}%`,
            }}
          />

          {/* Draggable thumb */}
          <div
            style={{
              ...styles.thumb,
              left: `${thumbPercent}%`,
              cursor: dragging ? 'grabbing' : 'grab',
            }}
          >
            ●
          </div>

          {/* Hover tooltip */}
          {hoverFrame && hoverIndex !== null && (
            <div
              style={{
                ...styles.tooltip,
                left: `${tooltipX}px`,
              }}
            >
              {formatTime(hoverFrame.time)}
            </div>
          )}
        </div>

        {/* FORECAST label */}
        <button
          style={styles.sideBtn}
          onClick={() => onIndexChange(totalFrames - 1)}
          title="Go to latest / forecast frame"
        >
          FORECAST &#9654;
        </button>
      </div>

      {/* ── dBZ intensity scale ── */}
      <div style={styles.legendRow}>
        <span style={styles.legendTitle}>dBZ:</span>
        {DBZ_LEGEND.map((entry) => (
          <div key={entry.label} style={styles.legendItem}>
            <div style={{ ...styles.legendSwatch, background: entry.color }} />
            <span style={styles.legendLabel}>{entry.label}</span>
          </div>
        ))}
        <span style={styles.frameCounter}>
          {clampedIndex + 1} / {totalFrames}
        </span>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(10, 15, 26, 0.97)',
    borderTop: '1px solid #1a2d44',
    padding: '6px 10px 4px',
    zIndex: 20,
    userSelect: 'none',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  radarLabel: {
    fontFamily: 'var(--font-header)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--radar-light)',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  timestamp: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 11,
    color: 'var(--text-primary)',
    flex: 1,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  ctrlBtn: {
    background: 'rgba(26, 45, 68, 0.9)',
    border: '1px solid #1a2d44',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontSize: 11,
    padding: '2px 8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.4,
  },
  trackArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sideBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    flexShrink: 0,
    padding: '2px 4px',
    whiteSpace: 'nowrap',
  },
  track: {
    flex: 1,
    height: 28,
    position: 'relative',
    borderRadius: 4,
    overflow: 'visible',
    cursor: 'pointer',
  },
  gradientBar: {
    position: 'absolute',
    inset: '6px 0',
    borderRadius: 4,
    background: [
      'linear-gradient(to right,',
      '  #00aa44 0%,',      // past start — green (light precip)
      '  #88cc00 15%,',
      '  #e0e000 30%,',     // yellow (moderate)
      '  #ff8000 48%,',     // orange (heavy)
      '  #ff2020 60%,',     // red (intense)
      '  #cc00cc 72%,',     // magenta (extreme/hail) — end of past
      '  #0044ff 80%,',     // blue — nowcast / forecast start
      '  #8800cc 100%',     // purple — far forecast
      ')',
    ].join(''),
    opacity: 0.7,
  },
  progressOverlay: {
    position: 'absolute',
    top: '6px',
    left: 0,
    height: 16,
    background: 'rgba(74, 184, 255, 0.18)',
    borderRadius: '4px 0 0 4px',
    pointerEvents: 'none',
  },
  tick: {
    position: 'absolute',
    top: '50%',
    transform: 'translateX(-50%) translateY(-50%)',
    width: 1,
    height: 10,
    background: 'rgba(255,255,255,0.5)',
    pointerEvents: 'none',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    transform: 'translateX(-50%) translateY(-50%)',
    fontSize: 16,
    color: '#ffffff',
    textShadow: '0 0 6px rgba(74,184,255,0.9)',
    pointerEvents: 'none',
    zIndex: 5,
    lineHeight: 1,
  },
  tooltip: {
    position: 'absolute',
    top: -22,
    transform: 'translateX(-50%)',
    background: 'rgba(10,15,26,0.95)',
    border: '1px solid #1a2d44',
    borderRadius: 4,
    padding: '2px 6px',
    fontFamily: 'var(--font-numeric)',
    fontSize: 10,
    color: '#fff',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 10,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  legendTitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 9,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  legendSwatch: {
    width: 10,
    height: 8,
    borderRadius: 2,
    flexShrink: 0,
  },
  legendLabel: {
    fontFamily: 'var(--font-numeric)',
    fontSize: 9,
    color: 'var(--text-secondary)',
  },
  frameCounter: {
    marginLeft: 'auto',
    fontFamily: 'var(--font-numeric)',
    fontSize: 9,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
};

export default RadarPlayer;
