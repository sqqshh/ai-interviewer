"""
POST /api/transcribe
Accepts audio file upload, returns transcript text.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from services.transcribe_service import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Validate file type
    allowed = ["audio/webm","audio/webm;codecs=opus", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg", "application/octet-stream"]
    if audio.content_type not in allowed:
        raise HTTPException(400, f"Unsupported audio format: {audio.content_type}")

    # Read audio bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) < 1000:
        raise HTTPException(400, "Audio too short or empty. Please speak clearly and try again.")

    if len(audio_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Audio file too large (max 10MB).")

    try:
        transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")

    return {
        "transcript": transcript,
        "length": len(transcript),
    }