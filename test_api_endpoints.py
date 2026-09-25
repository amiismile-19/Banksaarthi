import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from database import SessionLocal
from schemas import (
    ValidationRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    FormCreate
)
from routers.validation import validate_form
from routers.auth import send_otp, verify_otp
from routers.forms import create_form, get_form
from routers.voice import get_voice_languages
from services.pdf_service import generate_pdf
from services.ocr_service import extract_text

db = SessionLocal()

print("==================================================")
print("       FASTAPI ROUTER & ENDPOINT VERIFICATION     ")
print("==================================================")

# 1. Supported Voice Languages
langs = get_voice_languages()
print(f"1. Voice Languages: {len(langs)} languages returned")
codes = [l["code"] for l in langs]
for required in ["en", "hi", "bn", "as", "mr", "gu", "ta", "te", "kn", "ml", "pa", "or", "mz", "auto"]:
    assert required in codes, f"Missing language code: {required}"
print("   -> All 14 voice languages registered properly in backend!")

# 2. Validation with Bengali Numerals
print("\n2. Testing Form Validation with Bengali digits...")
val_req = ValidationRequest(
    name="ৰমেশ কুমাৰ / Ramesh Kumar",
    mobile="৯৮৭৬৫৪৩২১০",
    dob="১৫/০৮/১৯৮৫",
    aadhaar="১২৩৪৫৬৭৮৯০১২"
)
val_res = validate_form(val_req)
print(f"   -> Valid: {val_res['valid']}, Errors: {val_res['errors']}")
assert val_res["valid"] is True

# 3. OTP Send & Verify with Indic Digits
print("\n3. Testing OTP Send & Verify with Indic digits...")
send_res = send_otp(SendOtpRequest(mobile="৯৮৭৬৫৪৩২১০", service="account"), db)
print(f"   -> OTP sent to mobile: {send_res['mobile']}, OTP: {send_res['otp']}")
assert send_res["mobile"] == "9876543210"

verify_res = verify_otp(VerifyOtpRequest(mobile="৯৮৭৬৫৪৩২১০", otp=send_res["otp"]), db)
print(f"   -> OTP verified: {verify_res['message']}, Token: {verify_res['access_token'][:25]}...")
assert verify_res["access_token"] is not None

# 4. Form Creation in Assamese / Bengali
print("\n4. Testing Form Creation in Assamese / Bengali...")
form_req = FormCreate(
    form_type="Account Opening",
    data={
        "name": "ৰমেশ কুমাৰ",
        "account_type": "সঞ্চয়ী একাউন্ট",
        "account_mode": "একক",
        "gender": "পুৰুষ",
        "mobile": "৯৮৭৬৫৪৩২১০",
        "amount": "৫০০০",
        "language": "as",
        "preferred_language": "Assamese"
    }
)
form_res = create_form(form_req, None, db)
print(f"   -> Form created: ID={form_res['form_id']}, Ref={form_res['reference_id']}, Status={form_res['status']}")
form_id = form_res["form_id"]

# Verify normalized data stored in database
stored_form = get_form(form_id, None, db)
print("   -> Stored Form Data:", stored_form["data"])
assert stored_form["data"]["mobile"] == "9876543210", "Mobile digits were not normalized"
assert stored_form["data"]["amount"] == "5000", "Amount digits were not normalized"

# 5. Multilingual PDF Generation
print(f"\n5. Testing Multilingual PDF for Form #{form_id}...")
pdf_path = generate_pdf(form_id, stored_form["form_type"], stored_form["data"])
print(f"   -> Generated PDF at: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
assert os.path.exists(pdf_path)

# 6. OCR Resilient Extraction
print("\n6. Testing OCR Resilient Extraction...")
test_file = "uploads/temp_ocr_test.jpg"
os.makedirs("uploads", exist_ok=True)
with open(test_file, "wb") as f:
    f.write(b"dummy image data")
ocr_text = extract_text(test_file)
if os.path.exists(test_file):
    os.remove(test_file)
print(f"   -> OCR Output:\n{ocr_text[:140]}...\n")
# 7. Voice Normalization Endpoint
print("\n7. Testing Voice Normalization endpoint...")
from routers.voice import normalize_text, NormalizeRequest
norm_bn = normalize_text(NormalizeRequest(text="সঞ্চয়ী একাউন্ট খুলতে চাই", language="bn"))
print(f"   -> Bengali: '{norm_bn['raw']}' -> '{norm_bn['normalized']}'")
assert norm_bn["normalized"] == "Savings"

norm_as = normalize_text(NormalizeRequest(text="মই সঞ্চয় একাউন্ট খুলিব বিচাৰোঁ", language="as"))
print(f"   -> Assamese: '{norm_as['raw']}' -> '{norm_as['normalized']}'")
assert norm_as["normalized"] == "Savings"

norm_num = normalize_text(NormalizeRequest(text="পাঁচ হাজাৰ টকা", language="as"))
print(f"   -> Assamese Numerals: '{norm_num['raw']}' -> '{norm_num['normalized']}'")
assert norm_num["normalized"] == "5000"

db.close()

print("==================================================")
print("     ALL BACKEND MULTILINGUAL TESTS PASSED!       ")
print("==================================================")
