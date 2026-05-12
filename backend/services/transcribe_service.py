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


async def transcribe_audio(audio_bytes: bytes, filename: str = "recording.wav") -> str:
    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
    }

    # Try sending as mp4 first (most compatible with Groq Whisper)
    # Use a clean filename with no codec info in it
    files = {
        "file": ("audio.mp4", audio_bytes, "audio/mp4"),
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

        # If mp4 didn't work, retry as webm
        if resp.status_code == 400:
            files["file"] = ("audio.webm", audio_bytes, "audio/webm")
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
            raise ValueError("Empty transcript — please speak clearly and try again.")

        return transcript