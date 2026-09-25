import os
import uuid
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status

from pydantic import BaseModel

try:
    from services.voice_service import transcribe_audio, normalize_banking_term, convert_indic_numerals
except (ImportError, ValueError):
    from ..services.voice_service import transcribe_audio, normalize_banking_term, convert_indic_numerals

router = APIRouter(
    prefix="/voice",
    tags=["Voice"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

VOICE_LANGUAGES = [
    {"code": "en", "bcp47": "en-IN", "label": "English", "native": "English"},
    {"code": "hi", "bcp47": "hi-IN", "label": "Hindi", "native": "हिंदी"},
    {"code": "bn", "bcp47": "bn-IN", "label": "Bengali", "native": "বাংলা"},
    {"code": "as", "bcp47": "as-IN", "label": "Assamese", "native": "অসমীয়া"},
    {"code": "mr", "bcp47": "mr-IN", "label": "Marathi", "native": "मराठी"},
    {"code": "gu", "bcp47": "gu-IN", "label": "Gujarati", "native": "ગુજરાતી"},
    {"code": "ta", "bcp47": "ta-IN", "label": "Tamil", "native": "தமிழ்"},
    {"code": "te", "bcp47": "te-IN", "label": "Telugu", "native": "తెలుగు"},
    {"code": "kn", "bcp47": "kn-IN", "label": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "ml", "bcp47": "ml-IN", "label": "Malayalam", "native": "മലയാളം"},
    {"code": "pa", "bcp47": "pa-IN", "label": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    {"code": "or", "bcp47": "or-IN", "label": "Odia", "native": "ଓଡ଼ିଆ"},
    {"code": "mz", "bcp47": "en-IN", "label": "Mizo", "native": "Mizo ṭawng"},
    {"code": "auto", "bcp47": "en-IN", "label": "Auto-Detect", "native": "Auto / स्वतः"},
]


@router.get("/languages")
def get_voice_languages():
    """Retrieve list of supported voice languages."""
    return VOICE_LANGUAGES


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """Upload an audio recording and transcribe speech to text in the specified or detected language."""
    raw_content_type = (file.content_type or "").split(";")[0].strip().lower()
    
    # Allow any audio MIME type or octet-stream
    if raw_content_type and not (raw_content_type.startswith("audio/") or raw_content_type == "application/octet-stream" or "webm" in raw_content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format '{file.content_type}'. Supported: wav, mp3, webm, ogg, m4a"
        )

    extension = os.path.splitext(file.filename or "")[1] or ".wav"
    if "webm" in raw_content_type and not extension.endswith(".webm"):
        extension = ".webm"
    elif "ogg" in raw_content_type and not extension.endswith(".ogg"):
        extension = ".ogg"
    elif "mp4" in raw_content_type or "m4a" in raw_content_type:
        extension = ".m4a"

    filename = f"{uuid.uuid4()}{extension}"
    path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio recording was empty. Please speak clearly into your microphone."
        )

    with open(path, "wb") as f:
        f.write(contents)

    try:
        result = transcribe_audio(path, language=language)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

    return result


class NormalizeRequest(BaseModel):
    text: str
    language: Optional[str] = None


@router.post("/normalize")
def normalize_text(req: NormalizeRequest):
    """Normalize regional language text / numerals to standardized banking values."""
    converted = convert_indic_numerals(req.text)
    norm = normalize_banking_term(converted)
    return {
        "raw": req.text,
        "converted": converted,
        "normalized": norm or converted
    }

