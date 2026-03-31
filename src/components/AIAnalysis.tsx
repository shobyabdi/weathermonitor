import React, { useState, useCallback } from 'react';
import type { ClaudeInsight } from '../types';

interface AIAnalysisProps {
  insight: ClaudeInsight | null;
  onRefresh: () => void;
}

function severityBorderColor(severity: ClaudeInsight['severity']): string {
  switch (severity) {
    case 'critical': return 'var(--accent-critical)';
    case 'high':     return 'var(--accent-high)';
    case 'medium':   return 'var(--accent-medium)';
    case 'low':      return 'var(--accent-low)';
    default:         return 'var(--accent-info)';
  }
}

function confidenceBadgeColor(confidence: ClaudeInsight['confidence']): string {
  switch (confidence) {
    case 'high':   return 'var(--accent-info)';
    case 'medium': return 'var(--accent-medium)';
    default:       return 'var(--text-secondary)';
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--accent-critical)';
  if (score >= 60) return 'var(--accent-high)';
  if (score >= 40) return 'var(--accent-medium)';
  return 'var(--accent-info)';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  title: {
    fontFamily: 'var(--font-header)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  refreshBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: '10px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '2px 8px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    letterSpacing: '0.04em',
  },
  skeletonLine: {
    height: '12px',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '20px 0',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontStyle: 'italic' as const,
  },
  insightCard: {
    background: 'var(--bg-card)',
    borderRadius: '6px',
    padding: '10px 12px',
    borderLeft: '3px solid',
    animation: 'fadeIn 0.3s ease',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  threatType: {
    fontFamily: 'var(--font-header)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  scoreBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '3px',
  },
  scoreValue: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '20px',
    fontWeight: 700,
    lineHeight: 1,
  },
  scoreLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '9px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  region: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  summary: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    marginBottom: '8px',
  },
  expectedHeader: {
    fontFamily: 'var(--font-header)',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  expectedList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 8px 0',
  },
  expectedItem: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    padding: '2px 0',
    paddingLeft: '12px',
    position: 'relative' as const,
    lineHeight: 1.4,
  },
  recommendation: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '4px',
    padding: '6px 8px',
    lineHeight: 1.5,
    marginBottom: '8px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidencePill: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border)',
  },
  timestamp: {
    fontFamily: 'var(--font-numeric)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
  },
};

const LoadingSkeleton: React.FC = () => (
  <div>
    {[80, 100, 60, 90].map((w, i) => (
      <div
        key={i}
        className="skeleton"
        style={{ ...styles.skeletonLine, width: `${w}%` }}
      />
    ))}
  </div>
);

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ insight, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <div style={styles.container}>
      <div style={styles.panelHeader}>
        <div style={styles.title}>
          <span>&#x1F9E0;</span> AI Analysis
        </div>
        <button
          style={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh AI analysis"
        >
          {refreshing ? '...' : '↻ Refresh'}
        </button>
      </div>

      {insight === null ? (
        <LoadingSkeleton />
      ) : (
        <div
          style={{
            ...styles.insightCard,
            borderLeftColor: severityBorderColor(insight.severity),
          }}
        >
          <div style={styles.scoreRow}>
            <span
              style={{
                ...styles.threatType,
                color: severityBorderColor(insight.severity),
              }}
            >
              {insight.threat_type}
            </span>
            <div style={styles.scoreBlock}>
              <span style={{ ...styles.scoreValue, color: scoreColor(insight.storm_score) }}>
                {insight.storm_score}
              </span>
              <span style={styles.scoreLabel}>/ 100</span>
            </div>
          </div>

          <div style={styles.region}>
            {insight.affected_region}
          </div>

          <p style={styles.summary}>{insight.summary}</p>

          {insight.expected.length > 0 && (
            <>
              <div style={styles.expectedHeader}>Expected</div>
              <ul style={styles.expectedList}>
                {insight.expected.map((item, i) => (
                  <li key={i} style={styles.expectedItem}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--accent-low)' }}>&#x2023;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {insight.recommendation && (
            <div style={styles.recommendation}>
              <span style={{ color: 'var(--accent-medium)', marginRight: 4 }}>&#x26A0;</span>
              {insight.recommendation}
            </div>
          )}

          <div style={styles.footer}>
            <span
              style={{
                ...styles.confidencePill,
                color: confidenceBadgeColor(insight.confidence),
              }}
            >
              {insight.confidence.toUpperCase()} CONFIDENCE
            </span>
            <span style={styles.timestamp}>
              {new Date(insight.generated_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
