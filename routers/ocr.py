import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, status

try:
    from services.ocr_service import extract_text
except (ImportError, ValueError):
    from ..services.ocr_service import extract_text

router = APIRouter(
    prefix="/ocr",
    tags=["OCR"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):
    """Upload an ID or banking document image and extract its text."""
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/octet-stream"  # sometimes sent by generic clients
    }

    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG and PNG images are supported for OCR"
        )

    extension = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{extension}"
    path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    try:
        text = extract_text(path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )

    return {
        "filename": filename,
        "text": text
    }
