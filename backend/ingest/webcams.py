"""
Uses Ollama to suggest live webcam links for a given region.
Results are cached per region for 60 minutes.
"""
import json
import logging
import re
import time

import requests

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:latest"
CACHE_TTL = 60 * 60  # 60 minutes

_cache: dict[str, dict] = {}


def _ask_ollama(region: str) -> list[dict]:
    prompt = f"""List live webcam resources for the {region} area. For each one provide the website name, a direct URL you know exists, and a short description.

Include: DOT traffic cameras, city webcams, local news live streams, weather station cameras, EarthCam locations, YouTube live channels.

Return ONLY a JSON array, no prose, no markdown:
[
  {{
    "title": "name",
    "url": "https://...",
    "description": "one sentence"
  }}
]"""

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": False,
        "options": {"num_predict": 800},
    }
    resp = requests.post(OLLAMA_URL, json=payload, timeout=120)
    resp.raise_for_status()
    text = resp.json()["message"]["content"]
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Extract JSON array
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(text)


def fetch_webcams(region: str) -> list[dict]:
    """
    Ask Ollama to suggest live webcam links for the given region name.
    Results cached per region for 60 minutes.
    """
    now = time.time()
    cached = _cache.get(region)
    if cached and now - cached["at"] < CACHE_TTL:
        return cached["webcams"]

    try:
        webcams = _ask_ollama(region)
        normalized = [
            {
                "title": w.get("title", "Webcam"),
                "url": w.get("url", ""),
                "description": w.get("description", ""),
            }
            for w in webcams
            if isinstance(w, dict) and w.get("url", "").startswith("http")
        ]
        _cache[region] = {"webcams": normalized, "at": now}
        return normalized
    except Exception as e:
        logger.error(f"Ollama webcam search error: {e}")
        return _cache.get(region, {}).get("webcams", [])
