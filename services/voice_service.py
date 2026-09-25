import os
import re
import sys
import shutil
from typing import Any, Dict, Optional

_model = None

# Mapping user/frontend language codes to Whisper model supported codes.
# Languages not officially trained in Whisper base (e.g. Odia 'or', Mizo 'mz')
# are mapped to None so Whisper auto-detects safely without crashing.
WHISPER_LANG_MAP = {
    "en": "en",
    "en-in": "en",
    "en-us": "en",
    "english": "en",
    "hi": "hi",
    "hi-in": "hi",
    "hindi": "hi",
    "bn": "bn",
    "bn-in": "bn",
    "bengali": "bn",
    "as": "as",
    "as-in": "as",
    "assamese": "as",
    "mr": "mr",
    "mr-in": "mr",
    "marathi": "mr",
    "gu": "gu",
    "gu-in": "gu",
    "gujarati": "gu",
    "ta": "ta",
    "ta-in": "ta",
    "tamil": "ta",
    "te": "te",
    "te-in": "te",
    "telugu": "te",
    "kn": "kn",
    "kn-in": "kn",
    "kannada": "kn",
    "ml": "ml",
    "ml-in": "ml",
    "malayalam": "ml",
    "pa": "pa",
    "pa-in": "pa",
    "punjabi": "pa",
    "ur": "ur",
    "ur-in": "ur",
    "urdu": "ur",
    "ne": "ne",
    "nepali": "ne",
    "sa": "sa",
    "sanskrit": "sa",
    # Odia and Mizo mapped to None to enable auto-detection without ValueError
    "or": None,
    "or-in": None,
    "odia": None,
    "oriya": None,
    "mz": None,
    "mz-in": None,
    "mizo": None,
    "auto": None,
}

INDIC_DIGITS_MAP = {
    # Devanagari (Hindi, Marathi, Sanskrit, Nepali)
    '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096a': '4',
    '\u096b': '5', '\u096c': '6', '\u096d': '7', '\u096e': '8', '\u096f': '9',
    # Bengali / Assamese
    '\u09e6': '0', '\u09e7': '1', '\u09e8': '2', '\u09e9': '3', '\u09ea': '4',
    '\u09eb': '5', '\u09ec': '6', '\u09ed': '7', '\u09ee': '8', '\u09ef': '9',
    # Gurmukhi (Punjabi)
    '\u0a66': '0', '\u0a67': '1', '\u0a68': '2', '\u0a69': '3', '\u0a6a': '4',
    '\u0a6b': '5', '\u0a6c': '6', '\u0a6d': '7', '\u0a6e': '8', '\u0a6f': '9',
    # Gujarati
    '\u0ae6': '0', '\u0ae7': '1', '\u0ae8': '2', '\u0ae9': '3', '\u0aea': '4',
    '\u0aeb': '5', '\u0aec': '6', '\u0aed': '7', '\u0aee': '8', '\u0aef': '9',
    # Odia
    '\u0b66': '0', '\u0b67': '1', '\u0b68': '2', '\u0b69': '3', '\u0b6a': '4',
    '\u0b6b': '5', '\u0b6c': '6', '\u0b6d': '7', '\u0b6e': '8', '\u0b6f': '9',
    # Tamil
    '\u0be6': '0', '\u0be7': '1', '\u0be8': '2', '\u0be9': '3', '\u0bea': '4',
    '\u0beb': '5', '\u0bec': '6', '\u0bed': '7', '\u0bee': '8', '\u0bef': '9',
    # Telugu
    '\u0c66': '0', '\u0c67': '1', '\u0c68': '2', '\u0c69': '3', '\u0c6a': '4',
    '\u0c6b': '5', '\u0c6c': '6', '\u0c6d': '7', '\u0c6e': '8', '\u0c6f': '9',
    # Kannada
    '\u0ce6': '0', '\u0ce7': '1', '\u0ce8': '2', '\u0ce9': '3', '\u0cea': '4',
    '\u0ceb': '5', '\u0cec': '6', '\u0ced': '7', '\u0cee': '8', '\u0cef': '9',
    # Malayalam
    '\u0d66': '0', '\u0d67': '1', '\u0d68': '2', '\u0d69': '3', '\u0d6a': '4',
    '\u0d6b': '5', '\u0d6c': '6', '\u0d6d': '7', '\u0d6e': '8', '\u0d6f': '9',
}


