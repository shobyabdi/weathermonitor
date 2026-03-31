import json
import logging
import re
import requests

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:latest"


def _chat(prompt: str, max_tokens: int = 1000) -> str:
    """Send a prompt to Ollama and return the response text."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": False,  # disable qwen3 extended thinking for fast, direct output
        "options": {"num_predict": max_tokens},
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    text = response.json()["message"]["content"]
    # Strip any residual <think>...</think> blocks just in case
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    return text


def _extract_json(text: str) -> dict:
    """Extract the first JSON object from a response string."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).rstrip("`").strip()
    # Find the first {...} block in case there's surrounding prose
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    return json.loads(text)


def analyze_storm(prompt: str) -> dict:
    """Call Ollama and parse structured JSON response."""
    try:
        text = _chat(prompt, max_tokens=1000)
        return _extract_json(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Ollama JSON response: {e}")
        return {
            "summary": "Analysis unavailable",
            "confidence": "low",
            "expected": [],
            "recommendation": "Monitor conditions closely",
            "threat_type": "other",
            "severity": "info",
            "affected_region": "Unknown",
        }
    except Exception as e:
        logger.error(f"Ollama API error: {e}")
        raise


def classify_headline(headline: str) -> dict:
    """Classify a weather headline using Ollama."""
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
        text = _chat(prompt, max_tokens=200)
        return _extract_json(text)
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {"category": "other", "severity": "info", "confidence": 0.0}
