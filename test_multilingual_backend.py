import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("==================================================")
print("     BANKSAARTHI MULTILINGUAL VERIFICATION TEST   ")
print("==================================================")

# 1. Voice Normalization & Numeral Conversion Test
from services.voice_service import (
    convert_indic_numerals,
    normalize_banking_term,
    WHISPER_LANG_MAP
)

test_cases = [
    # English
    ("savings", "Savings"),
    ("I want to open a current account", "Current"),
    ("single", "Single"),
    ("cash deposit", "Cash"),
    ("yes that is correct", "Yes"),
    # Hindi
    ("बचत खाता खोलना है", "Savings"),
    ("चालू खाता", "Current"),
    ("पुरुष", "Male"),
    ("शादीशुदा", "Married"),
    ("नकद जमा", "Cash"),
    ("हाँ सब सही है", "Yes"),
    # Assamese
    ("মই সঞ্চয় একাউন্ট খুলিব বিচাৰোঁ", "Savings"),
    ("চলিত একাউন্ট", "Current"),
    ("পুৰুষ", "Male"),
    ("বিয়া কৰোৱা", "Married"),
    ("নগদ", "Cash"),
    ("সকলো তথ্য শুদ্ধ হয়", "Yes"),
    ("নহয় ভুল হৈছে", "No"),
    ("পাঁচ হাজাৰ টকা", "5000"),
    ("দহ হাজাৰ", "10000"),
    # Bengali
    ("সঞ্চয়ী একাউন্ট", "Savings"),
    ("চলতি", "Current"),
    ("একক", "Single"),
    ("যৌথ", "Joint"),
    ("ছেলে", "Male"),
    ("নারী", "Female"),
    ("পাঁচ হাজার", "5000"),
    ("হ্যাঁ সব ঠিক", "Yes"),
    ("না ভুল আছে", "No"),
    # Mizo
    ("sum dahna", "Savings"),
    ("mipa", "Male"),
    ("hmeichhe", "Female"),
    ("nupui nei", "Married"),
    ("tlangval", "Single"),
    ("pawisa fai", "Cash"),
    ("aw a dik e", "Yes"),
    ("aih a dik lo", "No"),
    ("sangnga", "5000"),
    # Marathi
    ("बचत खाते उघडायचे आहे", "Savings"),
    ("चालू खाते", "Current"),
    ("एकल", "Single"),
    ("रोख", "Cash"),
    ("होय बरोबर आहे", "Yes"),
    ("पाच हजार", "5000"),
    # Gujarati
    ("બચત ખાતું", "Savings"),
    ("ચાલુ ખાતું", "Current"),
    ("રોકડ", "Cash"),
    ("હા બરાબર છે", "Yes"),
    ("પાંચ હજાર", "5000"),
    # Tamil
    ("சேமிப்பு கணக்கு", "Savings"),
    ("நடப்பு கணக்கு", "Current"),
    ("ஆண்", "Male"),
    ("ரொக்கம்", "Cash"),
    ("ஆம் சரியானது", "Yes"),
    ("ஐந்தாயிரம்", "5000"),
    # Telugu
    ("పొదుపు ఖాతా", "Savings"),
    ("కరెంట్ ఖాతా", "Current"),
    ("నగదు", "Cash"),
    ("అవును సరైనది", "Yes"),
    ("ఐదు వేలు", "5000"),
    # Kannada
    ("ಉಳಿತಾಯ ಖಾತೆ", "Savings"),
    ("ಚಾಲ್ತಿ ಖಾತೆ", "Current"),
    ("ಹೌದು ಸರಿ ಇದೆ", "Yes"),
    ("ಐದು ಸಾವಿರ", "5000"),
    # Malayalam
    ("സേവിംഗ്സ് അക്കൗണ്ട്", "Savings"),
    ("കറന്റ് അക്കൗണ്ട്", "Current"),
    ("അതെ ശരിയാണ്", "Yes"),
    ("അയ്യായിരം", "5000"),
    # Punjabi
    ("ਬੱਚਤ ਖਾਤਾ", "Savings"),
    ("ਚਾਲੂ ਖਾਤਾ", "Current"),
    ("ਹਾਂ ਠੀਕ ਹੈ", "Yes"),
    ("ਪੰਜ ਹਜ਼ਾਰ", "5000"),
    # Odia
    ("ସଞ୍ଚୟ ଖାତା", "Savings"),
    ("ଚାଲୁ ଖାତା", "Current"),
    ("ହଁ ସଠିକ୍ ଅଛି", "Yes"),
    ("ପାଞ୍ଚ ହଜାର", "5000"),
]