def convert_indic_numerals(text: str) -> str:
    """Convert any Indian regional script numerals to standard ASCII 0-9 digits."""
    if not text:
        return text
    return "".join(INDIC_DIGITS_MAP.get(ch, ch) for ch in text)


# Spoken regional number expressions to digits
SPOKEN_NUMBERS_MAP = {
    # Bengali / Assamese
    "এক হাজার": "1000", "এক হাজাৰ": "1000", "এক হাজাৰ টকা": "1000",
    "দুই হাজার": "2000", "দুহেজাৰ": "2000", "দুই হাজাৰ": "2000",
    "পাঁচ হাজার": "5000", "পাঁচ হাজাৰ": "5000", "পাঁচ হাজাৰ টকা": "5000",
    "দশ হাজার": "10000", "দহ হাজাৰ": "10000", "দহ হাজাৰ টকা": "10000",
    "বিশ হাজার": "20000", "বিংশ হাজাৰ": "20000", "কুৰি হাজাৰ": "20000",
    "পঁচিশ হাজার": "25000", "পঁচিশ হাজাৰ": "25000",
    "পঞ্চাশ হাজার": "50000", "পঞ্চাশ হাজাৰ": "50000",
    "এক লাখ": "100000", "এক লাখ টকা": "100000",
    "পাঁচশত": "500", "পাঁচশ": "500", "পাঁচশ টকা": "500",
    # Hindi / Marathi / Gujarati
    "एक हजार": "1000", "एक हजार रुपये": "1000", "એક હજાર": "1000",
    "दो हजार": "2000", "दोन हजार": "2000", "બે હજાર": "2000",
    "पांच हजार": "5000", "पाच हजार": "5000", "પાંચ હજાર": "5000",
    "दस हजार": "10000", "दहा हजार": "10000", "દસ હજાર": "10000",
    "बीस हजार": "20000", "वीस हजार": "20000", "વીસ હજાર": "20000",
    "पच्चीस हजार": "25000", "पंचवीस हजार": "25000", "પચ્ચીસ હજાર": "25000",
    "पचास हजार": "50000", "पन्नास हजार": "50000", "પચાસ હજાર": "50000",
    "एक लाख": "100000", "एक लाख रुपये": "100000", "એક લાખ": "100000",
    "पांच सौ": "500", "पाचशे": "500", "પાંચસો": "500",
    # Tamil / Telugu / Kannada / Malayalam
    "ஆயிரம்": "1000", "இரண்டாயிரம்": "2000", "ஐந்தாயிரம்": "5000", "பத்தாயிரம்": "10000", "இருபதாயிரம்": "20000", "ஒரு லட்சம்": "100000",
    "వెయ్యి": "1000", "రెండు వేలు": "2000", "ఐదు వేలు": "5000", "పది వేలు": "10000", "ఇరవై వేలు": "20000", "ఒక లక్ష": "100000",
    "ಒಂದು ಸಾವಿರ": "1000", "ಎರಡು ಸಾವಿರ": "2000", "ಐದು ಸಾವಿರ": "5000", "ಹತ್ತು ಸಾವಿರ": "10000", "ಇಪ್ಪತ್ತು ಸಾವಿರ": "20000", "ಒಂದು ಲಕ್ಷ": "100000",
    "ആയിരം": "1000", "രണ്ടായിരം": "2000", "അയ്യായിരം": "5000", "പതിനായിരം": "10000", "ഇരുപതിനായിരം": "20000", "ഒരു ലക്ഷം": "100000",
    # Punjabi / Odia
    "ਇੱਕ ਹਜ਼ਾਰ": "1000", "ਦੋ ਹਜ਼ਾਰ": "2000", "ਪੰਜ ਹਜ਼ਾਰ": "5000", "ਦਸ ਹਜ਼ਾਰ": "10000", "ਵੀਹ ਹਜ਼ਾਰ": "20000",
    "ଏକ ହଜାର": "1000", "ଦୁଇ ହଜାର": "2000", "ପାଞ୍ଚ ହଜାର": "5000", "ଦଶ ହଜାର": "10000", "କୋଡିଏ ହଜାର": "20000",
    # Mizo
    "sangkhat": "1000", "sanghnih": "2000", "sangthum": "3000", "sangli": "4000", "sangnga": "5000",
    "sangsarih": "7000", "singkhat": "10000", "singhnih": "20000", "singnga": "50000", "nuaih khat": "100000",
}


BANKING_NORMALIZATIONS = {
    # ==================== ACCOUNT TYPE ====================
    # English
    "savings": "Savings",
    "saving": "Savings",
    "savings account": "Savings",
    "saving account": "Savings",
    "basic savings": "Basic Savings",
    "current": "Current",
    "current account": "Current",
    # Hindi
    "बचत": "Savings",
    "बचत खाता": "Savings",
    "सेविंग्स": "Savings",
    "सेविंग": "Savings",
    "सेविंग्स खाता": "Savings",
    "चालू": "Current",
    "चालू खाता": "Current",
    "करेंट": "Current",
    "करेंट खाता": "Current",
    # Bengali
    "সঞ্চয়": "Savings",
    "সঞ্চয়ী": "Savings",
    "সঞ্চয় অ্যাকাউন্ট": "Savings",
    "সঞ্চয়ী অ্যাকাউন্ট": "Savings",
    "সেভিংস": "Savings",
    "চলতি": "Current",
    "চলতি অ্যাকাউন্ট": "Current",
    "কারেন্ট": "Current",
    "কারেন্ট অ্যাকাউন্ট": "Current",
    # Assamese
    "সঞ্চয় একাউন্ট": "Savings",
    "সঞ্চয়ী একাউন্ট": "Savings",
    "চেভিংছ": "Savings",
    "চলিত": "Current",
    "চলিত একাউন্ট": "Current",
    "কাৰেণ্ট": "Current",
    # Mizo
    "sum dahna": "Savings",
    "sum dah account": "Savings",
    "sum dah": "Savings",
    # Marathi
    "बचत खाते": "Savings",
    "सेव्हिंग्स": "Savings",
    "चालू खाते": "Current",
    # Gujarati
    "બચત ખાતું": "Savings",
    "સેવિંગ્સ ખાતું": "Savings",
    "ચાલુ ખાતું": "Current",
    # Tamil
    "சேமிப்பு கணக்கு": "Savings",
    "சேமிப்பு": "Savings",
    "நடப்பு கணக்கு": "Current",
    "நடப்பு": "Current",
    # Telugu
    "పొదుపు ఖాతా": "Savings",
    "పొదుపు": "Savings",
    "కరెంట్ ఖాతా": "Current",
    # Kannada
    "ಉಳಿತಾಯ ಖಾತೆ": "Savings",
    "ಉಳಿತಾಯ": "Savings",
    "ಚಾಲ್ತಿ ಖಾತೆ": "Current",
    "ಚಾಲ್ತಿ": "Current",
    # Malayalam
    "സേവിംഗ്സ് അക്കൗണ്ട്": "Savings",
    "കറന്റ് അക്കൗണ്ട്": "Current",
    # Punjabi
    "ਬੱਚਤ ਖਾਤਾ": "Savings",
    "ਚਾਲੂ ਖਾਤਾ": "Current",
    # Odia
    "ସଞ୍ଚୟ ଖାତା": "Savings",
    "ସଞ୍ଚୟ": "Savings",
    "ଚାଲୁ ଖାତା": "Current",

    # ==================== ACCOUNT MODE ====================
    # English
    "single": "Single",
    "single account": "Single",
    "individual": "Single",
    "joint": "Joint",
    "joint account": "Joint",
    # Hindi
    "सिंगल": "Single",
    "एकल": "Single",
    "अकेले": "Single",
    "जॉइंट": "Joint",
    "संयुक्त": "Joint",
    "मिलकर": "Joint",
    # Bengali
    "একক": "Single",
    "সিঙ্গেল": "Single",
    "একা": "Single",
    "যৌথ": "Joint",
    "জয়েন্ট": "Joint",
    "একসাথে": "Joint",
    # Assamese
    "ছিংগেল": "Single",
    "অকলে": "Single",
    "যুটীয়া": "Joint",
    "একেলগে": "Joint",
    # Mizo
    "mahni chauh": "Single",
    "mi pahnih": "Joint",
    "mi tam zawk": "Joint",
    # Marathi
    "एकल खाते": "Single",
    "वैयक्तिक": "Single",
    "संयुक्त खाते": "Joint",
    # Gujarati
    "એકલ ખાતું": "Single",
    "સંયુક્ત ખાતું": "Joint",
    # Tamil
    "தனி கணக்கு": "Single",
    "கூட்டு கணக்கு": "Joint",
    # Telugu
    "వ్యక్తిగత ఖాతా": "Single",
    "ఉమ్మడి ఖాతా": "Joint",
    # Kannada
    "ಏಕ ಖಾತೆ": "Single",
    "ಜಂಟಿ ಖಾತೆ": "Joint",
    # Malayalam
    "സിംഗിൾ അക്കൗണ്ട്": "Single",
    "ജോയിന്റ് അക്കൗണ്ട്": "Joint",
    # Punjabi
    "ਇਕਹਿਰਾ ਖਾਤਾ": "Single",
    "ਸਾਂਝਾ ਖਾਤਾ": "Joint",
    # Odia
    "ଏକକ ଖାତା": "Single",
    "ଯୁଗ୍ମ ଖାତା": "Joint",

    # ==================== GENDER ====================
    # English
    "male": "Male",
    "female": "Female",
    "other": "Other",
    "transgender": "Other",
    # Hindi
    "पुरुष": "Male",
    "मेल": "Male",
    "लड़का": "Male",
    "आदमी": "Male",
    "महिला": "Female",
    "स्त्री": "Female",
    "फिमेल": "Female",
    "औरत": "Female",
    "अन्य": "Other",
    # Bengali
    "ছেলে": "Male",
    "নারী": "Female",
    "মেয়ে": "Female",
    "অন্যান্য": "Other",
    # Assamese
    "পুৰুষ": "Male",
    "ল'ৰা": "Male",
    "তিৰোতা": "Female",
    "আন": "Other",
    # Mizo
    "mipa": "Male",
    "hmeichhe": "Female",
    "dang": "Other",
    # Marathi
    "इतर": "Other",
    # Gujarati
    "પુરુષ": "Male",
    # Tamil
    "ஆண்": "Male",
    "பெண்": "Female",
    "பிற": "Other",
    # Telugu
    "పురుషుడు": "Male",
    "స్త్రీ": "Female",
    # Kannada
    "ಪುರುಷ": "Male",
    "ಮಹಿಳೆ": "Female",
    "ಹೆಣ್ಣು": "Female",
    # Malayalam
    "പുരുഷൻ": "Male",
    "സ്ത്രീ": "Female",
    # Punjabi
    "ਪੁਰਸ਼": "Male",
    "ਔਰਤ": "Female",
    # Odia
    "ପୁରୁଷ": "Male",

    # ==================== MARITAL STATUS ====================
    # English
    "married": "Married",
    "single": "Single",
    "unmarried": "Single",
    "divorced": "Divorced",
    "widowed": "Widowed",
    # Hindi
    "विवाहित": "Married",
    "शादीशुदा": "Married",
    "मैरिड": "Married",
    "अविवाहित": "Single",
    "कुंवारा": "Single",
    "अनमैरिड": "Single",
    # Bengali
    "বিবাহিত": "Married",
    "ম্যারেড": "Married",
    "অবিবাহিত": "Single",
    "অবিবাহিতা": "Single",
    "কুমার": "Single",
    # Assamese
    "বিয়া কৰোৱা": "Married",
    "বিয়া নকৰোৱা": "Single",
    "কুমাৰ": "Single",
    # Mizo
    "nupui nei": "Married",
    "pasal nei": "Married",
    "inneih tawh": "Married",
    "nula": "Single",
    "tlangval": "Single",
    # Marathi
    "लग्नाळू": "Married",
    "बिनविवाहित": "Single",
    # Gujarati
    "પરણિત": "Married",
    "અપરણિત": "Single",
    "કુંવારા": "Single",
    # Tamil
    "திருமணமானவர்": "Married",
    "திருமணமாகாதவர்": "Single",
    # Telugu
    "వివాహితుడు": "Married",
    "వివాహిత": "Married",
    "పెళ్లయింది": "Married",
    "అవివాహితుడు": "Single",
    "అవివాహిత": "Single",
    "పెళ్లి కాలేదు": "Single",
    # Kannada
    "ಮದುವೆಯಾದ": "Married",
    "ಮದುವೆಯಾಗದ": "Single",
    # Malayalam
    "വിവാഹിതൻ": "Married",
    "വിവാഹിത": "Married",
    "അവിവാഹിതൻ": "Single",
    "അവിവാഹിത": "Single",
    # Punjabi
    "ਵਿਆਹਿਆ": "Married",
    "ਵਿਆਹੀ": "Married",
    "ਅਣਵਿਆਹਿਆ": "Single",
    # Odia
    "ବିବାହିତ": "Married",
    "ଅବିବାହିତ": "Single",

    # ==================== DEPOSIT MODE ====================
    # English
    "cash": "Cash",
    "cheque": "Cheque",
    "check": "Cheque",
    "transfer": "Transfer",
    # Hindi
    "नकद": "Cash",
    "कैश": "Cash",
    "रोकड़": "Cash",
    "चेक": "Cheque",
    # Bengali
    "নগদ": "Cash",
    "ক্যাশ": "Cash",
    "চেক": "Cheque",
    # Assamese
    "কেছ": "Cash",
    # Mizo
    "pawisa fai": "Cash",
    # Marathi
    "रोख": "Cash",
    "कॅश": "Cash",
    "धनादेश": "Cheque",
    # Gujarati
    "રોકડ": "Cash",
    # Tamil
    "ரொக்கம்": "Cash",
    "கேஷ்": "Cash",
    "காசோலை": "Cheque",
    # Telugu
    "నగదు": "Cash",
    "క్యాష్": "Cash",
    "చెక్కు": "Cheque",
    # Kannada
    "ನಗದು": "Cash",
    # Malayalam
    "പണം": "Cash",
    # Punjabi
    "ਨਕਦ": "Cash",
    "ਚੈੱਕ": "Cheque",
    # Odia
    "ନଗଦ": "Cash",

    # ==================== WITHDRAWAL METHOD ====================
    "with passbook": "With Passbook",
    "passbook": "With Passbook",
    "with ovd": "With OVD",
    "ovd": "With OVD",
    "through gcc": "Through GCC",
    "gcc": "Through GCC",
    "पासबुक से": "With Passbook",
    "पासबुक के साथ": "With Passbook",
    "ओवीडी": "With OVD",
    "পাসবুক সহ": "With Passbook",
    "পাসবুক দিয়ে": "With Passbook",
    "পাছবুকৰ সৈতে": "With Passbook",
    "পাছবুকেৰে": "With Passbook",
    "passbook hmangin": "With Passbook",
    "passbook nen": "With Passbook",
    "ovd hmangin": "With OVD",
    "पासबुकसह": "With Passbook",
    "પાસબુક સાથે": "With Passbook",
    "பாஸ்புக் மூலம்": "With Passbook",
    "పాస్‌బుక్‌తో": "With Passbook",
    "ಪಾಸ್‌ಬುಕ್‌ನೊಂದಿಗೆ": "With Passbook",
    "പാസ്ബുക്ക് വഴി": "With Passbook",
    "ਪਾਸਬੁੱਕ ਨਾਲ": "With Passbook",
    "ପାସବୁକ୍ ସହିତ": "With Passbook",

    # ==================== YES / NO (VOICE CONFIRMATION) ====================
    # English
    "yes": "Yes",
    "yeah": "Yes",
    "correct": "Yes",
    "right": "Yes",
    "true": "Yes",
    "confirm": "Yes",
    "all correct": "Yes",
    "no": "No",
    "nope": "No",
    "incorrect": "No",
    "wrong": "No",
    "false": "No",
    "change": "No",
    "edit": "No",
    # Hindi
    "हाँ": "Yes",
    "जी हाँ": "Yes",
    "हां": "Yes",
    "सही": "Yes",
    "ठीक": "Yes",
    "सच": "Yes",
    "बिल्कुल": "Yes",
    "नहीं": "No",
    "ना": "No",
    "गलत": "No",
    "बदलो": "No",
    # Bengali
    "হ্যাঁ": "Yes",
    "জী হ্যাঁ": "Yes",
    "ঠিক": "Yes",
    "সঠিক": "Yes",
    "সত্য": "Yes",
    "ভুল": "No",
    "বদলান": "No",
    # Assamese
    "হয়": "Yes",
    "ও": "Yes",
    "শুদ্ধ": "Yes",
    "সঁচা": "Yes",
    "নহয়": "No",
    "মিছা": "No",
    "সলনি কৰক": "No",
    # Mizo
    "aw": "Yes",
    "dik": "Yes",
    "a dik": "Yes",
    "awle": "Yes",
    "dik chiah": "Yes",
    "aih": "No",
    "dik lo": "No",
    "a dik lo": "No",
    "thlak rawh": "No",
    # Marathi
    "हो": "Yes",
    "होय": "Yes",
    "बरोबर": "Yes",
    "योग्य": "Yes",
    "खरे": "Yes",
    "नाही": "No",
    "चूक": "No",
    "खोटे": "No",
    "बदला": "No",
    # Gujarati
    "હા": "Yes",
    "બરાબર": "Yes",
    "સાચું": "Yes",
    "ખોટું": "No",
    "બદલો": "No",
    # Tamil
    "ஆம்": "Yes",
    "சரி": "Yes",
    "உண்மை": "Yes",
    "சரியானது": "Yes",
    "இல்லை": "No",
    "தவறு": "No",
    "மாற்று": "No",
    # Telugu
    "అవును": "Yes",
    "సరే": "Yes",
    "నిజం": "Yes",
    "సరైనది": "Yes",
    "కాదు": "No",
    "లేదు": "No",
    "తప్పు": "No",
    "మార్చండి": "No",
    # Kannada
    "ಹೌದು": "Yes",
    "ಸರಿ": "Yes",
    "ನಿಜ": "Yes",
    "ಸರಿಯಾಗಿದೆ": "Yes",
    "ಇಲ್ಲ": "No",
    "ತಪ್ಪು": "No",
    "ಬದಲಾಯಿಸಿ": "No",
    # Malayalam
    "അതെ": "Yes",
    "ശരി": "Yes",
    "ശരിയാണ്": "Yes",
    "അല്ല": "No",
    "തെറ്റ്": "No",
    "മാറ്റുക": "No",
    # Punjabi
    "ਹਾਂ": "Yes",
    "ਠੀਕ": "Yes",
    "ਸੱਚ": "Yes",
    "ਗਲਤ": "No",
    "ਬਦਲੋ": "No",
    # Odia
    "ହଁ": "Yes",
    "ଠିକ୍": "Yes",
    "ସତ": "Yes",
    "ସଠିକ୍": "Yes",
    "ନାହିଁ": "No",
    "ଭୁଲ୍": "No",
    "ବଦଳାନ୍ତୁ": "No",
}


def ensure_ffmpeg():
    """Ensure ffmpeg.exe exists and is placed in PATH."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    venv_scripts = os.path.join(base_dir, "venv", "Scripts")

    # 1. Try imageio_ffmpeg
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = os.path.dirname(ffmpeg_exe)

        # Ensure ffmpeg.exe exists in imageio_ffmpeg dir
        standard_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
        if not os.path.exists(standard_ffmpeg) and os.path.exists(ffmpeg_exe):
            try:
                shutil.copyfile(ffmpeg_exe, standard_ffmpeg)
            except Exception:
                pass

        # Also copy to venv/Scripts for redundancy
        if os.path.isdir(venv_scripts):
            venv_ffmpeg = os.path.join(venv_scripts, "ffmpeg.exe")
            if not os.path.exists(venv_ffmpeg) and os.path.exists(ffmpeg_exe):
                try:
                    shutil.copyfile(ffmpeg_exe, venv_ffmpeg)
                except Exception:
                    pass

        if ffmpeg_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass

    if os.path.isdir(venv_scripts) and venv_scripts not in os.environ.get("PATH", ""):
        os.environ["PATH"] = venv_scripts + os.pathsep + os.environ.get("PATH", "")

    scripts_dir = os.path.dirname(sys.executable)
    if scripts_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = scripts_dir + os.pathsep + os.environ.get("PATH", "")


def get_whisper_model():
    """Lazy-load the Whisper model so application startup remains instant."""
    global _model
    if _model is None:
        ensure_ffmpeg()

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            venv_site = os.path.join(base_dir, "venv", "Lib", "site-packages")
            if os.path.exists(venv_site) and venv_site not in sys.path:
                sys.path.insert(0, venv_site)
            from faster_whisper import WhisperModel

        _model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _model


def normalize_banking_term(text: str) -> Optional[str]:
    """
    Intelligently map speech or text in any regional language to standardized
    banking values (e.g., Savings, Current, Single, Joint, Male, Female, Cash, Cheque, Yes, No, or Digits).
    Supports tokenized sentence parsing, currency expressions, and Indic numerals.
    """
    if not text:
        return None

    # First, convert any Indic script digits in text
    converted_digits = convert_indic_numerals(text)
    clean = converted_digits.strip().lower()

    # 1. Direct match on spoken numbers
    if clean in SPOKEN_NUMBERS_MAP:
        return SPOKEN_NUMBERS_MAP[clean]

    # 2. Check if clean text is an explicit amount or phone with digits
    digits_only = re.sub(r"[^\d]", "", clean)
    if digits_only and (clean == digits_only or len(digits_only) >= 4):
        # If text consists largely of digits (e.g. amount 5000 or phone or account number)
        if len(digits_only) == len(re.sub(r"[\s,₹/-]", "", clean)):
            return digits_only

    # 3. Direct match on BANKING_NORMALIZATIONS
    if clean in BANKING_NORMALIZATIONS:
        return BANKING_NORMALIZATIONS[clean]

    # 4. Check for spoken number expressions contained in phrase
    for phrase, num_val in sorted(SPOKEN_NUMBERS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if phrase in clean:
            return num_val

    # 5. Check if known banking terms are embedded in a longer conversational phrase
    # (e.g. "আমি সেভিংস অ্যাকাউন্ট খুলতে চাই" or "বচত খাতা খোলনা হ্যায়" or "savings account ka duh")
    for key, val in sorted(BANKING_NORMALIZATIONS.items(), key=lambda x: len(x[0]), reverse=True):
        # Exact word boundary or space boundary
        if f" {key} " in f" {clean} ":
            return val
        if clean.startswith(key + " ") or clean.endswith(" " + key):
            return val
        # For non-Latin scripts, substring containment on longer terms (>= 3 chars)
        if len(key) >= 3 and key in clean:
            return val

    # 6. Fallback check for Yes / No confirmations embedded in conversational affirmation
    affirmative_tokens = {"yes", "yeah", "correct", "right", "confirm", "हाँ", "हां", "सही", "ठीक", "হ্যাঁ", "হয়", "হয়", "aw", "dik", "होय", "हो", "બરાબર", "હા", "சரி", "ஆம்", "అవును", "ಸರಿ", "ಹೌದು", "അതെ", "ਹਾਂ", "ହଁ"}
    negative_tokens = {"no", "nope", "wrong", "change", "edit", "नहीं", "ना", "गलत", "না", "ভুল", "নহয়", "নহয়", "aih", "dik lo", "नाही", "ચૂક", "ખોટું", "ના", "இல்லை", "தவறு", "కాదు", "లేదు", "ಇಲ್ಲ", "തപ്പ്", "અલ્લ", "ਨਹੀਂ", "ନାହିଁ"}

    words = set(re.findall(r"[\w\u0900-\u0dff]+", clean))
    if words & affirmative_tokens:
        return "Yes"
    if words & negative_tokens:
        return "No"

    # If converted_digits has valid digits and was changed, return it
    if digits_only and converted_digits != text:
        return digits_only

    return None


def transcribe_audio(audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe an audio file using OpenAI Whisper in the specified language or auto-detected language.
    Produces an English translation and comprehensive banking intent normalization.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found at: {audio_path}")

    ensure_ffmpeg()
    model = get_whisper_model()

    # Resolve language parameter safely
    whisper_lang = None
    clean_lang = None
    if language:
        clean_lang = language.strip().lower()
        whisper_lang = WHISPER_LANG_MAP.get(clean_lang, clean_lang)
        if whisper_lang in ("auto", "none", "unknown"):
            whisper_lang = None

    transcribe_kwargs: Dict[str, Any] = {}
    if whisper_lang:
        transcribe_kwargs["language"] = whisper_lang

    # 1. Main transcription in requested or detected language
    segments, info = model.transcribe(audio_path, **transcribe_kwargs)
    raw_text = " ".join([segment.text for segment in segments]).strip()
    detected_lang = getattr(info, "language", whisper_lang or clean_lang or "unknown")

    # Convert any Indic numerals inside the transcript to ASCII digits
    text = convert_indic_numerals(raw_text)

    # 2. Try immediate normalization from the native spoken text
    normalized = normalize_banking_term(text)

    # 3. If non-English and text was transcribed, get English translation
    english_text = None
    if text and detected_lang and detected_lang != "en":
        # Check if normalized value already translates it
        if normalized in ("Savings", "Current", "Single", "Joint", "Male", "Female", "Married", "Cash", "Cheque", "Yes", "No"):
            english_text = normalized
        else:
            try:
                trans_segments, _ = model.transcribe(audio_path, task="translate")
                english_text = " ".join([segment.text for segment in trans_segments]).strip()
            except Exception:
                pass

    # 4. If not yet normalized, attempt normalization from English translation
    if not normalized and english_text:
        normalized = normalize_banking_term(english_text)

    # 5. If text is predominantly numbers (e.g. mobile/account/amount), normalize to digits
    if not normalized and text:
        digits_only = re.sub(r"[^\d]", "", text)
        if digits_only and (len(digits_only) >= 3 or len(digits_only) == len(re.sub(r"[\s,₹/-]", "", text))):
            normalized = digits_only

    return {
        "text": text,
        "language": detected_lang,
        "english_text": english_text,
        "normalized": normalized
    }

