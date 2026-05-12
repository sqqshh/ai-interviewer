"""
transcribe_service.py
Sends audio file to Groq's Whisper API for speech-to-text.
Groq gives free Whisper transcription on the same API key.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


def _get_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise ValueError("GROQ_API_KEY not set in .env file")
    return key


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Send raw audio bytes to Groq Whisper and return transcript text.
    Supports webm, mp4, wav, mp3 — browser MediaRecorder outputs webm by default.
    """
    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
    }

    files = {
        "file": (filename, audio_bytes, "audio/webm"),
        "model": (None, "whisper-large-v3"),
        "response_format": (None, "json"),
        "language": (None, "en"),
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GROQ_TRANSCRIPTION_URL,
            headers=headers,
            files=files,
        )

        if resp.status_code != 200:
            raise ValueError(f"Whisper API error {resp.status_code}: {resp.text}")

        data = resp.json()
        transcript = data.get("text", "").strip()

        if not transcript:
            raise ValueError("Empty transcript returned")

        return transcript