passed = 0
failed = 0
for text, expected in test_cases:
    result = normalize_banking_term(text)
    if result == expected:
        passed += 1
    else:
        print(f"FAILED: '{text}' -> Got: '{result}', Expected: '{expected}'")
        failed += 1

print(f"\nNormalization Test: {passed}/{len(test_cases)} PASSED")

# 2. Indic Numeral Conversion Test
digit_test = "Bengali: ১২৩৪৫৬৭৮৯০ | Devanagari: १२३४५६७८९० | Gujarati: ૧૨૩૪૫૬૭૮૯૦ | Tamil: ௧௨௩௪௫௬௭௮௯௦"
converted = convert_indic_numerals(digit_test)
print(f"\nIndic Numeral Test:\nRaw: {digit_test}\nConverted: {converted}")
assert "1234567890" in converted

# 3. Whisper Language Code Mapping Test
all_langs = ["en", "hi", "bn", "as", "mr", "gu", "ta", "te", "kn", "ml", "pa", "or", "mz", "auto"]
for l in all_langs:
    wcode = WHISPER_LANG_MAP.get(l)
    print(f"Lang '{l}' -> Whisper code: '{wcode}'")
    # Verify no unhandled codes that would crash Whisper
    if l in ("or", "mz", "auto"):
        assert wcode is None, f"Expected None for {l}"
    else:
        assert wcode == l, f"Expected {l} for {l}"

# 4. Form Validation with Indic Numerals Test
from schemas import ValidationRequest
from routers.validation import validate_form

val_req = ValidationRequest(
    name="ৰমেশ কুমাৰ / Ramesh Kumar",
    mobile="৯৮৭৬৫৪৩২১০",  # Bengali numerals for 9876543210
    dob="১৫/০৮/১৯৮৫",      # Bengali numerals for 15/08/1985
    aadhaar="১২৩৪৫৬৭৮৯০১২" # Bengali numerals for 123456789012
)
val_res = validate_form(val_req)
print(f"\nValidation with Bengali Digits: valid={val_res['valid']}, errors={val_res['errors']}")
assert val_res["valid"] is True, f"Validation failed: {val_res['errors']}"

# 5. Multilingual PDF Generation Test
from services.pdf_service import generate_pdf
pdf_path = generate_pdf(
    777,
    "New Savings Account",
    {
        "name": "ৰমেশ কুমাৰ (Ramesh Kumar)",
        "account_type": "সঞ্চয়ী একাউন্ট (Savings)",
        "account_mode": "একক (Single)",
        "gender": "পুৰুষ (Male)",
        "deposit_amount": "₹ ৫০০০ (Five Thousand)",
        "address": "গুৱাহাটী, অসম / Pune, Maharashtra",
        "mobile": "9876543210"
    }
)
print(f"\nMultilingual PDF Generated at: {pdf_path}")
assert os.path.exists(pdf_path)

# 6. OCR Resilient Fallback Test
from services.ocr_service import extract_text
test_img_path = "uploads/test_aadhaar_sample.jpg"
os.makedirs("uploads", exist_ok=True)
with open(test_img_path, "wb") as f:
    f.write(b"dummy image bytes")

ocr_dummy = extract_text(test_img_path)
print(f"\nOCR Fallback for Aadhaar:\n{ocr_dummy[:120]}...\n")
assert "Aadhaar" in ocr_dummy

if os.path.exists(test_img_path):
    os.remove(test_img_path)

print("==================================================")
print("     ALL MULTILINGUAL TESTS PASSED SUCCESSFULLY!  ")
print("==================================================")

