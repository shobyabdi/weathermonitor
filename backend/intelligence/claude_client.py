import anthropic
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None

def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client

def analyze_storm(prompt: str) -> dict:
    """Call Claude and parse structured JSON response."""
    try:
        client = get_client()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text
        # Strip markdown code blocks if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude JSON response: {e}")
        return {
            "summary": "Analysis unavailable",
            "confidence": "low",
            "expected": [],
            "recommendation": "Monitor conditions closely",
            "threat_type": "other",
            "severity": "info",
            "affected_region": "Unknown"
        }
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise

def generate_brief(prompt: str) -> str:
    """Call Claude for the global weather brief (plain text)."""
    try:
        client = get_client()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Claude brief generation error: {e}")
        return "Weather brief temporarily unavailable. Please check individual data sources."

def classify_headline(headline: str) -> dict:
    """Classify a weather headline using Claude."""
    prompt = f'''Classify this weather headline. Return ONLY valid JSON:
{{
  "category": "tornado|hurricane|flood|fire|winter|heat|cold|severe|drought|earthquake|volcano|airquality|other",
  "severity": "critical|high|medium|low|info",
  "confidence": 0.0,
  "affectedRegion": "string or null",
  "estimatedImpact": "string, max 20 words"
}}
Headline: "{headline}"'''

    try:
        client = get_client()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {"category": "other", "severity": "info", "confidence": 0.0}
