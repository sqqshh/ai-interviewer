from fastapi import APIRouter, UploadFile, File, HTTPException
from services.transcribe_service import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Don't validate content-type — browsers report it inconsistently
    # Just check we got bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) < 500:
        raise HTTPException(400, "Audio too short or empty. Please speak clearly and try again.")

    if len(audio_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Audio file too large (max 10MB).")

    try:
        transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "recording.wav")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")

    return {
        "transcript": transcript,
        "length": len(transcript),
    }