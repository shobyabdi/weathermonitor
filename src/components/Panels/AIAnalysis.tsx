import React, { useState } from 'react';
import type { ClaudeInsight } from '../../types';

export interface AIAnalysisProps {
  insight: ClaudeInsight | null;
  loading?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function severityBorderColor(severity: ClaudeInsight['severity']): string {
  switch (severity) {
    case 'critical': return '#ff2020';
    case 'high':     return '#ff7b00';
    case 'medium':   return '#f5c518';
    case 'low':      return '#4ab8ff';
    default:         return '#60d080';
  }
}

function confidenceGlow(confidence: ClaudeInsight['confidence']): React.CSSProperties {
  switch (confidence) {
    case 'high':
      return { color: '#f5c518', textShadow: '0 0 8px rgba(255,200,0,0.4)', fontWeight: 700, fontSize: '14px' };
    case 'medium':
      return { color: '#ff7b00', textShadow: '0 0 8px rgba(255,120,0,0.4)', fontWeight: 700, fontSize: '14px' };
    case 'low':
      return { color: '#4ab8ff', textShadow: '0 0 8px rgba(60,160,255,0.3)', fontWeight: 700, fontSize: '14px' };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#ff2020';
  if (score >= 60) return '#ff7b00';
  if (score >= 40) return '#f5c518';
  return '#60d080';
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function minutesAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  return `${diff} min ago`;
}

// ── Skeleton ────────────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div style={{ padding: '2px 0' }}>
    {[92, 78, 100, 65, 85].map((w, i) => (
      <div
        key={i}
        className="skeleton"
        style={{
          height: '12px',
          width: `${w}%`,
          borderRadius: '4px',
          marginBottom: '8px',
        }}
      />
    ))}
  </div>
);

// ── Divider ─────────────────────────────────────────────────────────────────

const Divider: React.FC = () => (
  <div style={{ borderTop: '1px solid #1a3050', margin: '10px 0' }} />
);

// ── Main Component ───────────────────────────────────────────────────────────

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ insight, loading = false }) => {
  const [collapsed, setCollapsed] = useState(false);

  const showLoading = loading || insight === null;

  return (
    <div
      style={{
        background: '#0e1e30',
        borderLeft: '1px solid #1a3050',
        borderBottom: '1px solid #1a2d44',
        flexShrink: 0,
      }}
    >
      {/* ── Panel Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 8px',
          borderBottom: '1px solid #1a3050',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.06em',
              color: '#d0e8ff',
            }}
          >
            AI Weather Analysis
          </span>
          {/* Storm Score badge in header */}
          {insight && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 700,
                color: scoreColor(insight.storm_score),
                background: `${scoreColor(insight.storm_score)}18`,
                border: `1px solid ${scoreColor(insight.storm_score)}55`,
                borderRadius: '10px',
                padding: '1px 8px',
              }}
            >
              {insight.storm_score}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Claude badge */}
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '9px',
              background: 'rgba(96,208,128,0.12)',
              border: '1px solid rgba(96,208,128,0.35)',
              borderRadius: '10px',
              padding: '1px 7px',
              color: '#60d080',
              letterSpacing: '0.04em',
            }}
          >
            Claude
          </span>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '16px',
              color: '#6a90b8',
              lineHeight: 1,
              padding: '0 2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ≡
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div style={{ padding: '12px 14px' }}>
          {showLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* ── Storm Threat Update ── */}
              <div>
                <div
                  style={{
                    color: '#d0e8ff',
                    fontFamily: "'Chakra Petch', sans-serif",
                    fontWeight: 700,
                    fontSize: '15px',
                    marginBottom: '6px',
                  }}
                >
                  {insight!.threat_type}
                </div>
                <p
                  style={{
                    color: '#90afd0',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    fontFamily: "'IBM Plex Mono', monospace",
                    margin: 0,
                  }}
                >
                  {insight!.summary}
                </p>
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    color: '#5a7a9a',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {insight!.affected_region}
                </div>
              </div>

              <Divider />

              {/* ── Confidence ── */}
              <div style={{ fontSize: '13px', fontFamily: "'IBM Plex Mono', monospace" }}>
                <span style={{ color: '#8ab0cc' }}>Confidence: </span>
                <span style={confidenceGlow(insight!.confidence)}>
                  {insight!.confidence.charAt(0).toUpperCase() + insight!.confidence.slice(1)}
                </span>
              </div>

              <Divider />

              {/* ── Expected Impact ── */}
              {insight!.expected.length > 0 && (
                <>
                  <div
                    style={{
                      color: '#d0e8ff',
                      fontFamily: "'Chakra Petch', sans-serif",
                      fontWeight: 700,
                      fontSize: '14px',
                      marginBottom: '6px',
                    }}
                  >
                    Expected Impact:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '2px' }}>
                    {insight!.expected.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <span style={{ color: '#e03030', fontSize: '14px', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                        <span
                          style={{
                            color: '#90afd0',
                            fontSize: '13px',
                            lineHeight: 1.5,
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {insight!.recommendation && (
                <>
                  <Divider />
                  {/* ── Safety Advice ── */}
                  <div
                    style={{
                      color: '#d0e8ff',
                      fontFamily: "'Chakra Petch', sans-serif",
                      fontWeight: 700,
                      fontSize: '14px',
                      marginBottom: '6px',
                    }}
                  >
                    Safety Advice:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: '#e03030', fontSize: '14px', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                    <span
                      style={{
                        color: '#90afd0',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {insight!.recommendation}
                    </span>
                  </div>
                </>
              )}

              <Divider />

              {/* ── Storm Score ── */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '5px',
                  }}
                >
                  <span
                    style={{
                      color: '#8ab0cc',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                    }}
                  >
                    Storm Score
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: '14px',
                      color: scoreColor(insight!.storm_score),
                    }}
                  >
                    {insight!.storm_score}/100
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    background: '#0a1525',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${insight!.storm_score}%`,
                      background: 'linear-gradient(90deg, #60d080 0%, #f5c518 40%, #ff7b00 70%, #ff2020 100%)',
                      backgroundSize: '100px 100%',
                      backgroundPosition: `${insight!.storm_score}% 0`,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              <Divider />

              {/* ── Forecast Thumbnail ── */}
              <div>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: `
                      linear-gradient(
                        180deg,
                        #0d2140 0%,
                        #1a3a6a 20%,
                        #2a5090 35%,
                        #4a6080 55%,
                        #c07030 75%,
                        #e08020 90%,
                        #d06010 100%
                      )
                    `,
                  }}
                >
                  {/* Simulated cloud bands */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `
                        radial-gradient(ellipse 120% 40% at 30% 30%, rgba(255,255,255,0.06) 0%, transparent 70%),
                        radial-gradient(ellipse 80% 30% at 70% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)
                      `,
                    }}
                  />
                  {/* Severity overlay tint */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `${severityBorderColor(insight!.severity)}18`,
                    }}
                  />
                  {/* Severity label overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: `${severityBorderColor(insight!.severity)}cc`,
                      color: '#fff',
                      fontFamily: "'Chakra Petch', sans-serif",
                      fontWeight: 700,
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {insight!.severity.toUpperCase()}
                  </div>
                  {/* Storm score badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(10,15,26,0.75)',
                      color: scoreColor(insight!.storm_score),
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}
                  >
                    {insight!.storm_score}
                  </div>
                </div>
                {/* Caption */}
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    color: '#5a7a9a',
                    fontFamily: "'IBM Plex Mono', monospace",
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{insight!.affected_region} — Forecast Outlook</span>
                  <span>Updated {minutesAgo(insight!.generated_at)}</span>
                </div>
              </div>

              {/* ── Footer timestamp ── */}
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '10px',
                  color: '#4a6a8a',
                  fontFamily: "'JetBrains Mono', monospace",
                  textAlign: 'right',
                }}
              >
                Generated {formatTimestamp(insight!.generated_at)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
