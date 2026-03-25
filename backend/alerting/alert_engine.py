import logging
from typing import Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

STORM_SCORE_THRESHOLD = 60
ALERT_THRESHOLD = 70


@dataclass
class ClaudeInsight:
    summary: str
    confidence: str  # low|medium|high
    expected: list
    recommendation: str
    threat_type: str
    severity: str
    affected_region: str
    generated_at: str = ""
    storm_score: float = 0.0


def evaluate_alert(storm_score: float, claude_insight: ClaudeInsight) -> bool:
    """
    Trigger alert when:
    1. storm_score > ALERT_THRESHOLD
    2. AND claude_insight.confidence in ("medium", "high")
    """
    if storm_score < ALERT_THRESHOLD:
        return False
    if claude_insight.confidence == "low":
        return False
    return True


def build_alert_payload(
    location: str,
    storm_score: float,
    insight: ClaudeInsight,
) -> dict:
    """Build alert payload for dispatch."""
    return {
        "location": location,
        "summary": insight.summary,
        "expected": insight.expected,
        "risk_level": insight.severity,
        "recommendation": insight.recommendation,
        "storm_score": storm_score,
        "confidence": insight.confidence,
        "threat_type": insight.threat_type,
        "affected_region": insight.affected_region,
        "generated_at": insight.generated_at,
    }
