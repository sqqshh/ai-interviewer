"""
Thin wrapper around the Groq REST API.
Model: llama-3.3-70b-versatile  (~14,400 free requests/day)
"""

import os
import json
import httpx
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"


def _get_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise ValueError("GROQ_API_KEY not set in .env file")
    return key


async def chat(
    messages: List[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    response_format: Optional[dict] = None,
) -> str:
    """Send messages to Groq, return reply as plain string."""
    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def chat_json(
    messages: List[dict],
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> dict:
    """Like chat() but forces JSON mode and parses the result into a dict."""
    raw = await chat(
        messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw output: {raw}")