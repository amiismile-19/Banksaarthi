import re
from fastapi import APIRouter

try:
    from schemas import ValidationRequest, ValidationResponse
    from services.voice_service import convert_indic_numerals
except (ImportError, ValueError):
    from ..schemas import ValidationRequest, ValidationResponse
    from ..services.voice_service import convert_indic_numerals

router = APIRouter(
    prefix="/validation",
    tags=["Validation"]
)


@router.post(
    "/validate",
    response_model=ValidationResponse
)
def validate_form(
    data: ValidationRequest
):
    errors = []

    # Name validation
    if not data.name or not data.name.strip():
        errors.append("Name is required")
    elif len(data.name.strip()) < 2:
        errors.append("Name must be at least 2 characters long")

    # Mobile validation (Indian 10-digit format starting with 6-9, supports Indic numerals)
    raw_mobile = convert_indic_numerals(data.mobile or "")
    clean_mobile = raw_mobile.strip().replace(" ", "").replace("-", "")
    if clean_mobile.startswith("+91"):
        clean_mobile = clean_mobile[3:]
    elif clean_mobile.startswith("0"):
        clean_mobile = clean_mobile[1:]

    if not re.fullmatch(r"[6-9]\d{9}", clean_mobile):
        errors.append("Invalid Indian mobile number (must be 10 digits starting with 6-9)")

    # DOB validation (DD/MM/YYYY, supports Indic numerals)
    clean_dob = convert_indic_numerals(data.dob or "").strip()
    if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", clean_dob):
        errors.append("DOB must be in DD/MM/YYYY format")

    # Aadhaar validation (12 digits if provided, supports Indic numerals)
    if data.aadhaar and data.aadhaar.strip():
        clean_aadhaar = convert_indic_numerals(data.aadhaar).strip().replace(" ", "").replace("-", "")
        if not re.fullmatch(r"\d{12}", clean_aadhaar):
            errors.append("Aadhaar must contain exactly 12 digits")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }

