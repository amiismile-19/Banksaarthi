// Multilingual Question Sets & Banking Normalization for BankSaarthi
// Supports: English (en), Hindi (hi), Assamese (as), Bengali (bn), Mizo (mz)

export type Language = "hi" | "en" | "as" | "bn" | "mz";
export type Service = "account" | "deposit" | "kyc" | "withdrawal" | "mobile-banking" | "form15";

export interface QuestionItem {
  key: string;
  q: string;
  placeholder: string;
  sample: string;
}

// ==================== SPEECH SYNTHESIS HELPER ====================
export const SPEECH_LANG: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  as: "as-IN",
  bn: "bn-IN",
  mz: "en-IN",
};

export function getBestVoiceForLang(
  synth: SpeechSynthesis,
  lang: Language
): { voice: SpeechSynthesisVoice | null; targetBcp: string } {
  const voices = synth.getVoices ? synth.getVoices() : [];
  const primaryBcp = SPEECH_LANG[lang] || "en-IN";
  if (!voices || voices.length === 0) return { voice: null, targetBcp: primaryBcp };

  // 1. Exact match on BCP-47
  let v = voices.find(
    (voice) =>
      voice.lang.toLowerCase() === primaryBcp.toLowerCase() ||
      voice.lang.toLowerCase().replace("_", "-") === primaryBcp.toLowerCase()
  );
  if (v) return { voice: v, targetBcp: primaryBcp };

  // 2. Assamese special case: browsers almost never ship as-IN TTS.
  // Assamese and Bengali share the Eastern Nagari script; bn-IN TTS pronounces it perfectly.
  if (lang === "as") {
    v = voices.find((voice) => voice.lang.toLowerCase().startsWith("bn"));
    if (v) return { voice: v, targetBcp: "bn-IN" };
  }

  // 3. Prefix match (e.g. "bn" for "bn-IN", "hi" for "hi-IN", "en" for "en-IN")
  const prefix = primaryBcp.split("-")[0].toLowerCase();
  v = voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
  if (v) return { voice: v, targetBcp: v.lang };

  // 4. If target language voice not found, do NOT force an English voice on Indic text!
  // Leave voice as null so the browser's native engine resolves it by utterance.lang.
  if (lang === "en" || lang === "mz") {
    v = voices.find((voice) => voice.lang.toLowerCase().includes("in")) || voices[0] || null;
    return { voice: v, targetBcp: v ? v.lang : primaryBcp };
  }

  return { voice: null, targetBcp: primaryBcp };
}

// ==================== CLIENT-SIDE BANKING NORMALIZER ====================
export const CLIENT_BANKING_MAP: Record<string, string> = {
  // Account type
  savings: "Savings",
  saving: "Savings",
  "savings account": "Savings",
  "saving account": "Savings",
  "basic savings": "Basic Savings",
  current: "Current",
  "current account": "Current",
  // Hindi
  बचत: "Savings",
  "बचत खाता": "Savings",
  सेविंग्स: "Savings",
  सेविंग: "Savings",
  चालू: "Current",
  "चालू खाता": "Current",
  करेंट: "Current",
  // Bengali
  সঞ্চয়: "Savings",
  সঞ্চয়ী: "Savings",
  "সঞ্চয় অ্যাকাউন্ট": "Savings",
  "সঞ্চয়ী অ্যাকাউন্ট": "Savings",
  "সঞ্চয় একাউন্ট": "Savings",
  "সঞ্চয়ী একাউন্ট": "Savings",
  সেভিংস: "Savings",
  চলতি: "Current",
  "চলতি অ্যাকাউন্ট": "Current",
  "চলতি একাউন্ট": "Current",
  কারেন্ট: "Current",
  // Assamese
  চেভিংছ: "Savings",
  কাৰেণ্ট: "Current",
  // Mizo
  "sum dahna": "Savings",
  "sum dah account": "Savings",
  "sum dah": "Savings",

  // Account Mode
  single: "Single",
  "single account": "Single",
  joint: "Joint",
  "joint account": "Joint",
  एकल: "Single",
  सिंगल: "Single",
  संयुक्त: "Joint",
  जॉइंट: "Joint",
  একক: "Single",
  সিঙ্গেল: "Single",
  যৌথ: "Joint",
  জয়েন্ট: "Joint",
  ছিংগেল: "Single",
  অকলে: "Single",
  যুটীয়া: "Joint",
  একেলগে: "Joint",
  "mahni chauh": "Single",
  "mi pahnih": "Joint",

  // Gender
  male: "Male",
  female: "Female",
  transgender: "Transgender",
  other: "Other",
  पुरुष: "Male",
  महिला: "Female",
  अन्य: "Other",
  ছেলে: "Male",
  নারী: "Female",
  মেয়ে: "Female",
  অন্যান্য: "Other",
  পুৰুষ: "Male",
  নাৰী: "Female",
  mipa: "Male",
  hmeichhe: "Female",
  dang: "Other",

  // Marital Status
  married: "Married",
  unmarried: "Single",
  विवाहित: "Married",
  अविवाहित: "Single",
  शादीशुदा: "Married",
  বিবাহিত: "Married",
  অবিবাহিত: "Single",
  "বিয়া কৰোৱা": "Married",
  "বিয়া নকৰোৱা": "Single",
  "nupui nei": "Married",
  "pasal nei": "Married",
  tlangval: "Single",
  nula: "Single",

  // Deposit Mode
  cash: "Cash",
  cheque: "Cheque",
  नकद: "Cash",
  चेक: "Cheque",
  নগদ: "Cash",
  ক্যাশ: "Cash",
  কেছ: "Cash",
  "pawisa fai": "Cash",

  // Affirmation
  yes: "Yes",
  no: "No",
  हाँ: "Yes",
  हां: "Yes",
  नहीं: "No",
  ना: "No",
  হ্যাঁ: "Yes",
  ঠিক: "Yes",
  সঠিক: "Yes",
  ভুল: "No",
  হয়: "Yes",
  হয়: "Yes",
  শুদ্ধ: "Yes",
  নহয়: "No",
  নহয়: "No",
  aw: "Yes",
  dik: "Yes",
  aih: "No",
  "dik lo": "No",
};

const INDIC_NUMERAL_REGEX = /[০-৯०-९]/g;
const INDIC_TO_ASCII: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

export function convertIndicDigitsClient(str: string): string {
  if (!str) return "";
  return str.replace(INDIC_NUMERAL_REGEX, (ch) => INDIC_TO_ASCII[ch] || ch);
}

export function clientNormalizeBanking(text: string): string | null {
  if (!text) return null;
  const withDigits = convertIndicDigitsClient(text);
  const clean = withDigits.trim().toLowerCase();

  if (CLIENT_BANKING_MAP[clean]) return CLIENT_BANKING_MAP[clean];

  // Spoken number phrases
  if (clean.includes("পাঁচ হাজাৰ") || clean.includes("পাঁচ হাজার") || clean.includes("पांच हजार") || clean.includes("sangnga")) return "5000";
  if (clean.includes("দহ হাজাৰ") || clean.includes("দশ হাজার") || clean.includes("दस हजार") || clean.includes("singkhat")) return "10000";
  if (clean.includes("এক হাজাৰ") || clean.includes("এক হাজার") || clean.includes("एक हजार") || clean.includes("sangkhat")) return "1000";
  if (clean.includes("দুই হাজাৰ") || clean.includes("দুই হাজার") || clean.includes("दो हजार") || clean.includes("sanghnih")) return "2000";
  if (clean.includes("বিংশ হাজাৰ") || clean.includes("কুৰি হাজাৰ") || clean.includes("বিশ হাজার") || clean.includes("बीस हजार") || clean.includes("singhnih")) return "20000";
  if (clean.includes("পঞ্চাশ হাজাৰ") || clean.includes("পঞ্চাশ হাজার") || clean.includes("पचास हजार") || clean.includes("singnga")) return "50000";
  if (clean.includes("এক লাখ") || clean.includes("nuaih khat")) return "100000";
  if (clean.includes("পাঁচশ") || clean.includes("পাঁচশত") || clean.includes("पांच सौ")) return "500";

  for (const [key, val] of Object.entries(CLIENT_BANKING_MAP)) {
    if (
      ` ${clean} `.includes(` ${key} `) ||
      clean.startsWith(key + " ") ||
      clean.endsWith(" " + key) ||
      (key.length >= 3 && clean.includes(key))
    ) {
      return val;
    }
  }

  // Pure digits check (phone/amount/account)
  const onlyDigits = withDigits.replace(/[^\d]/g, "");
  if (onlyDigits && (onlyDigits.length >= 4 || onlyDigits.length === clean.replace(/[\s,₹/-]/g, "").length)) {
    return onlyDigits;
  }

  return withDigits !== text ? withDigits : null;
}

// ==================== 1. ACCOUNT OPENING QUESTIONS ====================
export const ACCOUNT_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "accountType", q: "Which account type? (Savings / Current)", placeholder: "Savings / Current", sample: "Savings" },
    { key: "accountMode", q: "Single or Joint account?", placeholder: "Single / Joint", sample: "Single" },
    { key: "name", q: "What is your full name?", placeholder: "Full name", sample: "Ramesh Kumar" },
    { key: "gender", q: "What is your gender?", placeholder: "Male / Female / Other", sample: "Male" },
    { key: "fatherOrMotherName", q: "Father's / Mother's / Spouse's Name?", placeholder: "Full name", sample: "Suresh Kumar" },
    { key: "dob", q: "What is your date of birth?", placeholder: "DD / MM / YYYY", sample: "15 / 08 / 1985" },
    { key: "nationality", q: "What is your nationality?", placeholder: "Indian", sample: "Indian" },
    { key: "maritalStatus", q: "What is your marital status?", placeholder: "Single / Married", sample: "Married" },
    { key: "mobile", q: "What is your mobile number?", placeholder: "10-digit number", sample: "9876543210" },
    { key: "email", q: "What is your email address?", placeholder: "email", sample: "test@email.com" },
    { key: "address", q: "What is your current address?", placeholder: "Full address", sample: "Village Kothrud, Pune" },
    { key: "city", q: "Which city do you live in?", placeholder: "City", sample: "Pune" },
    { key: "state", q: "Which state?", placeholder: "State", sample: "Maharashtra" },
    { key: "pincode", q: "What is your PIN code?", placeholder: "6-digit PIN", sample: "411038" },
    { key: "occupation", q: "What is your occupation?", placeholder: "Salaried / Business", sample: "Salaried" },
    { key: "annualIncome", q: "What is your estimated annual income?", placeholder: "<1L / 1-5L / 5-10L", sample: "1-5L" },
    { key: "sourceFunds", q: "What is the primary source of funds?", placeholder: "Salary / Business", sample: "Salary" },
    { key: "nomineeName", q: "What is your nominee's name?", placeholder: "Nominee name", sample: "Sunita Kumar" },
    { key: "nomineeRel", q: "Relationship with nominee?", placeholder: "Spouse / Child", sample: "Spouse" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "aadhaar", q: "What is your Aadhaar number?", placeholder: "12-digit number", sample: "XXXX XXXX 3456" },
  ],
  hi: [
    { key: "accountType", q: "खाते का प्रकार क्या है? (बचत / चालू)", placeholder: "बचत / चालू", sample: "बचत" },
    { key: "accountMode", q: "एकल खाता चाहिए या संयुक्त?", placeholder: "एकल / संयुक्त", sample: "एकल" },
    { key: "name", q: "आपका पूरा नाम क्या है?", placeholder: "पूरा नाम", sample: "रमेश कुमार" },
    { key: "gender", q: "आपका लिंग क्या है?", placeholder: "पुरुष / महिला / अन्य", sample: "पुरुष" },
    { key: "fatherOrMotherName", q: "पिता / माता / पति-पत्नी का नाम?", placeholder: "पूरा नाम", sample: "सुरेश कुमार" },
    { key: "dob", q: "आपकी जन्म तिथि क्या है?", placeholder: "दिन / माह / वर्ष", sample: "15 / 08 / 1985" },
    { key: "nationality", q: "आपकी राष्ट्रीयता क्या है?", placeholder: "भारतीय", sample: "भारतीय" },
    { key: "maritalStatus", q: "आपकी वैवाहिक स्थिति क्या है?", placeholder: "अविवाहित / विवाहित", sample: "विवाहित" },
    { key: "mobile", q: "आपका 10 अंकों का मोबाइल नंबर?", placeholder: "मोबाइल नंबर", sample: "9876543210" },
    { key: "email", q: "आपकी ईमेल आईडी क्या है?", placeholder: "ईमेल", sample: "test@email.com" },
    { key: "address", q: "आपका वर्तमान पता क्या है?", placeholder: "पूरा पता", sample: "गांव कोथरुड, पुणे" },
    { key: "city", q: "आपका शहर कौन सा है?", placeholder: "शहर", sample: "पुणे" },
    { key: "state", q: "आपका राज्य कौन सा है?", placeholder: "राज्य", sample: "महाराष्ट्र" },
    { key: "pincode", q: "आपका पिन कोड क्या है?", placeholder: "6 अंकों का पिन", sample: "411038" },
    { key: "occupation", q: "आपका व्यवसाय या पेशा क्या है?", placeholder: "वेतनभोगी / व्यवसाय", sample: "वेतनभोगी" },
    { key: "annualIncome", q: "आपकी वार्षिक आय कितनी है?", placeholder: "<1 लाख / 1-5 लाख", sample: "1-5 लाख" },
    { key: "sourceFunds", q: "फंड या आय का स्रोत क्या है?", placeholder: "वेतन / व्यापार", sample: "वेतन" },
    { key: "nomineeName", q: "नॉमिनी (नामांकित व्यक्ति) का नाम?", placeholder: "नॉमिनी का नाम", sample: "सुनीता कुमार" },
    { key: "nomineeRel", q: "नॉमिनी से आपका रिश्ता क्या है?", placeholder: "पति / पत्नी / संतान", sample: "पत्नी" },
    { key: "pan", q: "आपका पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "aadhaar", q: "आपका 12 अंकों का आधार नंबर?", placeholder: "आधार संख्या", sample: "XXXX XXXX 3456" },
  ],
  as: [
    { key: "accountType", q: "আপোনাৰ একাউন্টৰ প্ৰকাৰ কি? (সঞ্চয় / চলিত)", placeholder: "সঞ্চয় / চলিত", sample: "সঞ্চয়" },
    { key: "accountMode", q: "একক নে যুটীয়া একাউন্ট?", placeholder: "একক / যুটীয়া", sample: "একক" },
    { key: "name", q: "আপোনাৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "ৰমেশ কুমাৰ" },
    { key: "gender", q: "আপোনাৰ লিংগ কি?", placeholder: "পুৰুষ / মহিলা / অন্যান্য", sample: "পুৰুষ" },
    { key: "fatherOrMotherName", q: "পিতৃ / মাতৃ / স্বামী-স্ত্ৰীৰ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "সুৰেশ কুমাৰ" },
    { key: "dob", q: "আপোনাৰ জন্ম তাৰিখ কি?", placeholder: "দিন / মাহ / বছৰ", sample: "১৫ / ০৮ / ১৯৮৫" },
    { key: "nationality", q: "আপোনাৰ ৰাষ্ট্ৰীয়তা কি?", placeholder: "ভাৰতীয়", sample: "ভাৰতীয়" },
    { key: "maritalStatus", q: "বৈবাহিক স্থিতি কি?", placeholder: "অবিবাহিত / বিবাহিত", sample: "বিবাহিত" },
    { key: "mobile", q: "আপোনাৰ ১০ সংখ্যাৰ ম'বাইল নম্বৰ কি?", placeholder: "ম'বাইল নম্বৰ", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "email", q: "আপোনাৰ ইমেইল আইডি কি?", placeholder: "ইমেইল", sample: "test@email.com" },
    { key: "address", q: "আপোনাৰ বৰ্তমান ঠিকনা কি?", placeholder: "সম্পূৰ্ণ ঠিকনা", sample: "গাওঁ কোথৰুড, পুনে" },
    { key: "city", q: "আপোনাৰ চহৰ কি?", placeholder: "চহৰ", sample: "পুনে" },
    { key: "state", q: "আপোনাৰ ৰাজ্য কি?", placeholder: "ৰাজ্য", sample: "মহাৰাষ্ট্ৰ" },
    { key: "pincode", q: "পিন ক'ড কি?", placeholder: "৬ সংখ্যাৰ পিন", sample: "৪১১০৩৮" },
    { key: "occupation", q: "আপোনাৰ বৃত্তি কি?", placeholder: "চাকৰি / ব্যৱসায়", sample: "চাকৰি" },
    { key: "annualIncome", q: "আপোনাৰ বছৰেকীয়া আয় কিমান?", placeholder: "<১ লাখ / ১-৫ লাখ", sample: "১-৫ লাখ" },
    { key: "sourceFunds", q: "ধনৰ উৎস কি?", placeholder: "দৰমহা / ব্যৱসায়", sample: "দৰমহা" },
    { key: "nomineeName", q: "নমিনীৰ নাম কি?", placeholder: "নমিনীৰ নাম", sample: "সুনিতা কুমাৰ" },
    { key: "nomineeRel", q: "নমিনীৰ সৈতে সম্পৰ্ক কি?", placeholder: "স্বামী / স্ত্ৰী", sample: "স্ত্ৰী" },
    { key: "pan", q: "আপোনাৰ পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "aadhaar", q: "আপোনাৰ ১২ সংখ্যাৰ আধাৰ নম্বৰ কি?", placeholder: "আধাৰ নম্বৰ", sample: "XXXX XXXX ৩৪৫৬" },
  ],
  bn: [
    { key: "accountType", q: "আপনার অ্যাকাউন্টের ধরন কী? (সঞ্চয় / চলতি)", placeholder: "সঞ্চয় / চলতি", sample: "সঞ্চয়" },
    { key: "accountMode", q: "একক নাকি যৌথ অ্যাকাউন্ট?", placeholder: "একক / যৌথ", sample: "একক" },
    { key: "name", q: "আপনার পুরো নাম কী?", placeholder: "পুরো নাম", sample: "রমেশ কুমার" },
    { key: "gender", q: "আপনার লিঙ্গ কী?", placeholder: "পুরুষ / নারী / অন্যান্য", sample: "পুরুষ" },
    { key: "fatherOrMotherName", q: "পিতা / মাতা / স্বামী-স্ত্রীর নাম কী?", placeholder: "পুরো নাম", sample: "সুরেশ কুমার" },
    { key: "dob", q: "আপনার জন্ম তারিখ কী?", placeholder: "দিন / মাস / বছর", sample: "১৫ / ০৮ / ১৯৮৫" },
    { key: "nationality", q: "আপনার জাতীয়তা কী?", placeholder: "ভারতীয়", sample: "ভারতীয়" },
    { key: "maritalStatus", q: "বৈবাহিক অবস্থা কী?", placeholder: "অবিবাহিত / বিবাহিত", sample: "বিবাহিত" },
    { key: "mobile", q: "আপনার ১০ সংখ্যার মোবাইল নম্বর কী?", placeholder: "মোবাইল নম্বর", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "email", q: "আপনার ইমেল আইডি কী?", placeholder: "ইমেল", sample: "test@email.com" },
    { key: "address", q: "আপনার বর্তমান ঠিকানা কী?", placeholder: "সম্পূর্ণ ঠিকানা", sample: "গ্রাম কোথরুদ, পুনে" },
    { key: "city", q: "আপনার শহর কী?", placeholder: "শহর", sample: "পুনে" },
    { key: "state", q: "আপনার রাজ্য কী?", placeholder: "রাজ্য", sample: "মহারাষ্ট্র" },
    { key: "pincode", q: "পিন কোড কী?", placeholder: "৬ সংখ্যার পিন", sample: "৪১১০৩৮" },
    { key: "occupation", q: "আপনার পেশা কী?", placeholder: "চাকরি / ব্যবসা", sample: "চাকরি" },
    { key: "annualIncome", q: "আপনার বার্ষিক আয় কত?", placeholder: "<১ লাখ / ১-৫ লাখ", sample: "১-৫ লাখ" },
    { key: "sourceFunds", q: "তহবিলের উৎস কী?", placeholder: "বেতন / ব্যবসা", sample: "বেতন" },
    { key: "nomineeName", q: "নমিনির নাম কী?", placeholder: "নমিনির নাম", sample: "সুনিতা কুমার" },
    { key: "nomineeRel", q: "নমিনির সাথে সম্পর্ক কী?", placeholder: "স্বামী / স্ত্রী", sample: "স্ত্রী" },
    { key: "pan", q: "আপনার প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "aadhaar", q: "আপনার ১২ সংখ্যার আধার নম্বর কী?", placeholder: "আধার নম্বর", sample: "XXXX XXXX ৩৪৫৬" },
  ],
  mz: [
    { key: "accountType", q: "Account chi eng nge ni ang? (Savings / Current)", placeholder: "Savings / Current", sample: "Savings" },
    { key: "accountMode", q: "Single nge Joint account ni ang?", placeholder: "Single / Joint", sample: "Single" },
    { key: "name", q: "I hming pum eng nge ni?", placeholder: "Hming pum", sample: "Lalthanpuia" },
    { key: "gender", q: "Mipa nge Hmeichhe?", placeholder: "Mipa / Hmeichhe / Dang", sample: "Mipa" },
    { key: "fatherOrMotherName", q: "Pa / Nu / Kawppui hming eng nge?", placeholder: "Hming pum", sample: "Lalrochhara" },
    { key: "dob", q: "Piancham ni eng nge?", placeholder: "Ni / Thla / Kum", sample: "15 / 08 / 1985" },
    { key: "nationality", q: "Hnam eng nge ni?", placeholder: "Indian", sample: "Indian" },
    { key: "maritalStatus", q: "Inneihna dinhmun eng nge?", placeholder: "Tlangval/Nula nge Nupui/Pasal nei", sample: "Nupui nei" },
    { key: "mobile", q: "I mobile number digit 10 eng nge?", placeholder: "Mobile number", sample: "9876543210" },
    { key: "email", q: "I email address eng nge?", placeholder: "email", sample: "test@email.com" },
    { key: "address", q: "I chenna address eng nge?", placeholder: "Address kimchang", sample: "Kulikawn, Aizawl" },
    { key: "city", q: "I khawpui eng nge ni?", placeholder: "Khawpui", sample: "Aizawl" },
    { key: "state", q: "I state eng nge?", placeholder: "State", sample: "Mizoram" },
    { key: "pincode", q: "I PIN code eng nge?", placeholder: "6-digit PIN", sample: "796005" },
    { key: "occupation", q: "I hna eng nge ni?", placeholder: "Sorkar hna / Sumdawnna", sample: "Sorkar hna" },
    { key: "annualIncome", q: "Kum khatah sum lut zat engzat nge?", placeholder: "<1L / 1-5L / 5-10L", sample: "1-5L" },
    { key: "sourceFunds", q: "Sum lakna ber eng nge ni?", placeholder: "Hlawh / Sumdawnna", sample: "Hlawh" },
    { key: "nomineeName", q: "Nominee hming eng nge?", placeholder: "Nominee hming", sample: "Lalthanpuii" },
    { key: "nomineeRel", q: "Nominee nen engtin nge in inlaichin?", placeholder: "Nupui / Pasal / Fa", sample: "Nupui" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "aadhaar", q: "Aadhaar number digit 12 eng nge?", placeholder: "Aadhaar number", sample: "XXXX XXXX 3456" },
  ],
};

// ==================== 2. KYC MISSING QUESTIONS ====================
export const KYC_MISSING_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "maritalStatus", q: "What is your marital status?", placeholder: "Married / Single", sample: "Married" },
    { key: "fatherOrMotherName", q: "What is your father's or spouse's name?", placeholder: "Full name", sample: "Suresh Kumar" },
    { key: "nationality", q: "What is your nationality?", placeholder: "Indian", sample: "Indian" },
    { key: "occupationType", q: "What is your occupation type?", placeholder: "Service / Business", sample: "Service" },
    { key: "monthlyIncome", q: "What is your monthly income?", placeholder: "₹", sample: "₹ 25,000" },
    { key: "panNumber", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "email", q: "What is your email address?", placeholder: "email", sample: "test@email.com" },
    { key: "placeOfBirth", q: "Where is your place of birth?", placeholder: "City / Village", sample: "Pune" },
    { key: "district", q: "What is your home district?", placeholder: "District", sample: "Pune" },
  ],
  hi: [
    { key: "maritalStatus", q: "आपकी वैवाहिक स्थिति क्या है?", placeholder: "विवाहित / अविवाहित", sample: "विवाहित" },
    { key: "fatherOrMotherName", q: "पिता / माता / पति-पत्नी का नाम?", placeholder: "पूरा नाम", sample: "सुरेश कुमार" },
    { key: "nationality", q: "आपकी राष्ट्रीयता क्या है?", placeholder: "भारतीय", sample: "भारतीय" },
    { key: "occupationType", q: "व्यवसाय या पेशा क्या है?", placeholder: "नौकरी / व्यापार", sample: "नौकरी" },
    { key: "monthlyIncome", q: "आपकी मासिक आय कितनी है?", placeholder: "₹", sample: "₹ 25,000" },
    { key: "panNumber", q: "आपका पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "email", q: "आपकी ईमेल आईडी क्या है?", placeholder: "ईमेल", sample: "test@email.com" },
    { key: "placeOfBirth", q: "आपका जन्म स्थान कौन सा है?", placeholder: "शहर / गांव", sample: "पुणे" },
    { key: "district", q: "आपका जिला कौन सा है?", placeholder: "जिला", sample: "पुणे" },
  ],
  as: [
    { key: "maritalStatus", q: "আপোনাৰ বৈবাহিক স্থিতি কি?", placeholder: "বিবাহিত / অবিবাহিত", sample: "বিবাহিত" },
    { key: "fatherOrMotherName", q: "পিতৃ / মাতৃ / স্বামী-স্ত্ৰীৰ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "সুৰেশ কুমাৰ" },
    { key: "nationality", q: "আপোনাৰ ৰাষ্ট্ৰীয়তা কি?", placeholder: "ভাৰতীয়", sample: "ভাৰতীয়" },
    { key: "occupationType", q: "বৃত্তিৰ প্ৰকাৰ কি?", placeholder: "চাকৰি / ব্যৱসায়", sample: "চাকৰি" },
    { key: "monthlyIncome", q: "আপোনাৰ মাহিলী আয় কিমান?", placeholder: "₹", sample: "₹ ২৫,০০০" },
    { key: "panNumber", q: "আপোনাৰ পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "email", q: "আপোনাৰ ইমেইল আইডি কি?", placeholder: "ইমেইল", sample: "test@email.com" },
    { key: "placeOfBirth", q: "আপোনাৰ জন্মস্থান ক'ত?", placeholder: "চহৰ / গাঁও", sample: "পুনে" },
    { key: "district", q: "আপোনাৰ জিলা কি?", placeholder: "জিলা", sample: "পুনে" },
  ],
  bn: [
    { key: "maritalStatus", q: "আপনার বৈবাহিক অবস্থা কী?", placeholder: "বিবাহিত / অবিবাহিত", sample: "বিবাহিত" },
    { key: "fatherOrMotherName", q: "পিতা / মাতা / স্বামী-স্ত্রীর নাম কী?", placeholder: "পুরো নাম", sample: "সুরেশ কুমার" },
    { key: "nationality", q: "আপনার জাতীয়তা কী?", placeholder: "ভারতীয়", sample: "ভারতীয়" },
    { key: "occupationType", q: "পেশার ধরন কী?", placeholder: "চাকরি / ব্যবসা", sample: "চাকরি" },
    { key: "monthlyIncome", q: "আপনার মাসিক আয় কত?", placeholder: "₹", sample: "₹ ২৫,০০০" },
    { key: "panNumber", q: "আপনার প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "email", q: "আপনার ইমেল আইডি কী?", placeholder: "ইমেল", sample: "test@email.com" },
    { key: "placeOfBirth", q: "আপনার জন্মস্থান কোথায়?", placeholder: "শহর / গ্রাম", sample: "পুনে" },
    { key: "district", q: "আপনার জেলা কোনটি?", placeholder: "জেলা", sample: "পুনে" },
  ],
  mz: [
    { key: "maritalStatus", q: "Inneihna dinhmun eng nge?", placeholder: "Nupui nei / Tlangval", sample: "Nupui nei" },
    { key: "fatherOrMotherName", q: "Pa / Nu / Kawppui hming eng nge?", placeholder: "Hming pum", sample: "Lalrochhara" },
    { key: "nationality", q: "Hnam eng nge ni?", placeholder: "Indian", sample: "Indian" },
    { key: "occupationType", q: "Hna chi eng nge ni?", placeholder: "Sorkar hna / Sumdawnna", sample: "Sorkar hna" },
    { key: "monthlyIncome", q: "Thla khatah sum lut zat engzat nge?", placeholder: "₹", sample: "₹ 25,000" },
    { key: "panNumber", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "email", q: "I email address eng nge?", placeholder: "email", sample: "test@email.com" },
    { key: "placeOfBirth", q: "Pianna hmun eng nge ni?", placeholder: "Khawpui / Khua", sample: "Aizawl" },
    { key: "district", q: "District eng nge ni?", placeholder: "District", sample: "Aizawl" },
  ],
};

// ==================== 3. DEPOSIT QUESTIONS ====================
export const DEPOSIT_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "branch", q: "Which bank branch?", placeholder: "Branch name", sample: "SBI" },
    { key: "depositAcType", q: "What is your account type? (SB / CA)", placeholder: "SB", sample: "SB" },
    { key: "accountNo", q: "What is your account number?", placeholder: "Account number", sample: "12345678901" },
    { key: "name", q: "Full name of the account holder?", placeholder: "Full name", sample: "Ramesh Kumar" },
    { key: "mobile", q: "What is your mobile number?", placeholder: "10-digit", sample: "9876543210" },
    { key: "depositMode", q: "Deposit mode: Cash or Cheque?", placeholder: "Cash / Cheque", sample: "Cash" },
    { key: "amount", q: "What is the deposit amount (₹)?", placeholder: "Amount in ₹", sample: "55000" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "cash2000", q: "How many ₹2000 notes?", placeholder: "0", sample: "0" },
    { key: "cash1000", q: "How many ₹1000 notes?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "How many ₹500 notes?", placeholder: "0", sample: "1" },
    { key: "cash100", q: "How many ₹100 notes?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "How many ₹50 notes?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "How many ₹20 notes?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "How many ₹10 notes?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "How many ₹5 notes?", placeholder: "0", sample: "0" },
    { key: "coins", q: "Any coins?", placeholder: "0", sample: "0" },
  ],
  hi: [
    { key: "branch", q: "शाखा का नाम क्या है?", placeholder: "शाखा", sample: "SBI" },
    { key: "depositAcType", q: "खाते का प्रकार क्या है? (SB / CA)", placeholder: "SB / CA", sample: "SB" },
    { key: "accountNo", q: "खाता संख्या क्या है?", placeholder: "खाता संख्या", sample: "12345678901" },
    { key: "name", q: "खाताधारक का पूरा नाम क्या है?", placeholder: "पूरा नाम", sample: "रमेश कुमार" },
    { key: "mobile", q: "मोबाइल नंबर क्या है?", placeholder: "10 अंकों का नंबर", sample: "9876543210" },
    { key: "depositMode", q: "जमा का माध्यम: नकद या चेक?", placeholder: "नकद / चेक", sample: "नकद" },
    { key: "amount", q: "जमा की जाने वाली राशि कितनी है (₹)?", placeholder: "₹", sample: "55000" },
    { key: "pan", q: "पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "cash2000", q: "₹2000 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash1000", q: "₹1000 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "₹500 के कितने नोट हैं?", placeholder: "0", sample: "1" },
    { key: "cash100", q: "₹100 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "₹50 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "₹20 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "₹10 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "₹5 के कितने नोट हैं?", placeholder: "0", sample: "0" },
    { key: "coins", q: "सिक्के कितने हैं?", placeholder: "0", sample: "0" },
  ],
  as: [
    { key: "branch", q: "বেংকৰ শাখাৰ নাম কি?", placeholder: "শাখা", sample: "SBI" },
    { key: "depositAcType", q: "একাউন্টৰ প্ৰকাৰ কি? (SB / CA)", placeholder: "SB / CA", sample: "SB" },
    { key: "accountNo", q: "আপোনাৰ একাউন্ট নম্বৰ কি?", placeholder: "একাউন্ট নম্বৰ", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "name", q: "একাউন্টধাৰীৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "ৰমেশ কুমাৰ" },
    { key: "mobile", q: "ম'বাইল নম্বৰ কি?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "depositMode", q: "জমাৰ ধৰণ: নগদ নে চেক?", placeholder: "নগদ / চেক", sample: "নগদ" },
    { key: "amount", q: "জমাৰ পৰিমাণ কিমান টকা (₹)?", placeholder: "টকাৰ পৰিমাণ", sample: "৫৫০০০" },
    { key: "pan", q: "পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "cash2000", q: "২০০০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash1000", q: "১০০০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash500", q: "৫০০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "১" },
    { key: "cash100", q: "১০০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash50", q: "৫০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash20", q: "২০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash10", q: "১০ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "cash5", q: "৫ টকীয়া নোট কেইখন?", placeholder: "০", sample: "০" },
    { key: "coins", q: "মুদ্ৰা কিমান টকাৰ আছে?", placeholder: "০", sample: "০" },
  ],
  bn: [
    { key: "branch", q: "ব্যাঙ্কের শাখার নাম কী?", placeholder: "শাখা", sample: "SBI" },
    { key: "depositAcType", q: "অ্যাকাউন্টের ধরন কী? (SB / CA)", placeholder: "SB / CA", sample: "SB" },
    { key: "accountNo", q: "আপনার অ্যাকাউন্ট নম্বর কী?", placeholder: "অ্যাকাউন্ট নম্বর", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "name", q: "অ্যাকাউন্টধারীর পুরো নাম কী?", placeholder: "পুরো নাম", sample: "রমেশ কুমার" },
    { key: "mobile", q: "মোবাইল নম্বর কী?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "depositMode", q: "জমার ধরন: নগদ নাকি চেক?", placeholder: "নগদ / চেক", sample: "নগদ" },
    { key: "amount", q: "জমার পরিমাণ কত টাকা (₹)?", placeholder: "টাকার পরিমাণ", sample: "৫৫০০০" },
    { key: "pan", q: "প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "cash2000", q: "২০০০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash1000", q: "১০০০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash500", q: "৫০০ টাকার নোট কয়টি?", placeholder: "০", sample: "১" },
    { key: "cash100", q: "১০০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash50", q: "৫০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash20", q: "২০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash10", q: "১০ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "cash5", q: "৫ টাকার নোট কয়টি?", placeholder: "০", sample: "০" },
    { key: "coins", q: "কয়েন কত টাকার আছে?", placeholder: "০", sample: "০" },
  ],
  mz: [
    { key: "branch", q: "Bank branch hming eng nge ni?", placeholder: "Branch hming", sample: "SBI" },
    { key: "depositAcType", q: "Account chi eng nge? (SB / CA)", placeholder: "SB / CA", sample: "SB" },
    { key: "accountNo", q: "Account number eng nge ni?", placeholder: "Number", sample: "12345678901" },
    { key: "name", q: "Account neitu hming pum?", placeholder: "Hming pum", sample: "Lalthanpuia" },
    { key: "mobile", q: "I mobile number eng nge?", placeholder: "10-digit", sample: "9876543210" },
    { key: "depositMode", q: "Dah dan tur: Pawisa fai nge Cheque?", placeholder: "Pawisa fai / Cheque", sample: "Pawisa fai" },
    { key: "amount", q: "Sum dah zat tur (₹)?", placeholder: "Sum zat", sample: "55000" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "cash2000", q: "₹2000 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash1000", q: "₹1000 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "₹500 note engzah nge?", placeholder: "0", sample: "1" },
    { key: "cash100", q: "₹100 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "₹50 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "₹20 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "₹10 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "₹5 note engzah nge?", placeholder: "0", sample: "0" },
    { key: "coins", q: "Thir pawisa engzah nge?", placeholder: "0", sample: "0" },
  ],
};

// ==================== 4. WITHDRAWAL QUESTIONS ====================
export const WITHDRAWAL_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "accountNo", q: "What is your account number?", placeholder: "Account number", sample: "12345678901" },
    { key: "name", q: "What is the account holder's name?", placeholder: "Full name", sample: "Ramesh Kumar" },
    { key: "mobile", q: "What is your mobile number?", placeholder: "10-digit", sample: "9876543210" },
    { key: "withdrawalMethod", q: "Withdrawal method? (With Passbook / With OVD / Through GCC)", placeholder: "With Passbook", sample: "With Passbook" },
    { key: "amount", q: "Total amount to withdraw (₹)?", placeholder: "Amount in ₹", sample: "5000" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "homeBranch", q: "What is your home branch?", placeholder: "Branch", sample: "Kothrud" },
    { key: "ovdType", q: "OVD ID Type? (Aadhaar / Voter ID / Driving License)", placeholder: "Aadhaar", sample: "Aadhaar" },
    { key: "ovdNumber", q: "What is your OVD document number?", placeholder: "Number", sample: "XXXX XXXX 3456" },
    { key: "cash2000", q: "How many ₹2000 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "How many ₹500 notes desired?", placeholder: "0", sample: "10" },
    { key: "cash100", q: "How many ₹100 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "How many ₹50 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "How many ₹20 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "How many ₹10 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "How many ₹5 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash2", q: "How many ₹2 notes desired?", placeholder: "0", sample: "0" },
    { key: "cash1", q: "How many ₹1 notes desired?", placeholder: "0", sample: "0" },
    { key: "coins", q: "Any coins needed?", placeholder: "0", sample: "0" },
  ],
  hi: [
    { key: "accountNo", q: "आपका खाता नंबर क्या है?", placeholder: "खाता संख्या", sample: "12345678901" },
    { key: "name", q: "खाताधारक का पूरा नाम क्या है?", placeholder: "पूरा नाम", sample: "रमेश कुमार" },
    { key: "mobile", q: "आपका मोबाइल नंबर क्या है?", placeholder: "10 अंकों का नंबर", sample: "9876543210" },
    { key: "withdrawalMethod", q: "निकासी का तरीका: (पासबुक के साथ / OVD के साथ)", placeholder: "पासबुक के साथ", sample: "पासबुक के साथ" },
    { key: "amount", q: "कुल कितनी राशि निकालनी है (₹)?", placeholder: "राशि ₹ में", sample: "5000" },
    { key: "pan", q: "पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "homeBranch", q: "आपकी गृह शाखा कौन सी है?", placeholder: "शाखा", sample: "कोथरुड" },
    { key: "ovdType", q: "पहचान प्रमाण (OVD) का प्रकार? (आधार / वोटर आईडी)", placeholder: "आधार", sample: "आधार" },
    { key: "ovdNumber", q: "दस्तावेज़ संख्या क्या है?", placeholder: "नंबर", sample: "XXXX XXXX 3456" },
    { key: "cash2000", q: "₹2000 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "₹500 के कितने नोट चाहिए?", placeholder: "0", sample: "10" },
    { key: "cash100", q: "₹100 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "₹50 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "₹20 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "₹10 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "₹5 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash2", q: "₹2 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "cash1", q: "₹1 के कितने नोट चाहिए?", placeholder: "0", sample: "0" },
    { key: "coins", q: "सिक्के कितने चाहिए?", placeholder: "0", sample: "0" },
  ],
  as: [
    { key: "accountNo", q: "আপোনাৰ একাউন্ট নম্বৰ কি?", placeholder: "একাউন্ট নম্বৰ", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "name", q: "একাউন্টধাৰীৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "ৰমেশ কুমাৰ" },
    { key: "mobile", q: "ম'বাইল নম্বৰ কি?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "withdrawalMethod", q: "উলিওৱাৰ পদ্ধতি কি? (পাছবুকৰ সৈতে / OVDৰ সৈতে)", placeholder: "পাছবুকৰ সৈতে", sample: "পাছবুকৰ সৈতে" },
    { key: "amount", q: "মুঠ কিমান টকা উলিয়াব (₹)?", placeholder: "টকাৰ পৰিমাণ", sample: "৫০০০" },
    { key: "pan", q: "পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "homeBranch", q: "ঘৰুৱা শাখা কি?", placeholder: "শাখা", sample: "কোথৰুড" },
    { key: "ovdType", q: "OVD প্ৰকাৰ কি? (আধাৰ / ভোটাৰ কাৰ্ড)", placeholder: "আধাৰ", sample: "আধাৰ" },
    { key: "ovdNumber", q: "OVD নম্বৰ কি?", placeholder: "নম্বৰ", sample: "XXXX XXXX ৩৪৫৬" },
    { key: "cash2000", q: "২০০০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash500", q: "৫০০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "১০" },
    { key: "cash100", q: "১০০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash50", q: "৫০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash20", q: "২০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash10", q: "১০ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash5", q: "৫ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash2", q: "২ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "cash1", q: "১ টকীয়া নোট কেইখন লাগে?", placeholder: "০", sample: "০" },
    { key: "coins", q: "মুদ্ৰা কিমান লাগে?", placeholder: "০", sample: "০" },
  ],
  bn: [
    { key: "accountNo", q: "আপনার অ্যাকাউন্ট নম্বর কী?", placeholder: "অ্যাকাউন্ট নম্বর", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "name", q: "অ্যাকাউন্টধারীর পুরো নাম কী?", placeholder: "পুরো নাম", sample: "রমেশ কুমার" },
    { key: "mobile", q: "মোবাইল নম্বর কী?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "withdrawalMethod", q: "টাকা তোলার পদ্ধতি কী? (পাসবই দিয়ে / OVD দিয়ে)", placeholder: "পাসবই দিয়ে", sample: "পাসবই দিয়ে" },
    { key: "amount", q: "মোট কত টাকা তুলবেন (₹)?", placeholder: "টাকার পরিমাণ", sample: "৫০০০" },
    { key: "pan", q: "প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "homeBranch", q: "হোম শাখা কোনটি?", placeholder: "শাখা", sample: "কোথরুদ" },
    { key: "ovdType", q: "OVD ধরন কী? (আধার / ভোটার কার্ড)", placeholder: "আধার", sample: "আধার" },
    { key: "ovdNumber", q: "OVD নম্বর কী?", placeholder: "নম্বর", sample: "XXXX XXXX ৩৪৫৬" },
    { key: "cash2000", q: "২০০০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash500", q: "৫০০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "১০" },
    { key: "cash100", q: "১০০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash50", q: "৫০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash20", q: "২০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash10", q: "১০ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash5", q: "৫ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash2", q: "২ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "cash1", q: "১ টাকার নোট কয়টি লাগবে?", placeholder: "০", sample: "০" },
    { key: "coins", q: "কয়েন কত লাগবে?", placeholder: "০", sample: "০" },
  ],
  mz: [
    { key: "accountNo", q: "Account number eng nge ni?", placeholder: "Account number", sample: "12345678901" },
    { key: "name", q: "Account neitu hming pum?", placeholder: "Hming pum", sample: "Lalthanpuia" },
    { key: "mobile", q: "I mobile number eng nge?", placeholder: "10-digit", sample: "9876543210" },
    { key: "withdrawalMethod", q: "Lakchhuah dan tur? (Passbook hmangin / OVD hmangin)", placeholder: "Passbook hmangin", sample: "Passbook hmangin" },
    { key: "amount", q: "Sum lakchhuah zat tur (₹)?", placeholder: "Sum zat", sample: "5000" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "homeBranch", q: "Home Branch hming?", placeholder: "Branch", sample: "Kulikawn" },
    { key: "ovdType", q: "OVD ID chi? (Aadhaar / Voter ID)", placeholder: "Aadhaar", sample: "Aadhaar" },
    { key: "ovdNumber", q: "OVD document number?", placeholder: "Number", sample: "XXXX XXXX 3456" },
    { key: "cash2000", q: "₹2000 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash500", q: "₹500 note engzah nge i duh?", placeholder: "0", sample: "10" },
    { key: "cash100", q: "₹100 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash50", q: "₹50 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash20", q: "₹20 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash10", q: "₹10 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash5", q: "₹5 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash2", q: "₹2 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "cash1", q: "₹1 note engzah nge i duh?", placeholder: "0", sample: "0" },
    { key: "coins", q: "Thir pawisa i duh em?", placeholder: "0", sample: "0" },
  ],
};

// ==================== 5. KYC INITIAL QUESTIONS ====================
export const KYC_INITIAL_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "name", q: "What is your full name?", placeholder: "As per Aadhaar", sample: "Ramesh Kumar" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "address", q: "What is your current address?", placeholder: "Full address", sample: "Kothrud, Pune, MH 411038" },
  ],
  hi: [
    { key: "name", q: "आधार के अनुसार आपका पूरा नाम?", placeholder: "पूरा नाम", sample: "रमेश कुमार" },
    { key: "pan", q: "आपका पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "address", q: "आपका वर्तमान पता क्या है?", placeholder: "पूरा पता", sample: "कोथरुड, पुणे, 411038" },
  ],
  as: [
    { key: "name", q: "আধাৰ অনুসৰি আপোনাৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "ৰমেশ কুমাৰ" },
    { key: "pan", q: "আপোনাৰ পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "address", q: "আপোনাৰ বৰ্তমান ঠিকনা কি?", placeholder: "সম্পূৰ্ণ ঠিকনা", sample: "কোথৰুড, পুনে, ৪১১০৩৮" },
  ],
  bn: [
    { key: "name", q: "আধার অনুযায়ী আপনার পুরো নাম কী?", placeholder: "পুরো নাম", sample: "রমেশ কুমার" },
    { key: "pan", q: "আপনার প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "address", q: "আপনার বর্তমান ঠিকানা কী?", placeholder: "সম্পূর্ণ ঠিকানা", sample: "কোথরুদ, পুনে, ৪১১০৩৮" },
  ],
  mz: [
    { key: "name", q: "Aadhaar-a i hming pum eng nge?", placeholder: "Hming pum", sample: "Lalthanpuia" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "address", q: "I chenna address kimchang?", placeholder: "Address", sample: "Kulikawn, Aizawl, 796005" },
  ],
};

// ==================== 6. FORM 15G / 15H QUESTIONS ====================
export const FORM15_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "name", q: "What is your full name?", placeholder: "Full name", sample: "Ramesh Kumar" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "accountNo", q: "What is your account number?", placeholder: "Account number", sample: "12345678901" },
    { key: "mobile", q: "What is your mobile number?", placeholder: "10-digit", sample: "9876543210" },
    { key: "dob", q: "What is your date of birth?", placeholder: "DD/MM/YYYY", sample: "15/08/1985" },
    { key: "financialYear", q: "Which financial year?", placeholder: "2024-25 / 2025-26", sample: "2025-26" },
    { key: "interestIncome", q: "Estimated interest income (₹)?", placeholder: "₹", sample: "15000" },
    { key: "totalIncome", q: "Estimated total income (₹)?", placeholder: "₹", sample: "250000" },
  ],
  hi: [
    { key: "name", q: "आपका पूरा नाम क्या है?", placeholder: "पूरा नाम", sample: "रमेश कुमार" },
    { key: "pan", q: "आपका पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "accountNo", q: "आपका खाता नंबर क्या है?", placeholder: "खाता संख्या", sample: "12345678901" },
    { key: "mobile", q: "आपका मोबाइल नंबर क्या है?", placeholder: "10 अंकों का नंबर", sample: "9876543210" },
    { key: "dob", q: "आपकी जन्म तिथि क्या है?", placeholder: "दिन/माह/वर्ष", sample: "15/08/1985" },
    { key: "financialYear", q: "वित्तीय वर्ष कौन सा है? (2024-25 / 2025-26)", placeholder: "2025-26", sample: "2025-26" },
    { key: "interestIncome", q: "अनुमानित ब्याज आय (₹)?", placeholder: "₹", sample: "15000" },
    { key: "totalIncome", q: "अनुमानित कुल आय (₹)?", placeholder: "₹", sample: "250000" },
  ],
  as: [
    { key: "name", q: "আপোনাৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "ৰমেশ কুমাৰ" },
    { key: "pan", q: "আপোনাৰ পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "accountNo", q: "আপোনাৰ একাউন্ট নম্বৰ কি?", placeholder: "একাউন্ট নম্বৰ", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "mobile", q: "আপোনাৰ ম'বাইল নম্বৰ কি?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "dob", q: "আপোনাৰ জন্ম তাৰিখ কি?", placeholder: "দিন/মাহ/বছৰ", sample: "১৫/০৮/১৯৮৫" },
    { key: "financialYear", q: "কোনটো বিত্তীয় বৰ্ষ? (২০২৪-২৫ / ২০২৫-২৬)", placeholder: "২০২৫-২৬", sample: "২০২৫-২৬" },
    { key: "interestIncome", q: "আনুমানিক সুদৰ আয় কিমান (₹)?", placeholder: "₹", sample: "১৫০০০" },
    { key: "totalIncome", q: "আনুমানিক মুঠ আয় কিমান (₹)?", placeholder: "₹", sample: "২৫০০০০" },
  ],
  bn: [
    { key: "name", q: "আপনার পুরো নাম কী?", placeholder: "পুরো নাম", sample: "রমেশ কুমার" },
    { key: "pan", q: "আপনার প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "accountNo", q: "আপনার অ্যাকাউন্ট নম্বর কী?", placeholder: "অ্যাকাউন্ট নম্বর", sample: "১২৩৪৫৬৭৮৯০১" },
    { key: "mobile", q: "আপনার মোবাইল নম্বর কী?", placeholder: "১০ সংখ্যা", sample: "৯৮৭৬৫৪৩২১০" },
    { key: "dob", q: "আপনার জন্ম তারিখ কী?", placeholder: "দিন/মাস/বছর", sample: "১৫/০৮/১৯৮৫" },
    { key: "financialYear", q: "কোন আর্থিক বছর? (২০২৪-২৫ / ২০২৫-২৬)", placeholder: "২০২৫-২৬", sample: "২০২৫-২৬" },
    { key: "interestIncome", q: "আনুমানিক সুদের আয় কত (₹)?", placeholder: "₹", sample: "১৫০০০" },
    { key: "totalIncome", q: "আনুমানিক মোট আয় কত (₹)?", placeholder: "₹", sample: "২৫০০০০" },
  ],
  mz: [
    { key: "name", q: "I hming pum eng nge ni?", placeholder: "Hming pum", sample: "Lalthanpuia" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "accountNo", q: "Account number eng nge ni?", placeholder: "Account number", sample: "12345678901" },
    { key: "mobile", q: "I mobile number eng nge?", placeholder: "10-digit", sample: "9876543210" },
    { key: "dob", q: "Piancham ni eng nge?", placeholder: "Ni/Thla/Kum", sample: "15/08/1985" },
    { key: "financialYear", q: "Financial year eng ber? (2024-25 / 2025-26)", placeholder: "2025-26", sample: "2025-26" },
    { key: "interestIncome", q: "Hnawk chhunga pung awm zat (₹)?", placeholder: "₹", sample: "15000" },
    { key: "totalIncome", q: "Kum khat sum lut zawng zawng (₹)?", placeholder: "₹", sample: "250000" },
  ],
};

// ==================== 7. MOBILE BANKING QUESTIONS ====================
export const MOBILE_BANKING_QUESTIONS_BY_LANG: Record<Language, QuestionItem[]> = {
  en: [
    { key: "name", q: "What is your full name?", placeholder: "Full name", sample: "Juhi Rathod" },
    { key: "accountNo", q: "What is your account number?", placeholder: "Account number", sample: "93762378725" },
    { key: "mobile", q: "What is your mobile number?", placeholder: "10-digit", sample: "9669064784" },
    { key: "email", q: "What is your email address?", placeholder: "email", sample: "juhi@gmail.com" },
    { key: "pan", q: "What is your PAN number?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "ifsc", q: "What is your branch IFSC code?", placeholder: "SBIN0001234", sample: "SBIN0001234" },
    { key: "branch", q: "Which bank branch?", placeholder: "Branch name", sample: "SBI" },
  ],
  hi: [
    { key: "name", q: "आपका पूरा नाम क्या है?", placeholder: "पूरा नाम", sample: "जूही राठौड़" },
    { key: "accountNo", q: "आपका खाता नंबर क्या है?", placeholder: "खाता संख्या", sample: "93762378725" },
    { key: "mobile", q: "आपका मोबाइल नंबर क्या है?", placeholder: "10 अंकों का नंबर", sample: "9669064784" },
    { key: "email", q: "आपकी ईमेल आईडी क्या है?", placeholder: "ईमेल", sample: "juhi@gmail.com" },
    { key: "pan", q: "आपका पैन नंबर क्या है?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "ifsc", q: "शाखा का IFSC कोड क्या है?", placeholder: "SBIN0001234", sample: "SBIN0001234" },
    { key: "branch", q: "शाखा का नाम क्या है?", placeholder: "शाखा", sample: "SBI" },
  ],
  as: [
    { key: "name", q: "আপোনাৰ সম্পূৰ্ণ নাম কি?", placeholder: "সম্পূৰ্ণ নাম", sample: "জুহী ৰাথোড়" },
    { key: "accountNo", q: "আপোনাৰ একাউন্ট নম্বৰ কি?", placeholder: "একাউন্ট নম্বৰ", sample: "৯৩৭৬২৩৭৮৭২৫" },
    { key: "mobile", q: "আপোনাৰ ম'বাইল নম্বৰ কি?", placeholder: "১০ সংখ্যা", sample: "৯৬৬৯০৬৪৭৮৪" },
    { key: "email", q: "আপোনাৰ ইমেইল ঠিকনা কি?", placeholder: "ইমেইল", sample: "juhi@gmail.com" },
    { key: "pan", q: "আপোনাৰ পেন নম্বৰ কি?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "ifsc", q: "আপোনাৰ শাখাৰ IFSC ক'ড কি?", placeholder: "SBIN0001234", sample: "SBIN0001234" },
    { key: "branch", q: "শাখাৰ নাম কি?", placeholder: "শাখা", sample: "SBI" },
  ],
  bn: [
    { key: "name", q: "আপনার পুরো নাম কী?", placeholder: "পুরো নাম", sample: "জুহি রাঠোর" },
    { key: "accountNo", q: "আপনার অ্যাকাউন্ট নম্বর কী?", placeholder: "অ্যাকাউন্ট নম্বর", sample: "৯৩৭৬২৩৭৮৭২৫" },
    { key: "mobile", q: "আপনার মোবাইল নম্বর কী?", placeholder: "১০ সংখ্যা", sample: "৯৬৬৯০৬৪৭৮৪" },
    { key: "email", q: "আপনার ইমেল ঠিকানা কী?", placeholder: "ইমেল", sample: "juhi@gmail.com" },
    { key: "pan", q: "আপনার প্যান নম্বর কী?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "ifsc", q: "আপনার শাখার IFSC কোড কী?", placeholder: "SBIN0001234", sample: "SBIN0001234" },
    { key: "branch", q: "শাখার নাম কী?", placeholder: "শাখা", sample: "SBI" },
  ],
  mz: [
    { key: "name", q: "I hming pum eng nge ni?", placeholder: "Hming pum", sample: "Juhi Rathod" },
    { key: "accountNo", q: "Account number eng nge ni?", placeholder: "Account number", sample: "93762378725" },
    { key: "mobile", q: "I mobile number eng nge?", placeholder: "10-digit", sample: "9669064784" },
    { key: "email", q: "I email address eng nge?", placeholder: "email", sample: "juhi@gmail.com" },
    { key: "pan", q: "PAN number eng nge ni?", placeholder: "ABCDE1234F", sample: "ABCDE1234F" },
    { key: "ifsc", q: "Branch IFSC code eng nge?", placeholder: "SBIN0001234", sample: "SBIN0001234" },
    { key: "branch", q: "Branch hming eng nge?", placeholder: "Branch", sample: "SBI" },
  ],
};

// ==================== GETTER FUNCTIONS ====================
export const ACCOUNT_QUESTIONS = (lang: Language) => ACCOUNT_QUESTIONS_BY_LANG[lang] || ACCOUNT_QUESTIONS_BY_LANG.en;
export const KYC_MISSING_QUESTIONS = (lang: Language) => KYC_MISSING_QUESTIONS_BY_LANG[lang] || KYC_MISSING_QUESTIONS_BY_LANG.en;
export const DEPOSIT_QUESTIONS = (lang: Language) => DEPOSIT_QUESTIONS_BY_LANG[lang] || DEPOSIT_QUESTIONS_BY_LANG.en;
export const WITHDRAWAL_QUESTIONS = (lang: Language) => WITHDRAWAL_QUESTIONS_BY_LANG[lang] || WITHDRAWAL_QUESTIONS_BY_LANG.en;
export const FORM15_QUESTIONS = (lang: Language) => FORM15_QUESTIONS_BY_LANG[lang] || FORM15_QUESTIONS_BY_LANG.en;
export const MOBILE_BANKING_QUESTIONS = (lang: Language) => MOBILE_BANKING_QUESTIONS_BY_LANG[lang] || MOBILE_BANKING_QUESTIONS_BY_LANG.en;

export const SERVICE_QUESTIONS: Record<Service, (lang: Language) => QuestionItem[]> = {
  account: ACCOUNT_QUESTIONS,
  deposit: DEPOSIT_QUESTIONS,
  kyc: (lang: Language) => KYC_INITIAL_QUESTIONS_BY_LANG[lang] || KYC_INITIAL_QUESTIONS_BY_LANG.en,
  withdrawal: WITHDRAWAL_QUESTIONS,
  "mobile-banking": MOBILE_BANKING_QUESTIONS,
  form15: FORM15_QUESTIONS,
};
