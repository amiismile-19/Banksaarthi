import { useState, useEffect, useRef } from "react";
import logoImg from "@/imports/banksarthi_photo.png";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import {
  sendOtpApi,
  verifyOtpApi,
  submitFormApi,
  uploadOcrDocumentApi,
  transcribeAudioApi,
  getFormPdfUrl,
} from "./api";
import {
  ACCOUNT_QUESTIONS,
  KYC_MISSING_QUESTIONS,
  DEPOSIT_QUESTIONS,
  WITHDRAWAL_QUESTIONS,
  FORM15_QUESTIONS,
  MOBILE_BANKING_QUESTIONS,
  SERVICE_QUESTIONS,
  getBestVoiceForLang,
  clientNormalizeBanking,
  convertIndicDigitsClient,
} from "./questions";


type Screen =
  | "welcome" | "language" | "accessibility" | "services" | "otp"
  | "form-intro" | "ai-guidance" | "document"
  | "kyc-missing" | "kyc-print-preview"
  | "deposit-guidance" | "deposit-missing" | "deposit-preview"
  | "withdrawal-guidance" | "withdrawal-missing" | "withdrawal-preview"
  | "account-guidance" | "account-preview"
  | "form15-guidance" | "form15-upload" | "form15-preview"
  | "mobile-banking-guidance" | "mobile-banking-upload" | "mobile-banking-preview"
  | "review" | "voice-confirm" | "output" | "success" | "session-end";

type Language = "hi" | "en" | "as" | "bn" | "mz";
type Service = "account" | "deposit" | "kyc" | "withdrawal" | "mobile-banking" | "form15";

const LANGS: Record<Language, { label: string; native: string; sub: string }> = {
  en: { label: "English", native: "English", sub: "English" },
  hi: { label: "Hindi", native: "हिंदी", sub: "Hindi" },
  as: { label: "Assamese", native: "অসমীয়া", sub: "Assamese" },
    bn: { label: "Bengali", native: "বাংলা", sub: "Bengali" },
  mz: { label: "Mizo", native: "Mizo ṭawng", sub: "Mizo" },
};

const SPEECH_LANG: Record<Language, string> = { en: "en-IN", hi: "hi-IN", as: "as-IN", bn: "bn-IN", mz: "en-IN" };

export type VoiceLanguageCode =
  | "en" | "hi" | "bn" | "as" | "mr" | "gu" | "ta" | "te" | "kn" | "ml" | "pa" | "or" | "mz" | "auto";

export interface VoiceLangOption {
  code: VoiceLanguageCode;
  bcp47: string;
  whisperCode: string;
  label: string;
  native: string;
}

export const VOICE_LANG_OPTIONS: VoiceLangOption[] = [
  { code: "en", bcp47: "en-IN", whisperCode: "en", label: "English", native: "English" },
  { code: "hi", bcp47: "hi-IN", whisperCode: "hi", label: "Hindi", native: "हिंदी" },
  { code: "bn", bcp47: "bn-IN", whisperCode: "bn", label: "Bengali", native: "বাংলা" },
  { code: "as", bcp47: "as-IN", whisperCode: "as", label: "Assamese", native: "অসমীয়া" },
  { code: "mr", bcp47: "mr-IN", whisperCode: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", bcp47: "gu-IN", whisperCode: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ta", bcp47: "ta-IN", whisperCode: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", bcp47: "te-IN", whisperCode: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", bcp47: "kn-IN", whisperCode: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", bcp47: "ml-IN", whisperCode: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", bcp47: "pa-IN", whisperCode: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", bcp47: "or-IN", whisperCode: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "mz", bcp47: "en-IN", whisperCode: "auto", label: "Mizo", native: "Mizo ṭawng" },
  { code: "auto", bcp47: "en-IN", whisperCode: "auto", label: "Auto", native: "Auto / स्वतः" },
];

const T: Record<Language, Record<string, string>> = {
  en: {
    tagline: "Banking made simple for everyone", start: "START", speak: "🔊 Speak", accessibility: "♿ Accessibility",
    selectLang: "Please select your language", continue: "Continue", skip: "Skip — use standard mode",
    voiceGuide: "Voice Guidance", largeText: "Large Text", highContrast: "High Contrast", easyTouch: "Easy Touch",
    selectService: "Select Banking Service", help: "HELP", accountOpen: "Account Opening", cashDeposit: "Cash Deposit",
    kyc: "KYC Update", withdrawal: "Withdrawal", mobileBanking: "Mobile Banking Activation", form15: "Form 15G / 15H",
    accountDesc: "Open a new savings account", depositDesc: "Deposit cash into your account", kycDesc: "Update your KYC details",
    withdrawDesc: "Withdraw cash from account", mobileBankingDesc: "Activate mobile & internet banking",
    form15Desc: "Tax exemption on interest income", formIntro: "BankSaarthi will help you fill this form step by step.",
    formOptions: "How would you like to proceed?", voiceAnswer: "🎙️ Answer by Voice", docScan: "📄 Scan Document",
    manualEntry: "⌨️ Type Manually", listening: "Listening…", typeInstead: "Type Instead", repeatQ: "Repeat",
    explain: "Explain", confirm: "Confirm ✓", change: "Change", docTitle: "Document Assistance",
    docSub: "Upload or scan your Aadhaar / PAN card", uploadDoc: "📁 Upload Document", scanDoc: "📷 Scan Document",
    extractedFields: "Extracted Information", name: "Full Name", dob: "Date of Birth", gender: "Gender",
    address: "Address", pincode: "PIN Code", occupation: "Occupation", accountType: "Account Type",
    nomineeName: "Nominee Name", pan: "PAN Number", mobile: "Mobile Number", accountNo: "Account Number",
    confirmInfo: "Confirm & Continue →", reviewTitle: "Review Your Information", readAloud: "🔊 Read Aloud",
    edit: "Edit", submitConfirm: "Submit Application", voiceConfirmTitle: "Voice Confirmation",
    isCorrect: "Is all the information correct?", yes: "✓ YES", no: "✗ NO", editDetails: "EDIT DETAILS",
    outputTitle: "Choose Output", printForm: "🖨️ Print Form", generateQR: "📱 Generate QR",
    downloadPDF: "⬇️ Download PDF", sendBank: "🏦 Send to Bank", successTitle: "Submitted Successfully!",
    refId: "Reference ID", printReceipt: "🖨️ Print Receipt", showQR: "📱 Show QR Code",
    newSession: "Start New Session", sessionEnd: "Session Completed",
    sessionMsg: "Your session has ended. All information has been cleared for your privacy.",
    startNew: "START NEW SESSION", otpTitle: "Existing Customer Verification",
    otpSubtitle: "Your account already exists. Verify your registered mobile number.",
    otpTitleNewAccount: "New Account — Mobile Verification",
    otpSubtitleNewAccount: "Enter the mobile number you want to register with your new bank account.",
    otpSubtitleKyc: "Your account already exists. Verify your registered mobile number before KYC.",
    otpSubtitleDeposit: "Verify your registered mobile number before depositing cash.",
    otpSubtitleWithdrawal: "Verify your registered mobile number before withdrawing cash.",
    otpSubtitleForm15: "Verify your registered mobile number before submitting Form 15G / 15H.",
    otpSubtitleMobileBanking: "Verify your registered mobile number before activating mobile banking.",
    mobileLabel: "Registered Mobile Number", mobileLabelNew: "Mobile Number",
    mobilePlaceholder: "Enter 10-digit mobile number", sendOtp: "Send OTP", otpLabel: "Enter 6-Digit OTP",
    verifyOtp: "Verify OTP", resendOtp: "Resend OTP", verified: "Mobile Number Verified",
    proceeding: "Proceeding to form...", proceedingAccount: "Proceeding to account opening form...",
    invalidMobile: "Enter a valid 10-digit registered mobile number.", invalidOtp: "Enter the 6-digit OTP.",
    wrongOtp: "Incorrect OTP. Please try again.", expiresIn: "OTP expires in", expired: "OTP expired. Please resend.",
    maritalStatus: "Marital Status", fatherOrMotherName: "Father's / Mother's / Spouse's Name",
    nationality: "Nationality", occupationType: "Occupation Type", monthlyIncome: "Monthly Income",
    email: "Email ID", placeOfBirth: "Place of Birth", district: "District", idProofType: "ID Proof Type",
    idNumber: "ID Number", branch: "Branch", state: "State", cityVillage: "City / Village",
    uploadAadhaar: "📇 Upload Aadhaar Card", uploadPassbook: "📘 Upload Passbook",
    kycScanNote: "We'll scan your Aadhaar Card and Passbook to auto-fill the official KYC Updation Form.",
    missingFieldsTitle: "Some Details Are Missing",
    missingFieldsNotice: "These fields could not be found in your documents. Please fill them by voice or typing.",
    continueToMissing: "Fill Missing Details →", continueToReview: "Continue to Review →",
    allFieldsFound: "✅ All required details were found in your documents.", kycFormTitle: "KYC Updation Form — Preview",
    kycFormSubtitle: "Please check every detail carefully before submitting", personalDetails: "1. Personal Details",
    contactDetails: "2. Contact Details", addressDetails: "3. Address Details", accountDetails: "4. Account Details",
    declarationTitle: "Declaration",
    declarationText: "I hereby declare that the information given above is true and correct to the best of my knowledge.",
    editMissing: "✏️ Edit Missing Details", confirmSubmitKyc: "✅ Confirm & Submit", printThisForm: "🖨️ Print This Form",
    questionOf: "Question", depositAcType: "Account Type (SB/CA/RD/OD/CC/TL/DL)", depositMode: "Deposit Mode",
    cashOption: "Cash", chequeOption: "Cheque", chequeNo: "Cheque No.", chequeBankBranch: "Bank & Branch Name (of Cheque)",
    amountLabel: "Amount (₹)", amountWords: "Rupees in Words",
    panNote: "PAN is required for deposits of ₹50,000 or more.", depositFormTitle: "Deposit / Pay-in Slip — Preview",
    depositFormSubtitle: "Please check every detail carefully before submitting",
    confirmSubmitDeposit: "✅ Confirm & Submit", editDepositDetails: "✏️ Edit Details",
    depositCrossedNote: "1. All cheques must be crossed. 2. Please mention your A/c No. and Name on the back of the cheque.",
    formSubmittedForm60: "Form 60 Submitted", withdrawalMethod: "Withdrawal Method", ovdType: "OVD Type",
    ovdNumber: "OVD Number", homeBranch: "Home Branch", acc_savings: "Savings", acc_current: "Current",
    acc_basic: "Basic Savings", acc_single: "Single", acc_joint: "Joint", acc_annual_income: "Annual Income",
    acc_source_funds: "Source of Funds", acc_nominee_rel: "Relationship", acc_guardian: "Guardian Name (if minor)",
    acc_statement: "Statement Preference", acc_physical: "Physical", acc_email: "Email", acc_services: "Services & Communication",
    acc_atm: "Debit / ATM Card", acc_internet: "Internet Banking", acc_mobile_b: "Mobile Banking", acc_sms: "SMS Alerts",
    acc_form_title: "Account Opening Form", acc_form_sub: "Please verify all details carefully", acc_declare: "8. DECLARATION",
    acc_declare_txt: "I hereby declare that the information provided in this form is true, complete and correct to the best of my knowledge.",
    confirmSubmitAcc: "✅ Confirm & Submit", editAccDetails: "✏️ Edit Details", printThisFormAcc: "🖨️ Print This Form",
    form15Title: "Form 15G / 15H — Preview", form15Subtitle: "Claim tax exemption on interest income",
    mobileBankingTitle: "Mobile Banking Activation — Preview", mobileBankingSubtitle: "Activate your mobile & internet banking services",
    financialYear: "Financial Year", interestIncome: "Estimated Interest Income", totalIncome: "Estimated Total Income",
    ifsc: "IFSC Code", uploadPan: "PAN Card", uploadForm15: "Form 15G / 15H (Signed)", uploadAddressProof: "Address Proof (Aadhaar / Utility Bill)",
    uploadNote: "PDF / JPG / PNG — Max 2 MB", chooseFile: "Choose File or Drag & Drop",
    uploaded: "Uploaded", notUploaded: "Not Uploaded", optional: "Optional",
    documentsUploaded: "Documents Uploaded", pleaseUpload: "Please upload required documents",
    continueBtn: "Continue", form15UploadNote: "Please upload your PAN Card and Form 15G or 15H signed copy.",
    mobileUploadNote: "Please upload your PAN Card and Address Proof.",
    accountMode: "Account Mode (Single / Joint)", city: "City", annualIncome: "Annual Income",
    sourceFunds: "Source of Funds", nomineeRel: "Nominee Relationship", aadhaar: "Aadhaar Number",
    panNumber: "PAN Number", amount: "Amount (₹)",
    cash2000: "₹2000 Notes", cash1000: "₹1000 Notes", cash500: "₹500 Notes", cash100: "₹100 Notes",
    cash50: "₹50 Notes", cash20: "₹20 Notes", cash10: "₹10 Notes", cash5: "₹5 Notes", cash2: "₹2 Notes", cash1: "₹1 Notes", coins: "Coins",
    doneSpeaking: "Done Speaking", listenPage: "Listen to this page", listeningPage: "Speaking...",
    standardValueMapped: "Standard Value Mapped", voiceInputReceived: "Voice Input Received",
    switchLangHint: "You can switch voice language above or type manually.", back: "← Back",
  },
  hi: {
    tagline: "सभी के लिए बैंकिंग आसान", start: "शुरू करें", speak: "🔊 बोलें", accessibility: "♿ सहायता",
    selectLang: "कृपया अपनी भाषा चुनें", continue: "जारी रखें", skip: "छोड़ें — सामान्य मोड",
    voiceGuide: "वॉयस गाइडेंस", largeText: "बड़ा टेक्स्ट", highContrast: "हाई कंट्रास्ट", easyTouch: "आसान टच",
    selectService: "बैंकिंग सेवा चुनें", help: "सहायता", accountOpen: "खाता खोलना", cashDeposit: "नकद जमा",
    kyc: "KYC अपडेट", withdrawal: "नकद निकासी", mobileBanking: "मोबाइल बैंकिंग", form15: "फॉर्म 15G / 15H",
    accountDesc: "नया बचत खाता खोलें", depositDesc: "खाते में नकद जमा करें", kycDesc: "KYC जानकारी अपडेट करें",
    withdrawDesc: "खाते से नकद निकालें", mobileBankingDesc: "मोबाइल बैंकिंग सक्रिय करें", form15Desc: "ब्याज पर कर छूट",
    formIntro: "BankSaarthi आपको यह फॉर्म भरने में मदद करेगा।", formOptions: "आप कैसे आगे बढ़ना चाहते हैं?",
    voiceAnswer: "🎙️ आवाज़ से जवाब दें", docScan: "📄 दस्तावेज़ स्कैन करें", manualEntry: "⌨️ खुद टाइप करें",
    listening: "सुन रहे हैं…", typeInstead: "टाइप करें", repeatQ: "दोबारा पूछें", explain: "समझाएं",
    confirm: "पुष्टि करें ✓", change: "बदलें", docTitle: "दस्तावेज़ सहायता", docSub: "आधार / पैन कार्ड अपलोड या स्कैन करें",
    uploadDoc: "📁 अपलोड करें", scanDoc: "📷 स्कैन करें", extractedFields: "निकाली गई जानकारी", name: "पूरा नाम",
    dob: "जन्म तिथि", gender: "लिंग", address: "पता", pincode: "पिन कोड", occupation: "व्यवसाय",
    accountType: "खाता प्रकार", nomineeName: "नॉमिनी का नाम", pan: "पैन नंबर", mobile: "मोबाइल नंबर",
    accountNo: "खाता नंबर", confirmInfo: "पुष्टि करें और जारी रखें →", reviewTitle: "जानकारी जांचें",
    readAloud: "🔊 ज़ोर से पढ़ें", edit: "संपादित करें", submitConfirm: "आवेदन जमा करें",
    voiceConfirmTitle: "आवाज़ पुष्टि", isCorrect: "क्या सभी जानकारी सही है?", yes: "✓ हाँ", no: "✗ नहीं",
    editDetails: "संपादित करें", outputTitle: "आउटपुट चुनें", printForm: "🖨️ फॉर्म प्रिंट करें", generateQR: "📱 QR बनाएं",
    downloadPDF: "⬇️ PDF डाउनलोड", sendBank: "🏦 बैंक को भेजें", successTitle: "सफलतापूर्वक जमा!", refId: "संदर्भ आईडी",
    printReceipt: "🖨️ रसीद प्रिंट करें", showQR: "📱 QR कोड दिखाएं", newSession: "नया सत्र शुरू करें",
    sessionEnd: "सत्र समाप्त", sessionMsg: "आपका सत्र समाप्त हो गया। गोपनीयता के लिए जानकारी हटा दी गई है।",
    startNew: "नया सत्र शुरू करें", otpTitle: "मौजूदा ग्राहक सत्यापन",
    otpSubtitle: "आपका खाता पहले से मौजूद है। अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    otpTitleNewAccount: "नया खाता — मोबाइल सत्यापन",
    otpSubtitleNewAccount: "जिस मोबाइल नंबर से आप नया बैंक खाता जोड़ना चाहते हैं उसे दर्ज करें।",
    otpSubtitleKyc: "आपका खाता पहले से मौजूद है। KYC से पहले अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    otpSubtitleDeposit: "नकद जमा करने से पहले अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    otpSubtitleWithdrawal: "नकद निकालने से पहले अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    otpSubtitleForm15: "फॉर्म 15G / 15H जमा करने से पहले अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    otpSubtitleMobileBanking: "मोबाइल बैंकिंग सक्रिय करने से पहले अपना पंजीकृत मोबाइल नंबर सत्यापित करें।",
    mobileLabel: "पंजीकृत मोबाइल नंबर", mobileLabelNew: "मोबाइल नंबर",
    mobilePlaceholder: "10 अंकों का मोबाइल नंबर दर्ज करें", sendOtp: "OTP भेजें", otpLabel: "6-अंकों का OTP दर्ज करें",
    verifyOtp: "OTP सत्यापित करें", resendOtp: "OTP फिर भेजें", verified: "मोबाइल नंबर सत्यापित",
    proceeding: "फॉर्म पर आगे बढ़ रहे हैं...", proceedingAccount: "खाता खोलने के फॉर्म पर आगे बढ़ रहे हैं...",
    invalidMobile: "मान्य 10 अंकों का पंजीकृत मोबाइल नंबर दर्ज करें।", invalidOtp: "6 अंकों का OTP दर्ज करें।",
    wrongOtp: "गलत OTP। कृपया पुनः प्रयास करें।", expiresIn: "OTP इतने सेकंड में समाप्त होगा:", expired: "OTP समाप्त हो गया। कृपया फिर से भेजें।",
    maritalStatus: "वैवाहिक स्थिति", fatherOrMotherName: "पिता / माता / पति-पत्नी का नाम", nationality: "राष्ट्रीयता",
    occupationType: "व्यवसाय प्रकार", monthlyIncome: "मासिक आय", email: "ईमेल आईडी", placeOfBirth: "जन्म स्थान",
    district: "जिला", idProofType: "पहचान प्रमाण प्रकार", idNumber: "पहचान संख्या", branch: "शाखा", state: "राज्य",
    cityVillage: "शहर / गांव", uploadAadhaar: "📇 आधार कार्ड अपलोड करें", uploadPassbook: "📘 पासबुक अपलोड करें",
    kycScanNote: "हम आपका आधार कार्ड और पासबुक स्कैन करके KYC फॉर्म अपने आप भर देंगे।",
    missingFieldsTitle: "कुछ जानकारी छूट गई है",
    missingFieldsNotice: "ये जानकारी आपके दस्तावेज़ों में नहीं मिली। कृपया इन्हें आवाज़ या टाइप करके भरें।",
    continueToMissing: "छूटी जानकारी भरें →", continueToReview: "समीक्षा पर जाएं →",
    allFieldsFound: "✅ सभी जरूरी जानकारी दस्तावेज़ों में मिल गई।", kycFormTitle: "KYC अपडेशन फॉर्म — पूर्वावलोकन",
    kycFormSubtitle: "जमा करने से पहले हर जानकारी ध्यान से जांचें", personalDetails: "1. व्यक्तिगत जानकारी",
    contactDetails: "2. संपर्क जानकारी", addressDetails: "3. पता जानकारी", accountDetails: "4. खाता जानकारी",
    declarationTitle: "घोषणा",
    declarationText: "मैं घोषणा करता/करती हूँ कि ऊपर दी गई जानकारी मेरी जानकारी के अनुसार सत्य और सही है।",
    editMissing: "✏️ छूटी जानकारी बदलें", confirmSubmitKyc: "✅ पुष्टि करें और जमा करें", printThisForm: "🖨️ यह फॉर्म प्रिंट करें",
    questionOf: "प्रश्न", depositAcType: "खाता प्रकार (SB/CA/RD/OD/CC/TL/DL)", depositMode: "जमा प्रकार",
    cashOption: "नकद", chequeOption: "चेक", chequeNo: "चेक नंबर", chequeBankBranch: "चेक के बैंक व शाखा का नाम",
    amountLabel: "राशि (₹)", amountWords: "राशि शब्दों में",
    panNote: "₹50,000 या उससे अधिक जमा के लिए PAN आवश्यक है।", depositFormTitle: "जमा / पे-इन स्लिप — पूर्वावलोकन",
    depositFormSubtitle: "जमा करने से पहले हर जानकारी ध्यान से जांचें",
    confirmSubmitDeposit: "✅ पुष्टि करें और जमा करें", editDepositDetails: "✏️ जानकारी बदलें",
    depositCrossedNote: "1. सभी चेक क्रॉस होने चाहिए। 2. कृपया चेक के पीछे अपना खाता नंबर और नाम लिखें।",
    formSubmittedForm60: "Form 60 जमा किया गया", withdrawalMethod: "निकासी का तरीका", ovdType: "OVD प्रकार",
    ovdNumber: "OVD नंबर", homeBranch: "गृह शाखा", acc_savings: "बचत", acc_current: "चालू", acc_basic: "बेसिक सेविंग्स",
    acc_single: "एकल", acc_joint: "संयुक्त", acc_annual_income: "वार्षिक आय", acc_source_funds: "फंड का स्रोत",
    acc_nominee_rel: "रिश्ता", acc_guardian: "अभिभावक का नाम (यदि नाबालिग)", acc_statement: "स्टेटमेंट प्राथमिकता",
    acc_physical: "भौतिक", acc_email: "ईमेल", acc_services: "सेवाएं और संचार", acc_atm: "डेबिट / ATM कार्ड",
    acc_internet: "इंटरनेट बैंकिंग", acc_mobile_b: "मोबाइल बैंकिंग", acc_sms: "SMS अलर्ट",
    acc_form_title: "खाता खोलने का फॉर्म", acc_form_sub: "कृपया सभी जानकारी ध्यान से जांचें", acc_declare: "8. घोषणा",
    acc_declare_txt: "मैं घोषणा करता/करती हूँ कि इस फॉर्म में दी गई जानकारी मेरी जानकारी के अनुसार सत्य और सही है।",
    confirmSubmitAcc: "✅ पुष्टि करें और जमा करें", editAccDetails: "✏️ जानकारी बदलें", printThisFormAcc: "🖨️ यह फॉर्म प्रिंट करें",
    form15Title: "फॉर्म 15G / 15H — पूर्वावलोकन", form15Subtitle: "ब्याज आय पर कर छूट का दावा करें",
    mobileBankingTitle: "मोबाइल बैंकिंग सक्रियण — पूर्वावलोकन", mobileBankingSubtitle: "अपनी मोबाइल और इंटरनेट बैंकिंग सेवाएं सक्रिय करें",
    financialYear: "वित्तीय वर्ष", interestIncome: "अनुमानित ब्याज आय", totalIncome: "अनुमानित कुल आय",
    ifsc: "IFSC कोड", uploadPan: "पैन कार्ड", uploadForm15: "फॉर्म 15G / 15H (हस्ताक्षरित)", uploadAddressProof: "पता प्रमाण (आधार / यूटिलिटी बिल)",
    uploadNote: "PDF / JPG / PNG — अधिकतम 2 MB", chooseFile: "फ़ाइल चुनें या ड्रैग और ड्रॉप करें",
    uploaded: "अपलोड किया गया", notUploaded: "अपलोड नहीं किया गया", optional: "वैकल्पिक",
    documentsUploaded: "दस्तावेज़ अपलोड किए गए", pleaseUpload: "कृपया आवश्यक दस्तावेज़ अपलोड करें",
    continueBtn: "जारी रखें", form15UploadNote: "कृपया अपना पैन कार्ड और फॉर्म 15G या 15H हस्ताक्षरित प्रति अपलोड करें।",
    mobileUploadNote: "कृपया अपना पैन कार्ड और पता प्रमाण अपलोड करें।",
    accountMode: "खाते का तरीका (एकल / संयुक्त)", city: "शहर", annualIncome: "वार्षिक आय",
    sourceFunds: "फंड का स्रोत", nomineeRel: "नॉमिनी से रिश्ता", aadhaar: "आधार संख्या",
    panNumber: "पैन नंबर", amount: "राशि (₹)",
    cash2000: "₹2000 के नोट", cash1000: "₹1000 के नोट", cash500: "₹500 के नोट", cash100: "₹100 के नोट",
    cash50: "₹50 के नोट", cash20: "₹20 के नोट", cash10: "₹10 के नोट", cash5: "₹5 के नोट", cash2: "₹2 के नोट", cash1: "₹1 के नोट", coins: "सिक्के",
    doneSpeaking: "बोलना समाप्त", listenPage: "इस पेज को सुनें", listeningPage: "सुनाया जा रहा है...",
    standardValueMapped: "मानक मान मैप किया गया", voiceInputReceived: "आवाज़ प्राप्त हुई",
    switchLangHint: "आप ऊपर से भाषा बदल सकते हैं या नीचे टाइप कर सकते हैं।", back: "← पीछे",
  },
  as: {
    tagline: "সকলৰ বাবে বেংকিং সহজ", start: "আৰম্ভ কৰক", speak: "🔊 কওক", accessibility: "♿ সহায়তা",
    selectLang: "অনুগ্ৰহ কৰি আপোনাৰ ভাষা বাছনি কৰক", continue: "আগবাঢ়ক", skip: "এৰি দিয়ক — সাধাৰণ ম'ড",
    voiceGuide: "ভইচ গাইডেন্স", largeText: "ডাঙৰ টেক্সট", highContrast: "হাই কন্ট্ৰাষ্ট", easyTouch: "সহজ টাচ",
    selectService: "বেংকিং সেৱা বাছনি কৰক", help: "সহায়", accountOpen: "একাউন্ট খোলা", cashDeposit: "নগদ জমা",
    kyc: "KYC আপডেট", withdrawal: "নগদ উলিয়াওক", mobileBanking: "ম'বাইল বেংকিং", form15: "ফৰ্ম 15G / 15H",
    accountDesc: "নতুন সঞ্চয় একাউন্ট খোলক", depositDesc: "আপোনাৰ একাউন্টত নগদ জমা কৰক",
    kycDesc: "আপোনাৰ KYC সবিশেষ আপডেট কৰক", withdrawDesc: "একাউন্টৰ পৰা নগদ উলিয়াওক",
    mobileBankingDesc: "ম'বাইল আৰু ইণ্টাৰনেট বেংকিং সক্ৰিয় কৰক", form15Desc: "সুদৰ আয়ত কৰ ৰেহাই",
    formIntro: "BankSaarthiয়ে আপোনাক এই ফৰ্মখন ভৰোৱাত সহায় কৰিব।",
    formOptions: "আপুনি কেনেকৈ আগবাঢ়িব বিচাৰে?", voiceAnswer: "🎙️ মাতি উত্তৰ দিয়ক",
    docScan: "📄 ডকুমেন্ট স্কেন কৰক", manualEntry: "⌨️ নিজে টাইপ কৰক", listening: "শুনি আছে…",
    typeInstead: "টাইপ কৰক", repeatQ: "পুনৰ কওক", explain: "বুজাই দিয়ক", confirm: "নিশ্চিত কৰক ✓",
    change: "সলনি কৰক", docTitle: "ডকুমেন্ট সহায়", docSub: "আধাৰ / পেন কাৰ্ড আপলোড বা স্কেন কৰক",
    uploadDoc: "📁 আপলোড কৰক", scanDoc: "📷 স্কেন কৰক", extractedFields: "উলিওৱা তথ্য",
    name: "সম্পূৰ্ণ নাম", dob: "জন্ম তাৰিখ", gender: "লিংগ", address: "ঠিকনা", pincode: "পিন ক'ড",
    occupation: "বৃত্তি", accountType: "একাউন্টৰ প্ৰকাৰ", nomineeName: "নমিনীৰ নাম", pan: "পেন নম্বৰ",
    mobile: "ম'বাইল নম্বৰ", accountNo: "একাউন্ট নম্বৰ", confirmInfo: "নিশ্চিত কৰি আগবাঢ়ক →",
    reviewTitle: "আপোনাৰ তথ্য পৰীক্ষা কৰক", readAloud: "🔊 জোৰে পঢ়ক", edit: "সম্পাদনা কৰক",
    submitConfirm: "আবেদন দাখিল কৰক", voiceConfirmTitle: "মাতি নিশ্চিত কৰা",
    isCorrect: "সকলো তথ্য শুদ্ধ নেকি?", yes: "✓ হয়", no: "✗ নহয়", editDetails: "সম্পাদনা কৰক",
    outputTitle: "আউটপুট বাছনি কৰক", printForm: "🖨️ ফৰ্ম প্ৰিন্ট কৰক", generateQR: "📱 QR বনাওক",
    downloadPDF: "⬇️ PDF ডাউনলোড", sendBank: "🏦 বেংকলৈ পঠিয়াওক", successTitle: "সফলভাৱে দাখিল হ'ল!",
    refId: "ৰেফাৰেন্স আইডি", printReceipt: "🖨️ ৰচিদ প্ৰিন্ট কৰক", showQR: "📱 QR ক'ড দেখাওক",
    newSession: "নতুন ছেছন আৰম্ভ কৰক", sessionEnd: "ছেছন সমাপ্ত",
    sessionMsg: "আপোনাৰ ছেছন সমাপ্ত হ'ল। গোপনীয়তাৰ বাবে তথ্য মচি দিয়া হ'ল।",
    startNew: "নতুন ছেছন আৰম্ভ কৰক", otpTitle: "বিদ্যমান গ্ৰাহক প্ৰমাণীকৰণ",
    otpSubtitle: "আপোনাৰ একাউন্ট ইতিমধ্যে আছে। আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    otpTitleNewAccount: "নতুন একাউন্ট — ম'বাইল প্ৰমাণীকৰণ",
    otpSubtitleNewAccount: "আপুনি নতুন বেংক একাউন্টৰ সৈতে পঞ্জীয়ন কৰিব বিচৰা ম'বাইল নম্বৰটো দিয়ক।",
    otpSubtitleKyc: "আপোনাৰ একাউন্ট ইতিমধ্যে আছে। KYC ৰ আগতে আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    otpSubtitleDeposit: "নগদ জমা কৰাৰ আগতে আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    otpSubtitleWithdrawal: "নগদ উলিওৱাৰ আগতে আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    otpSubtitleForm15: "ফৰ্ম 15G / 15H দাখিল কৰাৰ আগতে আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    otpSubtitleMobileBanking: "ম'বাইল বেংকিং সক্ৰিয় কৰাৰ আগতে আপোনাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ প্ৰমাণিত কৰক।",
    mobileLabel: "পঞ্জীয়ন কৰা ম'বাইল নম্বৰ", mobileLabelNew: "ম'বাইল নম্বৰ",
    mobilePlaceholder: "১০ সংখ্যাৰ ম'বাইল নম্বৰ দিয়ক", sendOtp: "OTP পঠিয়াওক",
    otpLabel: "৬ সংখ্যাৰ OTP দিয়ক", verifyOtp: "OTP প্ৰমাণিত কৰক", resendOtp: "OTP পুনৰ পঠিয়াওক",
    verified: "ম'বাইল নম্বৰ প্ৰমাণিত", proceeding: "ফৰ্মলৈ আগবাঢ়ি আছে...",
    proceedingAccount: "একাউন্ট খোলা ফৰ্মলৈ আগবাঢ়ি আছে...",
    invalidMobile: "বৈধ ১০ সংখ্যাৰ পঞ্জীয়ন কৰা ম'বাইল নম্বৰ দিয়ক।",
    invalidOtp: "৬ সংখ্যাৰ OTP দিয়ক।", wrongOtp: "ভুল OTP। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।",
    expiresIn: "OTP এই সময়ত সমাপ্ত হ'ব:", expired: "OTP সমাপ্ত হ'ল। অনুগ্ৰহ কৰি পুনৰ পঠিয়াওক।",
    maritalStatus: "বৈবাহিক স্থিতি", fatherOrMotherName: "পিতৃ / মাতৃ / স্বামী-স্ত্ৰীৰ নাম",
    nationality: "ৰাষ্ট্ৰীয়তা", occupationType: "বৃত্তিৰ প্ৰকাৰ", monthlyIncome: "মাহিলী আয়",
    email: "ইমেইল আইডি", placeOfBirth: "জন্মস্থান", district: "জিলা", idProofType: "পৰিচয় প্ৰমাণৰ প্ৰকাৰ",
    idNumber: "পৰিচয় নম্বৰ", branch: "শাখা", state: "ৰাজ্য", cityVillage: "চহৰ / গাঁও",
    uploadAadhaar: "📇 আধাৰ কাৰ্ড আপলোড কৰক", uploadPassbook: "📘 পাছবুক আপলোড কৰক",
    kycScanNote: "আমি আপোনাৰ আধাৰ কাৰ্ড আৰু পাছবুক স্কেন কৰি KYC ফৰ্ম স্বয়ংক্ৰিয়ভাৱে পূৰণ কৰিম।",
    missingFieldsTitle: "কিছু তথ্য অনুপস্থিত",
    missingFieldsNotice: "এই তথ্যবোৰ আপোনাৰ ডকুমেন্টত পোৱা নগ'ল। অনুগ্ৰহ কৰি মাতি বা টাইপ কৰি পূৰণ কৰক।",
    continueToMissing: "অনুপস্থিত তথ্য পূৰণ কৰক →", continueToReview: "পৰ্যালোচনালৈ যাওক →",
    allFieldsFound: "✅ সকলো প্ৰয়োজনীয় তথ্য আপোনাৰ ডকুমেন্টত পোৱা গ'ল।",
    kycFormTitle: "KYC আপডেশন ফৰ্ম — পূৰ্বদৰ্শন",
    kycFormSubtitle: "দাখিল কৰাৰ আগতে প্ৰতিটো তথ্য সাৱধানে পৰীক্ষা কৰক",
    personalDetails: "১. ব্যক্তিগত তথ্য", contactDetails: "২. যোগাযোগ তথ্য",
    addressDetails: "৩. ঠিকনা তথ্য", accountDetails: "৪. একাউন্ট তথ্য",
    declarationTitle: "ঘোষণা",
    declarationText: "মই ঘোষণা কৰিছোঁ যে ওপৰত দিয়া তথ্য মোৰ জ্ঞান অনুসৰি সত্য আৰু শুদ্ধ।",
    editMissing: "✏️ অনুপস্থিত তথ্য সম্পাদনা কৰক", confirmSubmitKyc: "✅ নিশ্চিত কৰি দাখিল কৰক",
    printThisForm: "🖨️ এই ফৰ্ম প্ৰিন্ট কৰক", questionOf: "প্ৰশ্ন",
    depositAcType: "একাউন্টৰ প্ৰকাৰ (SB/CA/RD/OD/CC/TL/DL)", depositMode: "জমাৰ ধৰণ",
    cashOption: "নগদ", chequeOption: "চেক", chequeNo: "চেক নম্বৰ", chequeBankBranch: "চেকৰ বেংক আৰু শাখাৰ নাম",
    amountLabel: "পৰিমাণ (₹)", amountWords: "শব্দত পৰিমাণ",
    panNote: "₹50,000 বা তাতোধিক জমাৰ বাবে PAN প্ৰয়োজন।",
    depositFormTitle: "জমা / পে-ইন স্লিপ — পূৰ্বদৰ্শন",
    depositFormSubtitle: "দাখিল কৰাৰ আগতে প্ৰতিটো তথ্য সাৱধানে পৰীক্ষা কৰক",
    confirmSubmitDeposit: "✅ নিশ্চিত কৰি দাখিল কৰক", editDepositDetails: "✏️ তথ্য সম্পাদনা কৰক",
    depositCrossedNote: "১. সকলো চেক ক্ৰছ কৰিব লাগে। ২. চেকৰ পিছফালে A/c নম্বৰ আৰু নাম লিখক।",
    formSubmittedForm60: "Form 60 দাখিল কৰা হ'ল", withdrawalMethod: "উলিওৱাৰ পদ্ধতি",
    ovdType: "OVD প্ৰকাৰ", ovdNumber: "OVD নম্বৰ", homeBranch: "ঘৰুৱা শাখা",
    acc_savings: "সঞ্চয়", acc_current: "চলিত", acc_basic: "বেচিক সঞ্চয়", acc_single: "একক", acc_joint: "যুটীয়া",
    acc_annual_income: "বছৰেকীয়া আয়", acc_source_funds: "ধনৰ উৎস", acc_nominee_rel: "সম্পৰ্ক",
    acc_guardian: "অভিভাৱকৰ নাম (যদি নাবালক)", acc_statement: "ষ্টেটমেন্ট পছন্দ",
    acc_physical: "ভৌতিক", acc_email: "ইমেইল", acc_services: "সেৱা আৰু যোগাযোগ",
    acc_atm: "ডেবিট / ATM কাৰ্ড", acc_internet: "ইণ্টাৰনেট বেংকিং", acc_mobile_b: "ম'বাইল বেংকিং", acc_sms: "SMS সতৰ্কবাণী",
    acc_form_title: "একাউন্ট খোলাৰ ফৰ্ম", acc_form_sub: "অনুগ্ৰহ কৰি সকলো তথ্য সাৱধানে পৰীক্ষা কৰক",
    acc_declare: "৮. ঘোষণা",
    acc_declare_txt: "মই ঘোষণা কৰিছোঁ যে এই ফৰ্মত দিয়া তথ্য মোৰ জ্ঞান অনুসৰি সত্য, সম্পূৰ্ণ আৰু শুদ্ধ।",
    confirmSubmitAcc: "✅ নিশ্চিত কৰি দাখিল কৰক", editAccDetails: "✏️ তথ্য সম্পাদনা কৰক", printThisFormAcc: "🖨️ এই ফৰ্ম প্ৰিন্ট কৰক",
    form15Title: "ফৰ্ম 15G / 15H — পূৰ্বদৰ্শন", form15Subtitle: "সুদৰ আয়ত কৰ ৰেহাই দাবী কৰক",
    mobileBankingTitle: "ম'বাইল বেংকিং সক্ৰিয়কৰণ — পূৰ্বদৰ্শন", mobileBankingSubtitle: "আপোনাৰ ম'বাইল আৰু ইণ্টাৰনেট বেংকিং সেৱা সক্ৰিয় কৰক",
    financialYear: "বিত্তীয় বৰ্ষ", interestIncome: "আনুমানিক সুদ আয়", totalIncome: "আনুমানিক মুঠ আয়",
    ifsc: "IFSC ক'ড", uploadPan: "পেন কাৰ্ড", uploadForm15: "ফৰ্ম 15G / 15H (স্বাক্ষৰিত)", uploadAddressProof: "ঠিকনাৰ প্ৰমাণ (আধাৰ / ইউটিলিটি বিল)",
    uploadNote: "PDF / JPG / PNG — সৰ্বাধিক 2 MB", chooseFile: "ফাইল বাছনি কৰক বা ড্ৰেগ এণ্ড ড্ৰপ কৰক",
    uploaded: "আপলোড কৰা হ'ল", notUploaded: "আপলোড কৰা নহ'ল", optional: "বৈকল্পিক",
    documentsUploaded: "ডকুমেন্ট আপলোড কৰা হ'ল", pleaseUpload: "অনুগ্ৰহ কৰি প্ৰয়োজনীয় ডকুমেন্ট আপলোড কৰক",
    continueBtn: "আগবাঢ়ক", form15UploadNote: "অনুগ্ৰহ কৰি আপোনাৰ পেন কাৰ্ড আৰু ফৰ্ম 15G বা 15H স্বাক্ষৰিত প্ৰতিলিপি আপলোড কৰক।",
    mobileUploadNote: "অনুগ্ৰহ কৰি আপোনাৰ পেন কাৰ্ড আৰু ঠিকনাৰ প্ৰমাণ আপলোড কৰক।",
    accountMode: "একাউন্টৰ ধৰণ (একক / যুটীয়া)", city: "চহৰ", annualIncome: "বছৰেকীয়া আয়",
    sourceFunds: "ধনৰ উৎস", nomineeRel: "নমিনীৰ সৈতে সম্পৰ্ক", aadhaar: "আধাৰ নম্বৰ",
    panNumber: "পেন নম্বৰ", amount: "পৰিমাণ (₹)",
    cash2000: "২০০০ টকীয়া নোট", cash1000: "১০০০ টকীয়া নোট", cash500: "৫০০ টকীয়া নোট", cash100: "১০০ টকীয়া নোট",
    cash50: "৫০ টকীয়া নোট", cash20: "২০ টকীয়া নোট", cash10: "১০ টকীয়া নোট", cash5: "৫ টকীয়া নোট", cash2: "২ টকীয়া নোট", cash1: "১ টকীয়া নোট", coins: "মুদ্ৰা",
    doneSpeaking: "কোৱা শেষ", listenPage: "এই পৃষ্ঠা শুনক", listeningPage: "শুনোৱা হৈছে...",
    standardValueMapped: "মান্য মান মেপ কৰা হ'ল", voiceInputReceived: "ভইচ ইনপুট পোৱা গ'ল",
    switchLangHint: "আপুনি ওপৰৰ পৰা ভাষা সলনি কৰিব পাৰে বা নিজে টাইপ কৰিব পাৰে।", back: "← উভতি যাওক",
  },
  bn: {
    tagline: "সবার জন্য ব্যাঙ্কিং সহজ", start: "শুরু করুন", speak: "🔊 বলুন", accessibility: "♿ সহায়তা",
    selectLang: "অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন", continue: "চালিয়ে যান", skip: "এড়িয়ে যান — সাধারণ মোড",
    voiceGuide: "ভয়েস গাইডেন্স", largeText: "বড় টেক্সট", highContrast: "হাই কনট্রাস্ট", easyTouch: "সহজ টাচ",
    selectService: "ব্যাঙ্কিং পরিষেবা নির্বাচন করুন", help: "সহায়তা", accountOpen: "অ্যাকাউন্ট খোলা", cashDeposit: "নগদ জমা",
    kyc: "KYC আপডেট", withdrawal: "নগদ উত্তোলন", mobileBanking: "মোবাইল ব্যাঙ্কিং", form15: "ফর্ম 15G / 15H",
    accountDesc: "নতুন সঞ্চয় অ্যাকাউন্ট খুলুন", depositDesc: "আপনার অ্যাকাউন্টে নগদ জমা করুন",
    kycDesc: "আপনার KYC বিবরণ আপডেট করুন", withdrawDesc: "অ্যাকাউন্ট থেকে নগদ তুলুন",
    mobileBankingDesc: "মোবাইল ও ইন্টারনেট ব্যাঙ্কিং সক্রিয় করুন", form15Desc: "সুদের আয়ে কর ছাড়",
    formIntro: "BankSaarthi আপনাকে এই ফর্মটি পূরণ করতে সাহায্য করবে।",
    formOptions: "আপনি কীভাবে এগিয়ে যেতে চান?", voiceAnswer: "🎙️ ভয়েসে উত্তর দিন",
    docScan: "📄 ডকুমেন্ট স্ক্যান করুন", manualEntry: "⌨️ নিজে টাইপ করুন", listening: "শুনছি…",
    typeInstead: "টাইপ করুন", repeatQ: "আবার বলুন", explain: "ব্যাখ্যা করুন", confirm: "নিশ্চিত করুন ✓",
    change: "পরিবর্তন করুন", docTitle: "ডকুমেন্ট সহায়তা", docSub: "আধার / প্যান কার্ড আপলোড বা স্ক্যান করুন",
    uploadDoc: "📁 আপলোড করুন", scanDoc: "📷 স্ক্যান করুন", extractedFields: "নিষ্কাশিত তথ্য",
    name: "পুরো নাম", dob: "জন্ম তারিখ", gender: "লিঙ্গ", address: "ঠিকানা", pincode: "পিন কোড",
    occupation: "পেশা", accountType: "অ্যাকাউন্টের ধরন", nomineeName: "নমিনির নাম", pan: "প্যান নম্বর",
    mobile: "মোবাইল নম্বর", accountNo: "অ্যাকাউন্ট নম্বর", confirmInfo: "নিশ্চিত করে এগিয়ে যান →",
    reviewTitle: "আপনার তথ্য পরীক্ষা করুন", readAloud: "🔊 জোরে পড়ুন", edit: "সম্পাদনা করুন",
    submitConfirm: "আবেদন জমা দিন", voiceConfirmTitle: "ভয়েস নিশ্চিতকরণ",
    isCorrect: "সব তথ্য কি সঠিক?", yes: "✓ হ্যাঁ", no: "✗ না", editDetails: "সম্পাদনা করুন",
    outputTitle: "আউটপুট নির্বাচন করুন", printForm: "🖨️ ফর্ম প্রিন্ট করুন", generateQR: "📱 QR তৈরি করুন",
    downloadPDF: "⬇️ PDF ডাউনলোড", sendBank: "🏦 ব্যাঙ্কে পাঠান", successTitle: "সফলভাবে জমা হয়েছে!",
    refId: "রেফারেন্স আইডি", printReceipt: "🖨️ রসিদ প্রিন্ট করুন", showQR: "📱 QR কোড দেখান",
    newSession: "নতুন সেশন শুরু করুন", sessionEnd: "সেশন সমাপ্ত",
    sessionMsg: "আপনার সেশন শেষ হয়েছে। গোপনীয়তার জন্য তথ্য মুছে ফেলা হয়েছে।",
    startNew: "নতুন সেশন শুরু করুন", otpTitle: "বিদ্যমান গ্রাহক যাচাইকরণ",
    otpSubtitle: "আপনার অ্যাকাউন্ট ইতিমধ্যে আছে। আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    otpTitleNewAccount: "নতুন অ্যাকাউন্ট — মোবাইল যাচাইকরণ",
    otpSubtitleNewAccount: "আপনি যে মোবাইল নম্বরটি আপনার নতুন ব্যাঙ্ক অ্যাকাউন্টে নিবন্ধন করতে চান তা লিখুন।",
    otpSubtitleKyc: "আপনার অ্যাকাউন্ট ইতিমধ্যে আছে। KYC-এর আগে আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    otpSubtitleDeposit: "নগদ জমা দেওয়ার আগে আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    otpSubtitleWithdrawal: "নগদ উত্তোলনের আগে আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    otpSubtitleForm15: "ফর্ম 15G / 15H জমা দেওয়ার আগে আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    otpSubtitleMobileBanking: "মোবাইল ব্যাঙ্কিং সক্রিয় করার আগে আপনার নিবন্ধিত মোবাইল নম্বর যাচাই করুন।",
    mobileLabel: "নিবন্ধিত মোবাইল নম্বর", mobileLabelNew: "মোবাইল নম্বর",
    mobilePlaceholder: "১০ সংখ্যার মোবাইল নম্বর লিখুন", sendOtp: "OTP পাঠান",
    otpLabel: "৬ সংখ্যার OTP লিখুন", verifyOtp: "OTP যাচাই করুন", resendOtp: "OTP আবার পাঠান",
    verified: "মোবাইল নম্বর যাচাই হয়েছে", proceeding: "ফর্মে এগিয়ে যাচ্ছে...",
    proceedingAccount: "অ্যাকাউন্ট খোলার ফর্মে এগিয়ে যাচ্ছে...",
    invalidMobile: "বৈধ ১০ সংখ্যার নিবন্ধিত মোবাইল নম্বর লিখুন।",
    invalidOtp: "৬ সংখ্যার OTP লিখুন।", wrongOtp: "ভুল OTP। অনুগ্রহ করে আবার চেষ্টা করুন।",
    expiresIn: "OTP এই সময়ে শেষ হবে:", expired: "OTP শেষ হয়েছে। অনুগ্রহ করে আবার পাঠান।",
    maritalStatus: "বৈবাহিক অবস্থা", fatherOrMotherName: "পিতা / মাতা / স্বামী-স্ত্রীর নাম",
    nationality: "জাতীয়তা", occupationType: "পেশার ধরন", monthlyIncome: "মাসিক আয়",
    email: "ইমেইল আইডি", placeOfBirth: "জন্মস্থান", district: "জেলা", idProofType: "পরিচয় প্রমাণের ধরন",
    idNumber: "পরিচয় নম্বর", branch: "শাখা", state: "রাজ্য", cityVillage: "শহর / গ্রাম",
    uploadAadhaar: "📇 আধার কার্ড আপলোড করুন", uploadPassbook: "📘 পাসবুক আপলোড করুন",
    kycScanNote: "আমরা আপনার আধার কার্ড এবং পাসবুক স্ক্যান করে KYC ফর্ম স্বয়ংক্রিয়ভাবে পূরণ করব।",
    missingFieldsTitle: "কিছু তথ্য অনুপস্থিত",
    missingFieldsNotice: "এই তথ্যগুলি আপনার ডকুমেন্টে পাওয়া যায়নি। অনুগ্রহ করে ভয়েস বা টাইপ করে পূরণ করুন।",
    continueToMissing: "অনুপস্থিত তথ্য পূরণ করুন →", continueToReview: "পর্যালোচনায় যান →",
    allFieldsFound: "✅ সমস্ত প্রয়োজনীয় তথ্য আপনার ডকুমেন্টে পাওয়া গেছে।",
    kycFormTitle: "KYC আপডেশন ফর্ম — প্রিভিউ",
    kycFormSubtitle: "জমা দেওয়ার আগে প্রতিটি তথ্য সাবধানে পরীক্ষা করুন",
    personalDetails: "১. ব্যক্তিগত তথ্য", contactDetails: "২. যোগাযোগ তথ্য",
    addressDetails: "৩. ঠিকানা তথ্য", accountDetails: "৪. অ্যাকাউন্ট তথ্য",
    declarationTitle: "ঘোষণা",
    declarationText: "আমি ঘোষণা করছি যে উপরে দেওয়া তথ্য আমার জ্ঞান অনুসারে সত্য এবং সঠিক।",
    editMissing: "✏️ অনুপস্থিত তথ্য সম্পাদনা করুন", confirmSubmitKyc: "✅ নিশ্চিত করে জমা দিন",
    printThisForm: "🖨️ এই ফর্ম প্রিন্ট করুন", questionOf: "প্রশ্ন",
    depositAcType: "অ্যাকাউন্টের ধরন (SB/CA/RD/OD/CC/TL/DL)", depositMode: "জমার ধরন",
    cashOption: "নগদ", chequeOption: "চেক", chequeNo: "চেক নম্বর", chequeBankBranch: "চেকের ব্যাঙ্ক ও শাখার নাম",
    amountLabel: "পরিমাণ (₹)", amountWords: "শব্দে পরিমাণ",
    panNote: "₹50,000 বা তার বেশি জমার জন্য PAN প্রয়োজন।",
    depositFormTitle: "জমা / পে-ইন স্লিপ — প্রিভিউ",
    depositFormSubtitle: "জমা দেওয়ার আগে প্রতিটি তথ্য সাবধানে পরীক্ষা করুন",
    confirmSubmitDeposit: "✅ নিশ্চিত করে জমা দিন", editDepositDetails: "✏️ তথ্য সম্পাদনা করুন",
    depositCrossedNote: "১. সমস্ত চেক ক্রস করতে হবে। ২. চেকের পিছনে A/c নম্বর এবং নাম লিখুন।",
    formSubmittedForm60: "Form 60 জমা দেওয়া হয়েছে", withdrawalMethod: "উত্তোলনের পদ্ধতি",
    ovdType: "OVD ধরন", ovdNumber: "OVD নম্বর", homeBranch: "হোম শাখা",
    acc_savings: "সঞ্চয়", acc_current: "চলতি", acc_basic: "বেসিক সঞ্চয়", acc_single: "একক", acc_joint: "যৌথ",
    acc_annual_income: "বার্ষিক আয়", acc_source_funds: "তহবিলের উৎস", acc_nominee_rel: "সম্পর্ক",
    acc_guardian: "অভিভাবকের নাম (যদি নাবালক)", acc_statement: "স্টেটমেন্ট পছন্দ",
    acc_physical: "ভৌত", acc_email: "ইমেইল", acc_services: "পরিষেবা ও যোগাযোগ",
    acc_atm: "ডেবিট / ATM কার্ড", acc_internet: "ইন্টারনেট ব্যাঙ্কিং", acc_mobile_b: "মোবাইল ব্যাঙ্কিং", acc_sms: "SMS সতর্কতা",
    acc_form_title: "অ্যাকাউন্ট খোলার ফর্ম", acc_form_sub: "অনুগ্রহ করে সমস্ত তথ্য সাবধানে পরীক্ষা করুন",
    acc_declare: "৮. ঘোষণা",
    acc_declare_txt: "আমি ঘোষণা করছি যে এই ফর্মে দেওয়া তথ্য আমার জ্ঞান অনুসারে সত্য, সম্পূর্ণ এবং সঠিক।",
    confirmSubmitAcc: "✅ নিশ্চিত করে জমা দিন", editAccDetails: "✏️ তথ্য সম্পাদনা করুন", printThisFormAcc: "🖨️ এই ফর্ম প্রিন্ট করুন",
    form15Title: "ফর্ম 15G / 15H — প্রিভিউ", form15Subtitle: "সুদের আয়ে কর ছাড়ের দাবি করুন",
    mobileBankingTitle: "মোবাইল ব্যাঙ্কিং অ্যাক্টিভেশন — প্রিভিউ", mobileBankingSubtitle: "আপনার মোবাইল ও ইন্টারনেট ব্যাঙ্কিং পরিষেবা সক্রিয় করুন",
    financialYear: "আর্থিক বছর", interestIncome: "আনুমানিক সুদ আয়", totalIncome: "আনুমানিক মোট আয়",
    ifsc: "IFSC কোড", uploadPan: "প্যান কার্ড", uploadForm15: "ফর্ম 15G / 15H (স্বাক্ষরিত)", uploadAddressProof: "ঠিকানার প্রমাণ (আধার / ইউটিলিটি বিল)",
    uploadNote: "PDF / JPG / PNG — সর্বোচ্চ 2 MB", chooseFile: "ফাইল বাছুন বা ড্র্যাগ অ্যান্ড ড্রপ করুন",
    uploaded: "আপলোড করা হয়েছে", notUploaded: "আপলোড করা হয়নি", optional: "ঐচ্ছিক",
    documentsUploaded: "ডকুমেন্ট আপলোড করা হয়েছে", pleaseUpload: "অনুগ্রহ করে প্রয়োজনীয় ডকুমেন্ট আপলোড করুন",
    continueBtn: "চালিয়ে যান", form15UploadNote: "অনুগ্রহ করে আপনার প্যান কার্ড এবং ফর্ম 15G বা 15H স্বাক্ষরিত কপি আপলোড করুন।",
    mobileUploadNote: "অনুগ্রহ করে আপনার প্যান কার্ড এবং ঠিকানার প্রমাণ আপলোড করুন।",
    accountMode: "অ্যাকাউন্টের মোড (একক / যৌথ)", city: "শহর", annualIncome: "বার্ষিক আয়",
    sourceFunds: "তহবিলের উৎস", nomineeRel: "নমিনির সাথে সম্পর্ক", aadhaar: "আধার নম্বর",
    panNumber: "প্যান নম্বর", amount: "পরিমাণ (₹)",
    cash2000: "২০০০ টাকার নোট", cash1000: "১০০০ টাকার নোট", cash500: "৫০০ টাকার নোট", cash100: "১০০ টাকার নোট",
    cash50: "৫০ টাকার নোট", cash20: "২০ টাকার নোট", cash10: "১০ টাকার নোট", cash5: "৫ টাকার নোট", cash2: "২ টাকার নোট", cash1: "১ টাকার নোট", coins: "কয়েন",
    doneSpeaking: "বলা শেষ", listenPage: "এই পৃষ্ঠাটি শুনুন", listeningPage: "শোনানো হচ্ছে...",
    standardValueMapped: "মানক মান ম্যাপ করা হয়েছে", voiceInputReceived: "ভয়েস ইনপুট পাওয়া গেছে",
    switchLangHint: "আপনি উপর থেকে ভাষা পরিবর্তন করতে পারেন বা নিজে টাইপ করতে পারেন।", back: "← ফিরে যান",
  },
  mz: {
    tagline: "Banking hi a awlsam tak", start: "TAN", speak: "🔊 Ṭawng", accessibility: "♿ Ṭanpuina",
    selectLang: "I ṭawng thlang rawh", continue: "Chhunzawm", skip: "Paih — mode pângngai hmang",
    voiceGuide: "Aw ṭanpuina", largeText: "Thuziak lian", highContrast: "Contrast sang", easyTouch: "Dek awlsam",
    selectService: "Banking rawngbawlna thlang rawh", help: "ṬANPUINA", accountOpen: "Account hawng",
    cashDeposit: "Sum dah", kyc: "KYC siamṭhat", withdrawal: "Sum lakchhuah", mobileBanking: "Mobile banking",
    form15: "Form 15G / 15H", accountDesc: "Savings account thar hawng rawh", depositDesc: "I account-ah sum dah rawh",
    kycDesc: "I KYC details siamṭhat rawh", withdrawDesc: "Account aṭanga sum lakchhuah rawh",
    mobileBankingDesc: "Mobile leh internet banking tihlawhtling rawh", form15Desc: "Hnawk chhunga chhiah chhuah",
    formIntro: "BankSaarthi chuan he form hi step by step aṭangin a ṭanpui ang che.",
    formOptions: "Engtin nge i kal zêl ang?", voiceAnswer: "🎙️ Aw-in chhang rawh",
    docScan: "📄 Document scan rawh", manualEntry: "⌨️ Mahniin type rawh", listening: "Ngaihthlak mek…",
    typeInstead: "Type rawh", repeatQ: "Sawn nawn rawh", explain: "Hrilhfiah rawh", confirm: "Nemnghet ✓",
    change: "Thlak rawh", docTitle: "Document ṭanpuina", docSub: "Aadhaar / PAN card upload emaw scan rawh",
    uploadDoc: "📁 Upload rawh", scanDoc: "📷 Scan rawh", extractedFields: "Lakchhuah thute",
    name: "Hming pum", dob: "Piancham ni", gender: "Mipa/Hmeichhe", address: "Address", pincode: "PIN Code",
    occupation: "Hna", accountType: "Account chi", nomineeName: "Nominee hming", pan: "PAN Number",
    mobile: "Mobile Number", accountNo: "Account Number", confirmInfo: "Nemnghetin chhunzawm →",
    reviewTitle: "I thute enfel rawh", readAloud: "🔊 Ring takin chhiar rawh", edit: "Siamṭhat rawh",
    submitConfirm: "Application thehlut rawh", voiceConfirmTitle: "Aw-in nemnghehna",
    isCorrect: "Thute hi a dik vek em?", yes: "✓ DIK", no: "✗ DIK LO", editDetails: "SIAMṬHAT RAWH",
    outputTitle: "Output thlang rawh", printForm: "🖨️ Form print rawh", generateQR: "📱 QR siam rawh",
    downloadPDF: "⬇️ PDF download rawh", sendBank: "🏦 Bank-ah thawn rawh", successTitle: "Thehlut a hlawhtling!",
    refId: "Reference ID", printReceipt: "🖨️ Receipt print rawh", showQR: "📱 QR Code entir rawh",
    newSession: "Session thar tan rawh", sessionEnd: "Session a zo",
    sessionMsg: "I session a zo tawh. I private nihna vênhim nan thute paih vek a ni.",
    startNew: "SESSION THAR TAN RAWH", otpTitle: "Customer awm sa verification",
    otpSubtitle: "I account a awm tawh. I registered mobile number verify rawh.",
    otpTitleNewAccount: "Account thar — Mobile verification",
    otpSubtitleNewAccount: "I bank account thar-ah register duh mobile number ziak rawh.",
    otpSubtitleKyc: "I account a awm tawh. KYC hmain i registered mobile number verify rawh.",
    otpSubtitleDeposit: "Sum dah hmain i registered mobile number verify rawh.",
    otpSubtitleWithdrawal: "Sum lakchhuah hmain i registered mobile number verify rawh.",
    otpSubtitleForm15: "Form 15G / 15H thehlut hmain i registered mobile number verify rawh.",
    otpSubtitleMobileBanking: "Mobile banking tihlawhtling hmain i registered mobile number verify rawh.",
    mobileLabel: "Registered Mobile Number", mobileLabelNew: "Mobile Number",
    mobilePlaceholder: "Mobile number 10 ziak rawh", sendOtp: "OTP thawn rawh",
    otpLabel: "OTP 6 ziak rawh", verifyOtp: "OTP verify rawh", resendOtp: "OTP thawn nawn rawh",
    verified: "Mobile Number verified", proceeding: "Form-ah kal mek...",
    proceedingAccount: "Account hawng form-ah kal mek...",
    invalidMobile: "Mobile number 10 dik tak ziak rawh.",
    invalidOtp: "OTP 6 ziak rawh.", wrongOtp: "OTP dik lo. Khawngaihin han tum leh rawh.",
    expiresIn: "OTP hi a ral hun:", expired: "OTP a ral tawh. Khawngaihin thawn nawn rawh.",
    maritalStatus: "Inneihna dinhmun", fatherOrMotherName: "Pa / Nu / Kawppui hming",
    nationality: "Hnam", occupationType: "Hna chi", monthlyIncome: "Thla khatah sum lut",
    email: "Email ID", placeOfBirth: "Pianna hmun", district: "District", idProofType: "ID Proof chi",
    idNumber: "ID Number", branch: "Branch", state: "State", cityVillage: "Khawpui / Khua",
    uploadAadhaar: "📇 Aadhaar Card upload rawh", uploadPassbook: "📘 Passbook upload rawh",
    kycScanNote: "I Aadhaar Card leh Passbook kan scan ang a, KYC Form official kan auto-fill ang.",
    missingFieldsTitle: "Thute ṭhen a kim lo",
    missingFieldsNotice: "Heng thute hi i document-ah a awm lo. Khawngaihin aw emaw type emawin dah rawh.",
    continueToMissing: "Thute kim lo dah rawh →", continueToReview: "Review-ah kal rawh →",
    allFieldsFound: "✅ Thute kim vek i document-ah a awm.",
    kycFormTitle: "KYC Updation Form — Preview",
    kycFormSubtitle: "Thehlut hmain thute kimchang enfel rawh",
    personalDetails: "1. Personal Details", contactDetails: "2. Contact Details",
    addressDetails: "3. Address Details", accountDetails: "4. Account Details",
    declarationTitle: "Puipunna",
    declarationText: "A chunga thute hi ka hriat theihna aṭangin a dik a ni tih ka puang a.",
    editMissing: "✏️ Thute kim lo siamṭhat rawh", confirmSubmitKyc: "✅ Nemnghetin thehlut rawh",
    printThisForm: "🖨️ He form hi print rawh", questionOf: "Zawhna",
    depositAcType: "Account chi (SB/CA/RD/OD/CC/TL/DL)", depositMode: "Dah dan",
    cashOption: "Cash", chequeOption: "Cheque", chequeNo: "Cheque No.", chequeBankBranch: "Cheque Bank & Branch hming",
    amountLabel: "Sum (₹)", amountWords: "Thuin sum",
    panNote: "₹50,000 aia tam dah nan PAN a ngai.",
    depositFormTitle: "Deposit / Pay-in Slip — Preview",
    depositFormSubtitle: "Thehlut hmain thute kimchang enfel rawh",
    confirmSubmitDeposit: "✅ Nemnghetin thehlut rawh", editDepositDetails: "✏️ Thute siamṭhat rawh",
    depositCrossedNote: "1. Cheque zawng zawng crossed tur a ni. 2. Cheque hnungah A/c No. leh hming ziak rawh.",
    formSubmittedForm60: "Form 60 thehlut a ni", withdrawalMethod: "Lakchhuah dan",
    ovdType: "OVD chi", ovdNumber: "OVD Number", homeBranch: "Home Branch",
    acc_savings: "Savings", acc_current: "Current", acc_basic: "Basic Savings", acc_single: "Single", acc_joint: "Joint",
    acc_annual_income: "Kum khata sum lut", acc_source_funds: "Sum lakna", acc_nominee_rel: "Inlaichinna",
    acc_guardian: "Guardian hming (naupang a nih chuan)", acc_statement: "Statement duh",
    acc_physical: "Physical", acc_email: "Email", acc_services: "Services & Communication",
    acc_atm: "Debit / ATM Card", acc_internet: "Internet Banking", acc_mobile_b: "Mobile Banking", acc_sms: "SMS Alerts",
    acc_form_title: "Account Opening Form", acc_form_sub: "Khawngaihin thute kimchang enfel rawh",
    acc_declare: "8. PUIPUNNA",
    acc_declare_txt: "He form-a thute hi ka hriat theihna aṭangin a dik, a kim, a felfai tih ka puang a.",
    confirmSubmitAcc: "✅ Nemnghetin thehlut rawh", editAccDetails: "✏️ Thute siamṭhat rawh", printThisFormAcc: "🖨️ He form hi print rawh",
    form15Title: "Form 15G / 15H — Preview", form15Subtitle: "Hnawk chhunga chhiah chhuah dil rawh",
    mobileBankingTitle: "Mobile Banking Activation — Preview", mobileBankingSubtitle: "I mobile leh internet banking service te tihlawhtling rawh",
    financialYear: "Financial Year", interestIncome: "Estimated Interest Income", totalIncome: "Estimated Total Income",
    ifsc: "IFSC Code", uploadPan: "PAN Card", uploadForm15: "Form 15G / 15H (Signed)", uploadAddressProof: "Address Proof (Aadhaar / Utility Bill)",
    uploadNote: "PDF / JPG / PNG — Max 2 MB", chooseFile: "File thlang rawh emaw Drag & Drop rawh",
    uploaded: "Upload a ni", notUploaded: "Upload a ni lo", optional: "Optional",
    documentsUploaded: "Document upload a ni", pleaseUpload: "Khawngaihin document pawimawh upload rawh",
    continueBtn: "Chhunzawm", form15UploadNote: "Khawngaihin i PAN Card leh Form 15G/15H signed copy upload rawh.",
    mobileUploadNote: "Khawngaihin i PAN Card leh Address Proof upload rawh.",
    accountMode: "Account kalhmang (Single / Joint)", city: "Khawpui", annualIncome: "Kum khata sum lut",
    sourceFunds: "Sum lakna", nomineeRel: "Nominee inlaichinna", aadhaar: "Aadhaar Number",
    panNumber: "PAN Number", amount: "Sum zat (₹)",
    cash2000: "₹2000 Note", cash1000: "₹1000 Note", cash500: "₹500 Note", cash100: "₹100 Note",
    cash50: "₹50 Note", cash20: "₹20 Note", cash10: "₹10 Note", cash5: "₹5 Note", cash2: "₹2 Note", cash1: "₹1 Note", coins: "Thir pawisa",
    doneSpeaking: "Ṭawng zo", listenPage: "He phek hi ngaithla rawh", listeningPage: "Ngaithla mek...",
    standardValueMapped: "Standard Value Mapped", voiceInputReceived: "Aw-in thute dawn a ni",
    switchLangHint: "I ṭawng duh chungah i thlak thei a, a hnuai lamah i type thei bawk.", back: "← Kir leh",
  }
};

// ==================== VOICE HOOK ====================
function useScreenReader(lang: Language, text: string, autoPlay: boolean = false) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const { voice, targetBcp } = getBestVoiceForLang(synth, lang);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = targetBcp || SPEECH_LANG[lang] || "en-IN";
    utterance.rate = 0.92;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  };
  useEffect(() => {
    if (autoPlay && text) {
      const timer = setTimeout(() => speak(), 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);
  return { isSpeaking, speak };
}

// ==================== UTILITY ====================
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigitWords(n: number): string { if (n < 20) return ONES[n]; const tens = Math.floor(n / 10); const ones = n % 10; return TENS[tens] + (ones ? " " + ONES[ones] : ""); }
function threeDigitWords(n: number): string { const h = Math.floor(n / 100); const rest = n % 100; return (h ? ONES[h] + " Hundred" + (rest ? " " : "") : "") + (rest ? twoDigitWords(rest) : ""); }
function amountToIndianWords(amount: number): string { if (!amount || amount <= 0) return ""; let n = Math.floor(amount); const crore = Math.floor(n / 10000000); n %= 10000000; const lakh = Math.floor(n / 100000); n %= 100000; const thousand = Math.floor(n / 1000); n %= 1000; const hundred = n; const parts: string[] = []; if (crore) parts.push(threeDigitWords(crore) + " Crore"); if (lakh) parts.push(threeDigitWords(lakh) + " Lakh"); if (thousand) parts.push(threeDigitWords(thousand) + " Thousand"); if (hundred) parts.push(threeDigitWords(hundred)); return "Rupees " + parts.join(" ") + " Only"; }
function parseAmount(raw: string): number { const digits = convertIndicDigitsClient(raw || "").replace(/[^0-9]/g, ""); return digits ? parseInt(digits, 10) : 0; }
function num(v?: string): number { const digits = convertIndicDigitsClient(v || "0").replace(/[^0-9]/g, ""); const n = parseInt(digits, 10); return isNaN(n) ? 0 : n; }

const ACCOUNT_REVIEW_ORDER = ["accountType", "accountMode", "name", "gender", "fatherOrMotherName", "dob", "nationality", "maritalStatus", "mobile", "email", "address", "city", "state", "pincode", "occupation", "annualIncome", "sourceFunds", "nomineeName", "nomineeRel", "pan", "aadhaar"];
const KYC_REVIEW_ORDER = ["name", "dob", "gender", "maritalStatus", "fatherOrMotherName", "nationality", "occupationType", "monthlyIncome", "placeOfBirth", "panNumber", "mobile", "email", "idProofType", "idNumber", "address", "city", "district", "state", "pincode", "accountNo", "branch"];
const DEPOSIT_REVIEW_ORDER = ["branch", "depositAcType", "accountNo", "name", "mobile", "depositMode", "amount", "pan"];
const WITHDRAWAL_REVIEW_ORDER = WITHDRAWAL_QUESTIONS("en").map(q => q.key);
const FORM15_REVIEW_ORDER = FORM15_QUESTIONS("en").map(q => q.key);
const MOBILE_BANKING_REVIEW_ORDER = MOBILE_BANKING_QUESTIONS("en").map(q => q.key);

function buildAccountReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return ACCOUNT_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }
function buildKycReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return KYC_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }
function buildDepositReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return DEPOSIT_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }
function buildWithdrawalReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return WITHDRAWAL_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }
function buildForm15ReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return FORM15_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }
function buildMobileBankingReviewFields(data: Record<string, string>, t: Record<string, string>): { label: string; value: string }[] { return MOBILE_BANKING_REVIEW_ORDER.filter((k) => data[k]).map((k) => ({ label: t[k] || k, value: data[k] })); }

// ==================== COMMON COMPONENTS ====================
function Logo({ size = 80 }: { size?: number }) { return <img src={logoImg} alt="BankSaarthi" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />; }
function BackButton({ onBack, label = "← Back" }: { onBack: () => void; label?: string }) { return (<button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-blue-700 font-semibold text-base border-2 border-blue-200 bg-white hover:bg-blue-50 active:scale-95 transition-all shadow-sm">{label}</button>); }
function HelpBtn({ t }: { t: Record<string, string> }) { return <button className="fixed bottom-6 right-4 z-50 font-bold rounded-full px-5 py-3 text-base shadow-xl active:scale-95 transition-all text-white" style={{ background: "#f97316" }}>❓ {t.help}</button>; }
function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) { return (<div className="flex items-center gap-3 mb-6">{onBack && <BackButton onBack={onBack} />}<Logo size={44} /><div><h1 className="text-xl font-extrabold text-blue-900 leading-tight">BankSaarthi</h1><p className="text-sm font-semibold text-blue-500">{title}</p></div></div>); }
function VoiceButton({ onClick, isSpeaking, label, speakingLabel }: { onClick: () => void; isSpeaking: boolean; label?: string; speakingLabel?: string }) { return (<button onClick={onClick} className={`w-full py-3 rounded-xl text-white font-bold active:scale-95 transition-all shadow-md mb-4 ${isSpeaking ? 'bg-orange-600' : 'bg-blue-600'}`}>{isSpeaking ? (speakingLabel || "🔊 Listening...") : (label || "🔊 Listen to this page")}</button>); }

// ==================== FORM UI ====================
function FormField({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) { return (<div className={wide ? "col-span-2" : ""}><p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-0.5">{label}</p><div className="border-b-2 border-blue-900/70 pb-1 min-h-[22px]"><span className="text-sm font-bold text-blue-950">{value || "________________"}</span></div></div>); }
function CheckboxRow({ label, options, value }: { label: string; options: string[]; value?: string }) { const norm = (s: string) => (clientNormalizeBanking(s) || s).toLowerCase().trim(); const normalizedVal = value ? (clientNormalizeBanking(value) || value) : ""; const matchIdx = normalizedVal ? options.findIndex((o) => { const normO = norm(o); const normV = norm(normalizedVal); return normV.includes(normO) || normO.includes(normV); }) : -1; return (<div><p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1">{label}</p><div className="flex flex-wrap gap-x-4 gap-y-2">{options.map((o, i) => { const checked = i === matchIdx; return (<span key={o} className="flex items-center gap-1.5"><span className="w-4 h-4 flex items-center justify-center border-2 border-blue-900/70 rounded-[2px] text-[10px] font-black shrink-0" style={{ background: checked ? "#1a3a8f" : "transparent", color: checked ? "#fff" : "transparent" }}>✓</span><span className={`text-xs ${checked ? "font-extrabold text-blue-950" : "font-medium text-blue-500"}`}>{o}</span></span>); })}</div></div>); }
function FormSectionBar({ n, title }: { n: string; title: string }) { return <div className="px-4 py-2 text-white font-extrabold text-xs tracking-wide" style={{ background: "#1a3a8f" }}>{n}. {title}</div>; }

// ==================== DOCUMENT UPLOAD COMPONENT ====================
function DocumentUpload({ label, required, onUpload }: { label: string; required?: boolean; onUpload: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (f: File) => {
    if (f.size > 2 * 1024 * 1024) { setError("File size must be under 2 MB"); return; }
    if (!["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(f.type)) { setError("Only PDF, JPG, PNG allowed"); return; }
    setError(""); setFile(f); onUpload(f);
  };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); };
  return (
    <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-4">
      <p className="font-bold text-blue-900 text-sm mb-1">📄 {label} {required && <span className="text-red-500">*</span>}</p>
      <p className="text-[10px] text-blue-500 mb-3">PDF / JPG / PNG — Max 2 MB</p>
      {!file ? (
        <div onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} className={`flex flex-col items-center gap-2 cursor-pointer py-5 rounded-xl transition-all ${dragActive ? "bg-blue-100 border-2 border-blue-500" : "bg-white"}`}>
          <span className="text-3xl">📁</span>
          <span className="text-blue-700 font-semibold text-sm">Choose File or Drag & Drop</span>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-green-300">
          <div className="flex items-center gap-2"><span className="text-xl">✅</span><div><p className="text-xs font-bold text-blue-900 truncate max-w-[180px]">{file.name}</p><p className="text-[10px] text-blue-400">{(file.size / 1024).toFixed(1)} KB</p></div></div>
          <button onClick={() => { setFile(null); onUpload(null); }} className="text-red-500 font-bold text-lg">❌</button>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2 font-semibold">{error}</p>}
    </div>
  );
}

// ==================== WITHDRAWAL FORM ====================
function WithdrawalFormPreview({ data }: { data: Record<string, string> }) {
  const cashTotal = (num(data.cash2000) * 2000) + (num(data.cash500) * 500) + (num(data.cash100) * 100) + (num(data.cash50) * 50) + (num(data.cash20) * 20) + (num(data.cash10) * 10) + (num(data.cash5) * 5) + (num(data.cash2) * 2) + (num(data.cash1) * 1) + num(data.coins);
  const amountInWords = amountToIndianWords(parseAmount(data.amount) || cashTotal);

  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[8px] mt-4">
      <div className="p-3">

        {/* ===== HEADER ===== */}
        <div className="flex items-start justify-between mb-2">
          <Logo size={45} />
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-blue-950">बचत खाता निकासी फार्म</p>
            <p className="text-[11px] font-extrabold text-blue-950">SAVINGS BANK WITHDRAWAL</p>
          </div>
          <div className="text-right text-[6px]">
            <p className="text-blue-900">दिनांक / DATE: <span className="border-b border-dotted border-gray-400 inline-block w-16"> {new Date().toLocaleDateString("en-IN")}</span></p>
            <p className="text-blue-900 mt-1">शाखा / Branch: <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.homeBranch || ""}</span></p>
            <p className="text-blue-900 mt-1">मोबाइल नंबर / Mobile No.:</p>
            <div className="flex gap-0.5 justify-end">
              {[0,1,2,3,4,5,6,7,8,9].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
            </div>
          </div>
        </div>

        {/* ===== ACCOUNT HOLDER NAME ===== */}
        <div className="mb-2">
          <p className="text-[6px] text-blue-900">खाता धारक (धारकों) का (के) नाम / Name of the Account Holder(s):</p>
          <p className="border-b border-dotted border-gray-400 inline-block w-full"> {data.name || ""}</p>
        </div>

        {/* ===== DARK BLUE NOTICE BAR ===== */}
        <div className="px-3 py-1 rounded mb-2 text-center" style={{ background: "#1a3a8f" }}>
          <p className="text-[7px] font-bold text-white">यह फार्म चेक नहीं है। देय केवल खाता धारक(धारकों) को ही होगा</p>
          <p className="text-[6px] text-blue-100">THIS FORM IS NOT A CHEQUE. PAYABLE TO ACCOUNT HOLDER (S) ONLY.</p>
        </div>

        {/* ===== MAIN BODY: LEFT + RIGHT ===== */}
        <div className="grid grid-cols-2 gap-2">

          {/* LEFT SIDE */}
          <div className="space-y-1">
            <p className="text-[7px] font-bold text-blue-950 text-center">कृपया मेरे / हमारे उपर्युक्त बचत बैंक खाते से राशि निकालें</p>
            <p className="text-[6px] text-blue-950 text-center font-bold">AND DEBIT THE AMOUNT TO MY / OUR ABOVE SAVINGS BANK ACCOUNT</p>

            <div className="space-y-1 mt-2">
              <label className="flex items-center gap-1">
                <span className="w-3 h-3 border border-gray-600 inline-block"></span>
                <span className="text-[6px] text-blue-900">पासबुक सहित</span>
                <span className="text-[6px] text-blue-900">With Passbook *</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="w-3 h-3 border border-gray-600 inline-block"></span>
                <span className="text-[6px] text-blue-900">आधिकारिक वैध दस्तावेज सहित</span>
                <span className="text-[6px] text-blue-900">With O.V.D</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="w-3 h-3 border border-gray-600 inline-block"></span>
                <span className="text-[6px] text-blue-900">या ग्रीन चैनल काउंटर के द्वारा</span>
                <span className="text-[6px] text-blue-900">Through GCC **</span>
              </label>
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-[6px] font-bold text-blue-900">खाता संख्या / Account Number</p>
              <div className="flex gap-0.5 flex-wrap">
                {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
              </div>

              <p className="text-[6px] text-blue-900">कृपया केवल अपने / हमारे नाम भुगतान करें / Please pay to self / us only</p>
              <p className="text-[6px] text-blue-900">रुपये / Rupees: <span className="border-b border-dotted border-gray-400 inline-block w-full"> {amountInWords || ""}</span></p>

              <div className="flex items-center gap-1">
                <span className="text-[6px] text-blue-900">पैन नंबर / PAN NO.</span>
                {[0,1,2,3,4,5,6,7,8,9].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
              </div>

              <p className="text-[6px] text-blue-900">गृह शाखा / Home Branch: <span className="border-b border-dotted border-gray-400 inline-block w-full"> {data.homeBranch || ""}</span></p>
              <p className="text-[6px] text-blue-900">ओवीडी प्रकार / OVD Type: <span className="border-b border-dotted border-gray-400 inline-block w-full"> {data.ovdType || ""}</span></p>
              <p className="text-[6px] text-blue-900">ओवीडी संख्या / OVD No.: <span className="border-b border-dotted border-gray-400 inline-block w-full"> {data.ovdNumber || ""}</span></p>
            </div>

            {/* ===== FOR OFFICE USE BOX ===== */}
            <div className="border border-gray-400 p-1 mt-2">
              <p className="text-[6px] font-bold text-blue-950 text-center">कार्यालय के उपयोग हेतु / For Office Use</p>
              <label className="flex items-center gap-1 mt-1">
                <span className="w-3 h-3 border border-gray-600 inline-block"></span>
                <span className="text-[6px] text-blue-900">भुगतान नकद करें / Pay Cash</span>
              </label>
              <p className="text-[6px] text-blue-900 mt-1">राशि शब्दों व अंकों में: <span className="border-b border-dotted border-gray-400 inline-block w-32"></span></p>
              <p className="text-[6px] text-blue-900 mt-1">स्वीकृत अधिकारी के हस्ताक्षर</p>
              <p className="text-[6px] text-blue-900">Authorised / Passing Officer's Signature</p>
              <div className="h-6 border-b border-gray-400"></div>
            </div>

            {/* ===== NOTES ===== */}
            <div className="text-[5px] text-blue-700 mt-2 space-y-0.5">
              <p>* O.V.D. - Officially Valid Document</p>
              <p>** GCC-Green Channel Counter - It is Mandatory to accompany with registered mobile number during this process.</p>
              <p>* O.V.D. - आधिकारिक वैध दस्तावेज</p>
              <p>** ग्रीन चैनल काउंटर - यह प्रक्रिया के दौरान पंजीकृत मोबाइल नंबर के साथ आना अनिवार्य है।</p>
            </div>
          </div>

          {/* RIGHT SIDE: CASH DETAILS TABLE */}
          <div>
            <div className="px-3 py-1 rounded mb-1" style={{ background: "#1a3a8f" }}>
              <p className="text-[8px] font-bold text-white text-center">नकद विवरण / CASH DETAILS</p>
            </div>
            <table className="w-full border-collapse border border-blue-900 text-[6px]">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-900 p-0.5">मूल्यवर्ग Denomination</th>
                  <th className="border border-blue-900 p-0.5">संख्या Number</th>
                  <th className="border border-blue-900 p-0.5">रु. में Rs.</th>
                  <th className="border border-blue-900 p-0.5">प. P.</th>
                </tr>
              </thead>
              <tbody>
                {["2000", "500", "100", "50", "20", "10", "5", "2", "1"].map((note) => (
                  <tr key={note}>
                    <td className="border border-blue-900 p-0.5">{note} x</td>
                    <td className="border border-blue-900 p-0.5 text-center">{data[`cash${note}`] || ""}</td>
                    <td className="border border-blue-900 p-0.5 text-center">{data[`cash${note}`] ? (num(data[`cash${note}`]) * parseInt(note)) : ""}</td>
                    <td className="border border-blue-900 p-0.5"></td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-blue-900 p-0.5">सिक्के / Coins</td>
                  <td className="border border-blue-900 p-0.5 text-center">{data.coins || ""}</td>
                  <td className="border border-blue-900 p-0.5 text-center">{data.coins || ""}</td>
                  <td className="border border-blue-900 p-0.5"></td>
                </tr>
                <tr className="bg-blue-100">
                  <td className="border border-blue-900 p-0.5 font-bold">कुल / Totals</td>
                  <td className="border border-blue-900 p-0.5"></td>
                  <td className="border border-blue-900 p-0.5 text-center font-bold">{cashTotal || data.amount || 0}</td>
                  <td className="border border-blue-900 p-0.5"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== FOOTER SIGNATURES ===== */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-400">
          <div className="text-center">
            <p className="text-[5px] text-blue-900">एसडब्ल्यूओ अधिकारी के हस्ताक्षर</p>
            <p className="text-[5px] text-blue-900">Signature of SWO</p>
            <div className="h-6 border-b border-gray-400 mt-1"></div>
          </div>
          <div className="text-center">
            <p className="text-[5px] text-blue-900">खाता धारक (धारकों) का (के) हस्ताक्षर</p>
            <p className="text-[5px] text-blue-900">Signature of the Account Holder(s)</p>
            <div className="h-6 border-b border-gray-400 mt-1"></div>
          </div>
          <div className="text-center">
            <p className="text-[5px] text-blue-900">अविनिमेय / अनन्यवयी / Not Negotiable</p>
            <div className="text-[5px] text-blue-700 text-right mt-2">200x110mm Initials C.O.S 161R</div>
            <div className="text-[5px] text-blue-700 text-right">MTL/100101080/</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DEPOSIT FORM ====================
function DepositFormPreview({ data }: { data: Record<string, string> }) {
  const cashTotal = (num(data.cash2000) * 2000) + (num(data.cash1000) * 1000) + (num(data.cash500) * 500) + (num(data.cash100) * 100) + (num(data.cash50) * 50) + (num(data.cash20) * 20) + (num(data.cash10) * 10) + (num(data.cash5) * 5) + num(data.coins);
  const amountInWords = amountToIndianWords(parseAmount(data.amount) || cashTotal);
  const displayTotal = cashTotal || parseAmount(data.amount) || 0;

  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[8px] mt-4">
      <div className="p-3">

        {/* ===== TOP SECTION ===== */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* LEFT COLUMN */}
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <Logo size={30} />
              <div className="flex gap-1">
                <span className="border border-gray-400 px-2 py-0.5 text-[6px]">PAN NO.:</span>
                {[0,1,2,3,4,5,6,7,8].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
              </div>
            </div>

            <div className="text-center mb-1">
              <p className="text-[6px] text-blue-900">OR</p>
              <p className="text-[8px] font-bold text-blue-950">Form 60</p>
            </div>

            <div className="px-3 py-1 rounded mb-2" style={{ background: "#1a3a8f" }}>
              <p className="text-[8px] font-bold text-white text-center">For Cash Deposit of ₹ 50,000/- & Above</p>
            </div>

            <p className="text-[10px] font-extrabold text-blue-950 text-center mb-2">DEPOSIT / PAY IN SLIP</p>

            <div className="space-y-1">
              <p className="text-[6px] text-blue-900">Branch: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.branch || ""}</span></p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[6px] text-blue-900">SB/CA/RD/OD/CC/TL/DL A/c No./Credit Card No.</span>
                {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
              </div>
              <p className="text-[6px] text-blue-900">Name: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.name || ""}</span></p>
              <p className="text-[6px] text-blue-900">Tel. No.: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.mobile || ""}</span></p>
              <p className="text-[6px] text-blue-900">Amount ₹: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.amount || ""}</span></p>
              <p className="text-[6px] text-blue-900">Rupees in words: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {amountInWords || ""}</span></p>
            </div>

            {/* Cash/Cheque table */}
            <table className="w-full border-collapse border border-blue-900 mt-2 text-[6px]">
              <thead><tr className="bg-blue-900 text-white"><th className="border border-blue-900 p-0.5 text-left">Cash/Cheque No./Date & Name of Bank & Branch</th><th className="border border-blue-900 p-0.5 w-12">₹</th><th className="border border-blue-900 p-0.5 w-8">P.</th></tr></thead>
              <tbody>
                <tr><td className="border border-blue-900 h-4"></td><td className="border border-blue-900"></td><td className="border border-blue-900"></td></tr>
                <tr><td className="border border-blue-900 h-4"></td><td className="border border-blue-900"></td><td className="border border-blue-900"></td></tr>
                <tr><td className="border border-blue-900 h-4"></td><td className="border border-blue-900"></td><td className="border border-blue-900"></td></tr>
                <tr className="bg-blue-100"><td className="border border-blue-900 text-right font-bold pr-1">Total</td><td className="border border-blue-900 text-center font-bold">{displayTotal}</td><td className="border border-blue-900"></td></tr>
              </tbody>
            </table>

            <p className="text-[6px] text-blue-900 mt-1">SWO / Passing Officer</p>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <div className="px-3 py-1 rounded mb-2" style={{ background: "#1a3a8f" }}>
              <p className="text-[8px] font-bold text-white text-center">CASH DEPOSIT</p>
            </div>

            <table className="w-full border-collapse border border-blue-900 text-[6px] mb-2">
              <thead><tr className="bg-blue-900 text-white"><th className="border border-blue-900 p-0.5 text-left w-20">Notes No.</th><th className="border border-blue-900 p-0.5">₹</th><th className="border border-blue-900 p-0.5 w-8">P.</th></tr></thead>
              <tbody>
                {["2000", "1000", "500", "100", "50", "20", "10", "5"].map((note) => (
                  <tr key={note}><td className="border border-blue-900 p-0.5">{note} x</td><td className="border border-blue-900 p-0.5 text-center">{data[`cash${note}`] || ""}</td><td className="border border-blue-900 p-0.5"></td></tr>
                ))}
                <tr><td className="border border-blue-900 p-0.5">Coins</td><td className="border border-blue-900 p-0.5 text-center">{data.coins || ""}</td><td className="border border-blue-900 p-0.5"></td></tr>
                <tr className="bg-blue-100"><td className="border border-blue-900 p-0.5 font-bold">Total</td><td className="border border-blue-900 p-0.5 text-center font-bold">{displayTotal}</td><td className="border border-blue-900 p-0.5"></td></tr>
              </tbody>
            </table>

            <div className="px-3 py-1 rounded mb-1" style={{ background: "#1a3a8f" }}>
              <p className="text-[7px] font-bold text-white">Miscellaneous Instructions</p>
            </div>
            <ul className="text-[5px] text-blue-700 space-y-0.5 list-disc pl-3">
              <li>Please get your Pass Book updated once in a month.</li>
              <li>Do not disclose your Account details/Internet Banking User ID and Passwords/ATM Debit Card/Credit Card/Mobile Banking/Personal Information to any person.</li>
              <li>All charges/stipulations are subject to change from time to time. Please visit Bank's website www.banksaarthi.com for further information.</li>
              <li>For Cash Deposit exceeding ₹ 50000/-, please mention your PAN No. or submit signed copy of Form 60.</li>
              <li>The customer is obliged to ensure that the details on the deposit slip are accurate and match with the details of the cheque/instrument/cash.</li>
              <li>Do not fall prey to false promises, beware of dubious schemes.</li>
            </ul>
          </div>
        </div>

        {/* ===== DIVIDER ===== */}
        <div className="border-t-2 border-dashed border-gray-400 my-2"></div>

        {/* ===== LOWER DEPOSIT SLIP ===== */}
        <div className="px-3 py-1 rounded mb-2" style={{ background: "#eef2ff" }}>
          <p className="text-[9px] font-extrabold text-blue-950 text-center">DEPOSIT / PAY IN SLIP</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-1">
            <p className="text-[6px] text-blue-900">Branch: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.branch || ""}</span></p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">SB/CA/RD/OD/CC/TL/DL A/c No./Credit Card No.</span>
              {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
            </div>
            <p className="text-[6px] text-blue-900">Name: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.name || ""}</span></p>
            <p className="text-[6px] text-blue-900">Tel. No./Mobile No.: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.mobile || ""}</span></p>
            <p className="text-[6px] text-blue-900">E-mail ID: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.email || ""}</span></p>
            <p className="text-[6px] text-blue-900">Rupees in words: <span className="border-b border-dotted border-gray-400 inline-block w-32"> {amountInWords || ""}</span></p>

            <table className="w-full border-collapse border border-blue-900 text-[6px] mt-2">
              <thead><tr className="bg-blue-900 text-white"><th className="border border-blue-900 p-0.5 text-left">Cheque No./Date/Name of Bank & Branch</th><th className="border border-blue-900 p-0.5 w-12">₹</th><th className="border border-blue-900 p-0.5 w-8">P.</th></tr></thead>
              <tbody>
                <tr><td className="border border-blue-900 h-4"></td><td className="border border-blue-900"></td><td className="border border-blue-900"></td></tr>
                <tr><td className="border border-blue-900 h-4"></td><td className="border border-blue-900"></td><td className="border border-blue-900"></td></tr>
                <tr className="bg-blue-100"><td className="border border-blue-900 text-right font-bold pr-1">Total</td><td className="border border-blue-900 text-center font-bold">{displayTotal}</td><td className="border border-blue-900"></td></tr>
              </tbody>
            </table>

            <div className="flex justify-between mt-2">
              <p className="text-[6px] text-blue-900">Signature of Depositor: <span className="border-b border-dotted border-gray-400 inline-block w-32"></span></p>
              <p className="text-[6px] text-blue-900">Date: <span className="border-b border-dotted border-gray-400 inline-block w-24"></span></p>
            </div>
          </div>

          <div>
            <div className="border border-gray-400 p-1">
              <p className="text-[6px] font-bold text-blue-950">Transaction ID</p>
              <div className="h-12 border-b border-gray-300"></div>
            </div>
            <div className="border border-gray-400 p-1 mt-2">
              <p className="text-[6px] font-bold text-blue-950">SWO</p>
              <p className="text-[6px] text-blue-700">Passing Officer</p>
              <div className="h-12 border-b border-gray-300"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== KYC FORM ====================
function KycFormPreview({ data, t }: { data: Record<string, string>; t: Record<string, string> }) {
  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[8px] mt-4">

      {/* ===== PAGE 1 STARTS ===== */}
      <div className="p-3">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between border-b border-gray-400 pb-1 mb-2">
          <p className="text-[7px] font-bold text-blue-950">Annexure B</p>
          <p className="text-[10px] font-extrabold text-blue-950 tracking-wide">KYC UPDATION FORM INDIVIDUAL</p>
          <Logo size={30} />
        </div>

        {/* ===== TOP INFO ===== */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="col-span-2 space-y-1">
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Branch Name: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[120px]"> {data.branch || ""}</span></p>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Customer ID: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[120px]"> {data.customerId || ""}</span></p>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Account No.: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[120px]"> {data.accountNo || ""}</span></p>
            <p className="text-[5px] text-blue-700 italic">Fields marked asterisk (*) are mandatory. Please fill up in BLOCK letters only and use black ink for signature (For office use only)</p>
          </div>
          <div className="space-y-1">
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Branch Code: <span className="border-b border-dotted border-gray-400 flex-1"> {data.branchCode || ""}</span></p>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Date: <span className="border-b border-dotted border-gray-400 flex-1"> {new Date().toLocaleDateString("en-IN")}</span></p>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">CKYC No.: <span className="border-b border-dotted border-gray-400 flex-1"> {data.ckycNo || ""}</span></p>
            <div className="border border-gray-400 p-1">
              <p className="text-[5px] text-blue-700 italic">Name: Branch to affix rubber stamp of name and code no.</p>
            </div>
          </div>
        </div>

        {/* ===== SECTION A: PERSONAL DETAILS ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">A. Personal Details</p>
          </div>
          <div className="p-1.5 space-y-1">
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Existing Customer ID (If applicable): <span className="border-b border-dotted border-gray-400 flex-1 min-w-[200px]"> {data.existingCustomerId || ""}</span></p>
            
            <div className="flex items-end gap-1">
              <span className="text-[6px] text-blue-900">Name*</span>
              <span className="text-[5px] text-blue-700">(Same as ID Proof)</span>
              <span className="border-b border-dotted border-gray-400 flex-1"> {data.name || ""}</span>
            </div>
            
            <div className="flex items-end gap-1">
              <span className="text-[6px] text-blue-900">Prefix</span>
              <span className="border-b border-dotted border-gray-400 w-20"> {data.prefix || ""}</span>
            </div>
            
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Maiden Name: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.maidenName || ""}</span></p>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Date of Birth*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.dob || ""}</span>
              <span className="text-[6px] text-blue-900">Gender*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Male</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Female</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Transgender</span>
              <span className="text-[6px] text-blue-900">Marital Status*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Married</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Unmarried</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Others</span>
            </div>
            
            <div>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Name of Father/Mother: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.fatherOrMotherName || ""}</span></p>
              <p className="text-[5px] text-blue-700">Spouse* (Please Tick One) — (Father's name is mandatory if PAN is not provided)</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">No. of Dependents: <span className="border-b border-dotted border-gray-400 inline-block w-16"> {data.dependents || ""}</span></span>
              <span className="text-[6px] text-blue-900">Illiterate:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">YES</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">NO</span>
              <span className="text-[5px] text-blue-700">(if yes: identification Marks)</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.identificationMarks || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Name of Guardian:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.guardianName || ""}</span>
              <span className="text-[5px] text-blue-700">(In Case of Minor)</span>
              <span className="text-[6px] text-blue-900">Prefix</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-16"> {data.guardianPrefix || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Relationship with Guardian:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.guardianRel || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Nationality*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Indian</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Others</span>
              <span className="text-[6px] text-blue-900">Country Name:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.countryName || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Occupation Type*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">S Service</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">P Private Sector</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">G Government Sector</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">O Others</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Professional</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Self employed</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Retired</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">House Wife</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Student</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">B Business</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">X Not categorised</span>
              <span className="text-[5px] text-blue-700">Please specify</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.occupationOther || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Monthly Income*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-16"> {data.monthlyIncome || ""}</span>
              <span className="text-[5px] text-blue-700">Rs.</span>
              <span className="text-[6px] text-blue-900">Net Worth (approx value) Rs.</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.netWorth || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Source of Income:</span>
              <span className="text-[5px] text-blue-700">(More than one acceptable)</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Salary</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Business Income</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Agriculture</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Investment Income</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Pension</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Others</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.sourceOther || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Religion:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Hindu</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Muslim</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Christian</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Sikh</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Others</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.religionOther || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Category:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">General</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">OBC</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">SC</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">ST</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Person with disability:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Yes</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">No</span>
              <span className="text-[6px] text-blue-900">If Yes:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">i. Visually impaired</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">ii. Differently abled</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Educational Qualification:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Below SSC</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">SSC</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">HSC</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Graduate</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Post Graduate</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Professional</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Others</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Organization's Name:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.organizationName || ""}</span>
              <span className="text-[6px] text-blue-900">Designation/Profession:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.designation || ""}</span>
              <span className="text-[6px] text-blue-900">Nature of Business:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.natureOfBusiness || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Please Tick the Applicable box*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Politically exposed Person</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Related to politically Exposed Person</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">None</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">ISO 3166 Country Code of Jurisdiction of Residence*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-20"> {data.isoResidence || ""}</span>
              <span className="text-[5px] text-blue-700">(Code for India is IN)</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Place/City of Birth*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.placeOfBirth || ""}</span>
              <span className="text-[6px] text-blue-900">ISO 3166 Country Code of Birth*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-16"> {data.isoBirth || ""}</span>
              <span className="text-[6px] text-blue-900">Citizenship:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-16"> {data.citizenship || ""}</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Country of Tax Residence in India only and not in any other country or territory outside India*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Yes</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">No</span>
              <span className="text-[5px] text-blue-700">(If No, please fill the FATCA details form - Annexure I)</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">PAN*/Tax Identification Number or equivalent (If issued by jurisdiction):</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.pan || ""}</span>
              <span className="text-[5px] text-blue-700">(If PAN is not submitted, submit Form 60 - Annexure I)</span>
            </div>
          </div>
        </div>

        {/* ===== SECTION B: CONTACT DETAILS ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">B. Contact Details (All communications will be sent to provided Mobile No. and Email ID)</p>
          </div>
          <div className="p-1.5 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[6px] text-blue-900">Mobile No.:</span>
              {[0,1,2,3,4,5,6,7,8,9].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
            </div>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Email ID: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.email || ""}</span></p>
          </div>
        </div>
      </div>
      {/* ===== PAGE 1 ENDS ===== */}

      {/* ===== PAGE 2 STARTS ===== */}
      <div className="p-3 border-t-2 border-dashed border-gray-400">

        {/* ===== SECTION 4: PROOF OF IDENTITY ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">4. Proof of Identity/Address (Please tick the applicable box) (Copy of any one (1) type) and give details*</p>
          </div>
          <div className="p-1.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">A. PASSPORT</span></div>
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">B. VOTER'S IDENTITY CARD</span></div>
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">C. DRIVING LICENCE</span></div>
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">D. UID (AADHAAR)</span></div>
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">E. NREGA JOB CARD</span></div>
              <div className="flex items-center gap-1"><span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">F. LETTER ISSUED BY NPR CONTAINING NAME & ADDRESS</span></div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[6px] text-blue-900">Document No./Identification Number*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-32"> {data.docNumber || ""}</span>
              <span className="text-[6px] text-blue-900">Issue Date*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.issueDate || ""}</span>
              <span className="text-[6px] text-blue-900">Expiry Date (If applicable)*:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.expiryDate || ""}</span>
            </div>
          </div>
        </div>

        {/* ===== SECTION 5A: ADDRESS DETAILS ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">5. A. Address details — □ Current □ Permanent □ Overseas</p>
          </div>
          <div className="p-1.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Address type*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Residential/Business</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Residential</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Business</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Registered Office</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Unspecified</span>
            </div>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Address*: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[200px]"> {data.address || ""}</span></p>
            <div className="grid grid-cols-3 gap-2">
              <p className="text-[6px] text-blue-900 flex items-end gap-1">City/Village*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.city || ""}</span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">District*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.district || ""}</span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Pin*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.pincode || ""}</span></p>
            </div>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">State*: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.state || ""}</span></p>
          </div>
        </div>

        {/* ===== SECTION 5B: ADDRESS DETAILS (SECOND) ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">5. B. Address details — □ Current □ Permanent □ Overseas</p>
          </div>
          <div className="p-1.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Address type*:</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Residential/Business</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Residential</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Business</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Registered Office</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Unspecified</span>
            </div>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">Address*: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[200px]"> {data.address2 || ""}</span></p>
            <div className="grid grid-cols-3 gap-2">
              <p className="text-[6px] text-blue-900 flex items-end gap-1">City/Village*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.city2 || ""}</span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">District*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.district2 || ""}</span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Pin*: <span className="border-b border-dotted border-gray-400 flex-1"> {data.pincode2 || ""}</span></p>
            </div>
            <p className="text-[6px] text-blue-900 flex items-end gap-1">State*: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.state2 || ""}</span></p>
          </div>
        </div>

        {/* ===== SECTION 6: PROOF OF ADDRESS ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">6. If the Proof of Address (OVD) provided does not contain current address, please provide any of the documents below:</p>
          </div>
          <div className="p-1.5 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Utility Bill</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">PPO/PPO</span>
              <span className="text-[7px]">■</span><span className="text-[6px] text-blue-900">Property or Municipal tax receipt</span>
            </div>
            <p className="text-[6px] text-blue-900">Letter of allotment of accommodation issued by employer issued by State or Central Government departments, statutory or regulatory bodies, Public sector undertakings, scheduled commercial banks, financial institutions and listed companies. Similarly, leave and license agreements with such employers allotting official accommodation.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[6px] text-blue-900">Document No.:</span>
              {[0,1,2,3,4,5,6,7].map(i => <span key={i} className="border border-gray-400 w-3 h-4 inline-block"></span>)}
              <span className="text-[6px] text-blue-900">Date:</span>
              <span className="border-b border-dotted border-gray-400 inline-block w-24"> {data.docDate || ""}</span>
            </div>
          </div>
        </div>

        {/* ===== SECTION 7: DECLARATION ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">7. DECLARATION CUM UNDERTAKING CUM SELF CERTIFICATION</p>
          </div>
          <div className="p-1.5 space-y-1">
            <p className="text-[6px] text-blue-700">I have read the copy of Terms and Conditions of the Account Opening given to me. The Terms and Conditions have been explained to me and have understood. I accept the same.</p>
            <p className="text-[6px] text-blue-700">1. I hereby declare that I have submitted the Aadhaar Card issued by UIDAI voluntarily for identification and / or address proof towards the compliance of KYC norms under the PMLA, 2002.</p>
            <p className="text-[6px] text-blue-700">2. I hereby consent that the bank may verify the same with UIDAI and the UIDAI explicitly reserves the liberty and address through biometric authentication to the Bank.</p>
            <p className="text-[6px] text-blue-700">3. I agree that my personal KYC details may be shared with Central KYC registry or any other competent authority. I hereby consent to receive information from the Bank/Central KYC Registry/CKYC Bill or other authority through SMS/e-mail on my registered mobile number / e-mail address. I also agree that the said on receipt any such SMS/e-mail shall not make the Bank liable for any loss or damage whatsoever in nature.</p>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="border border-gray-400 p-1 h-20">
                <p className="text-[5px] text-blue-700">Photo / Signature</p>
                <p className="text-[5px] text-blue-700 mt-1">Thumb Impression (If illiterate)</p>
                <p className="text-[5px] text-blue-700 mt-1">Name (in Full)</p>
                <p className="text-[5px] text-blue-700 mt-1">(Not for use by Bank)</p>
              </div>
              <div className="border border-gray-400 p-1 h-20"></div>
              <div className="border border-gray-400 p-1 h-20">
                <p className="text-[5px] text-blue-700">Signature / Thumb impression of the Applicant</p>
                <p className="text-[5px] text-blue-700 mt-1">(Please sign in black ink only)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Place: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {data.place || ""}</span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Date: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"> {new Date().toLocaleDateString("en-IN")}</span></p>
            </div>
          </div>
        </div>

        {/* ===== SECTION 9: FOR OFFICE USE ONLY ===== */}
        <div className="border border-gray-400 mb-2">
          <div className="px-2 py-0.5 border-b border-gray-400" style={{ background: "#1a3a8f" }}>
            <p className="text-[8px] font-extrabold text-white">9. FOR OFFICE USE / INFORMATION</p>
          </div>
          <div className="p-1.5 space-y-1">
            <p className="text-[6px] text-blue-900">1. PAN details (if available) have been verified from database issuing authority.</p>
            <p className="text-[6px] text-blue-900">2. Information submitted by the customer verified & updated in the CBS.</p>
            <p className="text-[6px] text-blue-900">3. KYC updation date entered in CBS.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Maker: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"></span></p>
              <p className="text-[6px] text-blue-900 flex items-end gap-1">Checker: <span className="border-b border-dotted border-gray-400 flex-1 min-w-[150px]"></span></p>
            </div>
          </div>
        </div>
      </div>
      {/* ===== PAGE 2 ENDS ===== */}
    </div>
  );
}

// ==================== ACCOUNT FORM ====================
function AccountFormPreview({ data, t }: { data: Record<string, string>; t: Record<string, string> }) {
  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[9px] mt-4">
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-blue-900/70" style={{ background: "#eef2ff" }}>
        <div className="flex items-center gap-2"><Logo size={30} /><div><p className="text-[8px] font-bold text-blue-400 tracking-widest">banksaarthi</p><p className="text-[10px] font-extrabold text-blue-950">ACCOUNT OPENING FORM</p></div></div>
        <div className="text-right"><p className="font-bold text-blue-950">Date: {new Date().toLocaleDateString("en-IN")}</p></div>
      </div>
      <div className="px-3 py-1 border-b border-blue-900/70 text-[7px] font-bold text-blue-700" style={{ background: "#f8fafc" }}><p>Please fill the form in BLOCK LETTERS. Fields marked * are mandatory.</p></div>
      <FormSectionBar n="1" title="ACCOUNT & CUSTOMER DETAILS" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <FormField label="Application / Reference No." value={data.refNo} />
        <FormField label="Date" value={new Date().toLocaleDateString("en-IN")} />
        <div className="col-span-2"><CheckboxRow label="Account Type" options={["Savings", "Current", "Basic Savings"]} value={data.accountType} /></div>
        <div className="col-span-2"><CheckboxRow label="Mode" options={["Single", "Joint"]} value={data.accountMode} /></div>
        <FormField label="Full Name *" value={data.name} wide />
        <div className="col-span-2"><CheckboxRow label="Gender" options={["Male", "Female", "Other"]} value={data.gender} /></div>
        <FormField label="Father's / Mother's / Spouse Name" value={data.fatherOrMotherName} />
        <FormField label="Date of Birth" value={data.dob} />
        <FormField label="Nationality" value={data.nationality} />
        <div className="col-span-2"><CheckboxRow label="Marital Status" options={["Single", "Married", "Other"]} value={data.maritalStatus} /></div>
      </div>
      <FormSectionBar n="2" title="CONTACT & ADDRESS DETAILS" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <FormField label="Mobile Number *" value={data.mobile} />
        <FormField label="Email" value={data.email} />
        <FormField label="Current Address *" value={data.address} wide />
        <FormField label="PIN Code" value={data.pincode} />
        <FormField label="City" value={data.city} />
        <FormField label="State" value={data.state} />
      </div>
      <FormSectionBar n="3" title="KYC / IDENTITY DETAILS" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <FormField label="Aadhaar / VID No." value={data.aadhaar} />
        <FormField label="PAN No." value={data.pan} />
        <FormField label="Other ID / Document" value={data.otherId} />
        <FormField label="Document No." value={data.docNo} />
      </div>
      <FormSectionBar n="4" title="OCCUPATION & FINANCIAL DETAILS" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <div className="col-span-2"><CheckboxRow label="Occupation" options={["Salaried", "Business", "Student", "Self-employed", "Other"]} value={data.occupation} /></div>
        <FormField label="Annual Income" value={data.annualIncome} />
        <FormField label="Source of Funds" value={data.sourceFunds} />
        <FormField label="Employer / Business Name" value={data.employerName} />
      </div>
      <FormSectionBar n="5" title="NOMINEE DETAILS" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <FormField label="Nominee Name" value={data.nomineeName} />
        <FormField label="Relationship" value={data.nomineeRel} />
        <FormField label="Nominee Date of Birth" value={data.nomineeDob} />
        <FormField label="Mobile" value={data.nomineeMobile} />
        <FormField label="Nominee Address" value={data.nomineeAddress} wide />
      </div>
      <FormSectionBar n="6" title="SERVICES & COMMUNICATION" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <div className="col-span-2"><CheckboxRow label="Services" options={["Debit / ATM Card", "Internet Banking", "Mobile Banking", "SMS Alerts"]} value={data.services} /></div>
        <div className="col-span-2"><CheckboxRow label="Statement Preference" options={["Physical", "Email", "Digital"]} value={data.statementPref} /></div>
        <div className="col-span-2"><CheckboxRow label="Communication" options={["English", "Hindi", "Regional"]} value={data.communication} /></div>
      </div>
      <FormSectionBar n="7" title="DOCUMENT CHECKLIST" />
      <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-blue-900/70">
        <div className="col-span-2"><CheckboxRow label="Checklist" options={["Identity Proof", "Address Proof", "PAN / Form 60", "Photograph", "Other"]} value={data.checklist} /></div>
      </div>
      <FormSectionBar n="8" title="DECLARATION" />
      <div className="px-3 py-3" style={{ background: "#f8fafc" }}>
        <p className="text-blue-600 text-[9px] leading-relaxed">{t.acc_declare_txt}</p>
        <div className="flex justify-between items-end mt-4 pt-2 border-t border-dashed border-blue-300">
          <div className="text-[8px] text-blue-400">Place<div className="w-24 border-b-2 border-blue-900/70 mt-3" /></div>
          <div className="text-[8px] text-blue-400">Date<div className="w-16 border-b-2 border-blue-900/70 mt-3" /></div>
          <div className="text-[8px] text-blue-400">Customer Signature<div className="w-24 border-b-2 border-blue-900/70 mt-3" /></div>
        </div>
      </div>
    </div>
  );
}

// ==================== FORM 15G/15H PREVIEW ====================
function Form15Preview({ data, files }: { data: Record<string, string>; files: Record<string, File | null> }) {
  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[9px] mt-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-blue-900/70" style={{ background: "#fff" }}>
        <div className="flex items-center gap-2">
          <Logo size={35} />
          <div>
            <p className="text-[9px] font-bold text-green-600 tracking-widest">banksaarthi</p>
            <p className="text-[7px] text-gray-500">Your Banking. Our Guidance.</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-bold text-blue-950">CUSTOMER ID:</span>
          {[1,2,3,4,5,6,7,8].map(i => <span key={i} className="w-3 h-4 border border-gray-400"></span>)}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded" style={{ background: "#1a3a8f" }}>
          <div>
            <p className="text-[9px] font-extrabold text-white">Form 15G / 15H</p>
            <p className="text-[6px] text-blue-100">Claim tax exemption on interest income</p>
          </div>
          <span className="text-white text-lg">📄</span>
        </div>
      </div>

      {/* ===== SECTION 1: CUSTOMER DETAILS ===== */}
      <div className="border-b-2 border-blue-900/70">
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
          <span className="text-blue-900 text-sm">👤</span>
          <div>
            <p className="text-[9px] font-extrabold text-blue-950">Customer Details</p>
            <p className="text-[6px] text-blue-500">Please provide your basic details for Form 15G / 15H submission.</p>
          </div>
        </div>
        <div className="p-2 grid grid-cols-5 gap-1.5">
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Holder Name <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.name || "Enter account holder name"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Number <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.accountNo || "Enter account number"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Mobile Number <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.mobile || "Enter 10 digit mobile number"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Email ID</p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.email || "Enter email address"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Date of Birth <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">{data.dob || "DD / MM / YYYY"}</span><span className="text-[7px]">📅</span></div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: Form Selection + Account & PAN Details ===== */}
      <div className="grid grid-cols-2 gap-0 border-b-2 border-blue-900/70">
        {/* LEFT: Form Selection */}
        <div className="border-r-2 border-blue-900/70">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">📋</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Form Selection</p>
              <p className="text-[6px] text-blue-500">Select the applicable form and provide the required details.</p>
            </div>
          </div>
          <div className="p-2 flex gap-4">
            <label className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-blue-900 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span></span>
              <div>
                <span className="text-[7px] font-bold text-blue-950">Form 15G</span>
                <span className="text-[6px] text-blue-500"> (For individuals below 60 years)</span>
              </div>
            </label>
            <label className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-gray-400"></span>
              <div>
                <span className="text-[7px] font-bold text-blue-950">Form 15H</span>
                <span className="text-[6px] text-blue-500"> (For senior citizens 60 years & above)</span>
              </div>
            </label>
          </div>
        </div>

        {/* RIGHT: Account & PAN Details */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">💳</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Account & PAN Details</p>
              <p className="text-[6px] text-blue-500">Provide your account and PAN information.</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Financial Year <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">{data.financialYear || "Select Financial Year"}</span><span className="text-[7px]">▼</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">PAN Number <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.pan || "Enter PAN number"}</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Holder Type <span className="text-red-500">*</span></p>
              <div className="flex gap-3 mt-0.5">
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-900 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span></span>
                  <span className="text-[7px] text-blue-950">Individual</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-400"></span>
                  <span className="text-[7px] text-blue-950">HUF / Others</span>
                </label>
              </div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Number <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.accountNo || "Enter account number"}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: Income Details + Additional Information ===== */}
      <div className="grid grid-cols-2 gap-0 border-b-2 border-blue-900/70">
        {/* LEFT: Income Details */}
        <div className="border-r-2 border-blue-900/70">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">💰</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Income Details</p>
              <p className="text-[6px] text-blue-500">Provide your estimated income and other relevant details.</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-3 gap-1.5">
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Estimated Interest Income (for the year) <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.interestIncome ? `₹ ${data.interestIncome}` : "Enter amount (in ₹)"}</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Estimated Total Income (for the year) <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.totalIncome ? `₹ ${data.totalIncome}` : "Enter amount (in ₹)"}</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Source of Income <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">Select source of income</span><span className="text-[7px]">▼</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Additional Information */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">ℹ️</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Additional Information</p>
              <p className="text-[6px] text-blue-500">Provide any other relevant details (if applicable).</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-3 gap-1.5">
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Residential Status <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">Select residential status</span><span className="text-[7px]">▼</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Last 4 Digits of Bank Account No. <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.accountNo ? data.accountNo.slice(-4) : "Enter last 4 digits"}</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Is this the only account? <span className="text-red-500">*</span></p>
              <div className="flex gap-3 mt-0.5">
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-900 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span></span>
                  <span className="text-[7px] text-blue-950">Yes</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-400"></span>
                  <span className="text-[7px] text-blue-950">No</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: Document Upload + Declaration ===== */}
      <div className="grid grid-cols-2 gap-0 border-b-2 border-blue-900/70">
        {/* LEFT: Document Upload */}
        <div className="border-r-2 border-blue-900/70">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">📁</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Document Upload</p>
              <p className="text-[6px] text-blue-500">Please upload the required documents in PDF/JPG/PNG format (max 2 MB each).</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-4 gap-1.5">
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 PAN Card <span className="text-red-500">*</span></p>
              <p className="text-[5px] text-blue-500">(PDF/JPG/PNG – Max 2 MB)</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
            </div>
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 Form 15G / 15H <span className="text-red-500">*</span></p>
              <p className="text-[5px] text-blue-500">(Filled & Signed – PDF/JPG/PNG)</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
            </div>
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 Income Proof <span className="text-gray-400">(Optional)</span></p>
              <p className="text-[5px] text-blue-500">(Salary slip / Form 16 / Others)</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
            </div>
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 Other Document <span className="text-gray-400">(Optional)</span></p>
              <p className="text-[5px] text-blue-500">(Any relevant document)</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Declaration */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">🛡️</span>
            <p className="text-[9px] font-extrabold text-blue-950">Declaration</p>
          </div>
          <div className="p-2">
            <p className="text-[6px] text-blue-700 leading-relaxed">I hereby declare that the information provided above is true and correct to the best of my knowledge and belief. I understand that the bank may verify the details as per applicable rules and regulations.</p>
            <label className="flex items-center gap-1 mt-3">
              <span className="w-3 h-3 border border-blue-900 rounded-sm bg-blue-900 text-white text-[8px] flex items-center justify-center">✓</span>
              <span className="text-[6px] font-bold text-blue-950">I agree to the terms and conditions <span className="text-red-500">*</span></span>
            </label>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-start gap-1">
          <span className="text-blue-900 text-[10px]">ℹ️</span>
          <p className="text-[6px] text-blue-700"><span className="font-bold">Note:</span> Please ensure all documents are clear and valid. Incomplete or incorrect information may lead to delay or rejection of your request.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-[7px] font-bold text-white flex items-center gap-1" style={{ background: "#1a3a8f" }}>➤ Submit Form</button>
          <button className="px-3 py-1 rounded text-[7px] font-bold text-blue-900 border border-blue-900">Reset</button>
        </div>
      </div>
    </div>
  );
}
function MobileBankingPreview({ data, files }: { data: Record<string, string>; files: Record<string, File | null> }) {
  return (
    <div className="rounded-md border-2 border-blue-900/70 bg-white overflow-hidden shadow-sm text-[9px] mt-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-blue-900/70" style={{ background: "#fff" }}>
        <div className="flex items-center gap-2">
          <Logo size={35} />
          <div>
            <p className="text-[9px] font-bold text-green-600 tracking-widest">banksaarthi</p>
            <p className="text-[7px] text-gray-500">Your Banking. Our Guidance.</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-bold text-blue-950">CUSTOMER ID:</span>
          {[1,2,3,4,5,6,7,8].map(i => <span key={i} className="w-3 h-4 border border-gray-400"></span>)}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded" style={{ background: "#1a3a8f" }}>
          <div>
            <p className="text-[9px] font-extrabold text-white">Mobile Banking Activation</p>
            <p className="text-[6px] text-blue-100">Activate your mobile & internet banking services</p>
          </div>
          <span className="text-white text-lg">📱</span>
        </div>
      </div>

      {/* ===== SECTION 1: CUSTOMER DETAILS ===== */}
      <div className="border-b-2 border-blue-900/70">
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
          <span className="text-blue-900 text-sm">👤</span>
          <div>
            <p className="text-[9px] font-extrabold text-blue-950">Customer Details</p>
            <p className="text-[6px] text-blue-500">Please provide your basic details for verification and activation.</p>
          </div>
        </div>
        <div className="p-2 grid grid-cols-5 gap-1.5">
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Holder Name <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.name || "Enter account holder name"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Number <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.accountNo || "Enter account number"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Mobile Number <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.mobile || "Enter 10 digit mobile number"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Email ID</p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.email || "Enter email address"}</span></div>
          </div>
          <div>
            <p className="text-[6px] font-bold text-blue-900 mb-0.5">Date of Birth <span className="text-red-500">*</span></p>
            <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">{data.dob || "DD / MM / YYYY"}</span><span className="text-[7px]">📅</span></div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: Mobile Banking Details (LEFT) + Account Verification (RIGHT) ===== */}
      <div className="grid grid-cols-2 gap-0 border-b-2 border-blue-900/70">
        {/* LEFT: Mobile Banking Details */}
        <div className="border-r-2 border-blue-900/70">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">📱</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Mobile Banking Details</p>
              <p className="text-[6px] text-blue-500">Select the services you want to activate and provide the required information.</p>
            </div>
          </div>
          <div className="p-2 space-y-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-1">
                <span className="w-3 h-3 border border-blue-900 rounded-sm bg-blue-900 text-white text-[8px] flex items-center justify-center">✓</span>
                <div>
                  <span className="text-[7px] font-bold text-blue-950">Mobile Banking</span>
                  <p className="text-[5px] text-blue-500">Access your account via mobile app</p>
                </div>
              </label>
              <label className="flex items-center gap-1">
                <span className="w-3 h-3 border border-blue-900 rounded-sm bg-blue-900 text-white text-[8px] flex items-center justify-center">✓</span>
                <div>
                  <span className="text-[7px] font-bold text-blue-950">Internet Banking</span>
                  <p className="text-[5px] text-blue-500">Manage your account online</p>
                </div>
              </label>
            </div>
            <div>
              <p className="text-[7px] font-bold text-blue-950 mb-1">Registered Mobile Number <span className="text-red-500">*</span></p>
              <div className="flex gap-4 mb-1">
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-900 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span></span>
                  <span className="text-[7px] text-blue-950">Registered Mobile Number</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-400"></span>
                  <span className="text-[7px] text-blue-950">Other Mobile Number</span>
                </label>
              </div>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.mobile || "Enter mobile number"}</span></div>
            </div>
            <label className="flex items-start gap-1">
              <span className="w-3 h-3 border border-blue-900 rounded-sm bg-blue-900 text-white text-[8px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
              <span className="text-[6px] text-blue-700">I hereby declare that I wish to activate Mobile and/or Internet Banking services for my account and I have read and understood the terms and conditions.</span>
            </label>
          </div>
        </div>

        {/* RIGHT: Account Verification */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">📄</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Account Verification</p>
              <p className="text-[6px] text-blue-500">Please provide additional details for verification.</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">IFSC Code <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.ifsc || "Enter IFSC code"}</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">PAN Number <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">{data.pan || "Enter PAN number"}</span></div>
            </div>
            <div className="col-span-2">
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Preferred Account Type <span className="text-red-500">*</span></p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-900 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span></span>
                  <span className="text-[7px] text-blue-950">Savings Account</span>
                </label>
                <label className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-gray-400"></span>
                  <span className="text-[7px] text-blue-950">Current Account</span>
                </label>
              </div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Branch Name <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">{data.branch || "Select branch"}</span><span className="text-[7px]">▼</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Account Type <span className="text-red-500">*</span></p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">Select account type</span><span className="text-[7px]">▼</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Customer Relationship (Optional)</p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50 flex justify-between"><span className="text-[7px] text-blue-950">Select relationship</span><span className="text-[7px]">▼</span></div>
            </div>
            <div>
              <p className="text-[6px] font-bold text-blue-900 mb-0.5">Last 4 Digits of Debit Card (Optional)</p>
              <div className="border border-gray-300 rounded px-1 py-0.5 bg-gray-50"><span className="text-[7px] text-blue-950">Enter last 4 digits</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: Document Upload (LEFT) + Declaration (RIGHT) ===== */}
      <div className="grid grid-cols-2 gap-0 border-b-2 border-blue-900/70">
        {/* LEFT: Document Upload */}
        <div className="border-r-2 border-blue-900/70">
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">📁</span>
            <div>
              <p className="text-[9px] font-extrabold text-blue-950">Document Upload</p>
              <p className="text-[6px] text-blue-500">Please upload the required documents (PDF/JPG/PNG - Max 2 MB each).</p>
            </div>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2">
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 PAN Card <span className="text-red-500">*</span></p>
              <p className="text-[6px] text-blue-500">Upload a clear copy of your PAN Card.</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
              <p className="text-[5px] text-gray-400 text-center mt-0.5">(PDF, JPG, PNG – Max 2 MB)</p>
            </div>
            <div className="border-2 border-dashed border-blue-300 rounded p-1.5 bg-blue-50">
              <p className="text-[7px] font-bold text-blue-950">📄 Address Proof <span className="text-red-500">*</span></p>
              <p className="text-[6px] text-blue-500">(Aadhaar / Utility Bill / Others)</p>
              <div className="border border-gray-300 rounded mt-1 py-1 flex items-center justify-center gap-1 bg-white">
                <span className="text-[7px]">⬆️</span>
                <span className="text-[6px] text-blue-700 font-bold">Choose File</span>
                <span className="text-[6px] text-gray-500">or Drag & Drop</span>
              </div>
              <p className="text-[5px] text-gray-400 text-center mt-0.5">(PDF, JPG, PNG – Max 2 MB)</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Declaration */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "#eef2ff" }}>
            <span className="text-blue-900 text-sm">🛡️</span>
            <p className="text-[9px] font-extrabold text-blue-950">Declaration</p>
          </div>
          <div className="p-2">
            <p className="text-[6px] text-blue-700 leading-relaxed">I hereby declare that the information provided above is true and correct to the best of my knowledge and belief. I understand that the bank may verify the details as per applicable rules and regulations.</p>
            <label className="flex items-center gap-1 mt-3">
              <span className="w-3 h-3 border border-blue-900 rounded-sm bg-blue-900 text-white text-[8px] flex items-center justify-center">✓</span>
              <span className="text-[6px] font-bold text-blue-950">I agree to the terms and conditions <span className="text-red-500">*</span></span>
            </label>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-start gap-1">
          <span className="text-blue-900 text-[10px]">ℹ️</span>
          <p className="text-[6px] text-blue-700"><span className="font-bold">Note:</span> Please ensure all documents are clear and valid. Incomplete or incorrect information may lead to delay or rejection of your request.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded text-[7px] font-bold text-white flex items-center gap-1" style={{ background: "#1a3a8f" }}>➤ Submit Form</button>
          <button className="px-3 py-1 rounded text-[7px] font-bold text-blue-900 border border-blue-900">Reset</button>
        </div>
      </div>
    </div>
  );
}

// ==================== SCREENS ====================
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const [speaking, setSpeaking] = useState(false);
  const handleSpeakWelcome = () => { const synth = window.speechSynthesis; if (!synth) return; synth.cancel(); const u = new SpeechSynthesisUtterance("Welcome to BankSaarthi"); u.lang = "en-IN"; u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false); synth.speak(u); };
  return (<div className="flex flex-col items-center justify-between min-h-screen px-8 py-14" style={{ background: "linear-gradient(150deg,#0f2d7a 0%,#1a3a8f 45%,#2563eb 100%)" }}><div /><div className="flex flex-col items-center gap-7 w-full"><Logo size={150} /><div className="text-center"><h1 className="text-white text-5xl font-extrabold tracking-tight">Bank<span style={{ color: "#f97316" }}>Saarthi</span></h1><p className="text-blue-200 text-lg mt-2 font-medium">Banking made simple for everyone</p></div><button onClick={onNext} className="mt-4 px-20 py-6 text-3xl font-extrabold rounded-2xl shadow-2xl active:scale-95 transition-all text-white" style={{ background: "#f97316", letterSpacing: "0.08em" }}>START</button><button onClick={handleSpeakWelcome} className={`flex items-center gap-2 text-white border border-white/25 rounded-xl px-5 py-3 text-lg font-medium ${speaking ? 'bg-orange-500' : 'bg-white/15'}`}>{speaking ? "🔊 Speaking…" : "🔊 Speak"}</button></div></div>);
}

function LanguageScreen({ onSelect, onBack }: { onSelect: (l: Language) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<Language | null>(null);
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-8"><div className="self-start"><BackButton onBack={onBack} /></div><Logo size={80} /><div className="text-center"><h2 className="text-3xl font-extrabold text-blue-900">Select Language</h2><p className="text-sm text-blue-400 mt-1 italic">🔊 "Please select your language"</p></div><div className="flex flex-col gap-4 w-full max-w-xs">{(Object.keys(LANGS) as Language[]).map((l) => (<button key={l} onClick={() => setSelected(l)} className="flex items-center justify-between px-7 py-6 rounded-2xl border-2 text-2xl font-bold transition-all active:scale-95" style={{ background: selected === l ? "#1a3a8f" : "#fff", color: selected === l ? "#fff" : "#1a3a8f", borderColor: selected === l ? "#1a3a8f" : "#bfdbfe" }}><div className="text-left"><div>{LANGS[l].native}</div><div className="text-sm opacity-70 font-medium mt-0.5">{LANGS[l].sub}</div></div>{selected === l && <span className="text-2xl ml-3">✓</span>}</button>))}</div>{selected && (<button onClick={() => onSelect(selected)} className="px-16 py-5 rounded-2xl text-2xl font-extrabold text-white active:scale-95 transition-all shadow-xl" style={{ background: "#f97316" }}>{T[selected].continue} →</button>)}</div>);
}

function AccessibilityScreen({ onContinue, onSkip, onBack, lang }: { onContinue: (voiceOn: boolean) => void; onSkip: () => void; onBack: () => void; lang: Language }) {
  const t = T[lang]; const [opts, setOpts] = useState({ voice: false, largeText: false, contrast: false, easyTouch: false });
  const screenText = `${t.voiceGuide}. ${t.largeText}. ${t.highContrast}. ${t.easyTouch}. ${t.continue}. ${t.skip}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, opts.voice);
  const toggle = (k: keyof typeof opts) => setOpts((p) => ({ ...p, [k]: !p[k] }));
  const options = [{ key: "voice" as const, icon: "🔊", label: t.voiceGuide }, { key: "largeText" as const, icon: "🔡", label: t.largeText }, { key: "contrast" as const, icon: "◑", label: t.highContrast }, { key: "easyTouch" as const, icon: "👆", label: t.easyTouch }];
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-7"><ScreenHeader title="Accessibility Setup" onBack={onBack} /><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><div className="grid grid-cols-2 gap-4 w-full max-w-sm">{options.map((o) => (<button key={o.key} onClick={() => toggle(o.key)} className="flex flex-col items-center gap-3 px-4 py-7 rounded-2xl border-2 font-semibold transition-all active:scale-95 text-lg" style={{ background: opts[o.key] ? "#1a3a8f" : "#fff", color: opts[o.key] ? "#fff" : "#1a3a8f", borderColor: opts[o.key] ? "#1a3a8f" : "#bfdbfe" }}><span className="text-4xl">{o.icon}</span><span className="text-center leading-tight">{o.label}</span></button>))}</div><div className="flex flex-col gap-3 w-full max-w-sm"><button onClick={() => onContinue(opts.voice)} className="w-full py-5 rounded-2xl text-2xl font-extrabold text-white active:scale-95 shadow-lg" style={{ background: "#1a3a8f" }}>{t.continue}</button><button onClick={onSkip} className="w-full py-4 rounded-2xl text-xl font-semibold text-blue-600 border-2 border-blue-200 bg-white active:scale-95">{t.skip}</button></div></div>);
}

const ALL_SERVICES: { key: Service; icon: string; labelKey: string; descKey: string; color: string }[] = [
  { key: "account", icon: "🏦", labelKey: "accountOpen", descKey: "accountDesc", color: "#1a3a8f" },
  { key: "deposit", icon: "💰", labelKey: "cashDeposit", descKey: "depositDesc", color: "#0369a1" },
  { key: "kyc", icon: "🪪", labelKey: "kyc", descKey: "kycDesc", color: "#6d28d9" },
  { key: "withdrawal", icon: "💸", labelKey: "withdrawal", descKey: "withdrawDesc", color: "#065f46" },
  { key: "mobile-banking", icon: "📱", labelKey: "mobileBanking", descKey: "mobileBankingDesc", color: "#b45309" },
  { key: "form15", icon: "📋", labelKey: "form15", descKey: "form15Desc", color: "#be123c" },
];

function ServicesScreen({ onSelect, onBack, lang, autoPlay }: { onSelect: (s: Service) => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang]; const screenText = `${t.selectService}. ${ALL_SERVICES.map(s => t[s.labelKey]).join(". ")}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  return (<div className="flex flex-col min-h-screen px-5 py-7"><ScreenHeader title={t.selectService} onBack={onBack} /><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><h2 className="text-2xl font-extrabold text-blue-900 mb-5">{t.selectService}</h2><div className="grid grid-cols-2 gap-4 flex-1">{ALL_SERVICES.map((s) => (<button key={s.key} onClick={() => onSelect(s.key)} className="relative flex flex-col items-start justify-between p-5 rounded-3xl text-white text-left active:scale-95 transition-all shadow-xl" style={{ background: s.color, minHeight: 160 }}><span className="text-4xl mb-2">{s.icon}</span><div><p className="text-base font-extrabold leading-tight">{t[s.labelKey]}</p><p className="text-xs opacity-75 mt-1 leading-snug">{t[s.descKey]}</p></div></button>))}</div><HelpBtn t={t} /></div>);
}

function OtpScreen({ onVerified, onBack, lang, service, autoPlay }: { onVerified: (mobile: string) => void; onBack: () => void; lang: Language; service: Service; autoPlay: boolean }) {
  const t = T[lang]; const isNewAccount = service === "account";

  const getSubtitle = () => {
    switch (service) {
      case "account": return t.otpSubtitleNewAccount;
      case "kyc": return t.otpSubtitleKyc;
      case "deposit": return t.otpSubtitleDeposit;
      case "withdrawal": return t.otpSubtitleWithdrawal;
      case "form15": return t.otpSubtitleForm15;
      case "mobile-banking": return t.otpSubtitleMobileBanking;
      default: return t.otpSubtitle;
    }
  };

  const screenText = isNewAccount ? `${t.otpTitleNewAccount}. ${t.otpSubtitleNewAccount}` : `${t.otpTitle}. ${getSubtitle()}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  const [mobile, setMobile] = useState(""); const [mobileErr, setMobileErr] = useState(""); const [otpSent, setOtpSent] = useState(false); const [generatedOtp, setGeneratedOtp] = useState(""); const [enteredOtp, setEnteredOtp] = useState(""); const [otpErr, setOtpErr] = useState(""); const [verified, setVerified] = useState(false); const timerRef = useRef<number | null>(null);
  useEffect(() => { return () => { if (timerRef.current) window.clearInterval(timerRef.current); }; }, []);
  const sendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) { setMobileErr(t.invalidMobile); return; }
    setMobileErr("");
    try {
      const res = await sendOtpApi(mobile, service);
      setGeneratedOtp(res.otp || "123456");
      setOtpSent(true); setVerified(false); setEnteredOtp(""); setOtpErr("");
    } catch {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(otp); setOtpSent(true); setVerified(false); setEnteredOtp(""); setOtpErr("");
    }
  };
  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(enteredOtp)) { setOtpErr(t.invalidOtp); return; }
    try {
      await verifyOtpApi(mobile, enteredOtp);
      setOtpErr(""); setVerified(true); setTimeout(() => onVerified(mobile), 700);
    } catch {
      if (enteredOtp === generatedOtp) {
        setOtpErr(""); setVerified(true); setTimeout(() => onVerified(mobile), 700);
      } else {
        setOtpErr(t.wrongOtp);
      }
    }
  };
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-6"><div className="self-start w-full"><BackButton onBack={onBack} /></div><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><Logo size={72} /><div className="text-center"><span className="text-5xl">{isNewAccount ? "🏦" : "🔐"}</span><h2 className="text-2xl font-extrabold text-blue-900 mt-3">{isNewAccount ? t.otpTitleNewAccount : t.otpTitle}</h2><p className="text-base text-blue-600 mt-2 max-w-xs">{isNewAccount ? t.otpSubtitleNewAccount : getSubtitle()}</p></div><div className="flex flex-col gap-3 w-full max-w-xs"><label className="text-blue-800 font-semibold text-sm">{isNewAccount ? t.mobileLabelNew : t.mobileLabel}</label><input type="tel" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder={t.mobilePlaceholder} className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-lg font-medium text-blue-900 focus:outline-none focus:border-blue-600" />{mobileErr && <p className="text-red-500 text-sm font-semibold">{mobileErr}</p>}<button onClick={sendOtp} className="w-full py-4 rounded-2xl text-lg font-extrabold text-white active:scale-95 shadow-lg" style={{ background: "#1a3a8f" }}>📲 {t.sendOtp}</button></div>{otpSent && !verified && (<div className="flex flex-col gap-3 w-full max-w-xs"><div className="rounded-2xl px-5 py-4 border border-amber-200 text-sm text-amber-800" style={{ background: "#fffbeb" }}><p className="font-bold mb-1">Hackathon Demo Mode</p><p>Demo OTP: <span className="font-extrabold">{generatedOtp}</span></p></div><label className="text-blue-800 font-semibold text-sm">{t.otpLabel}</label><input type="text" inputMode="numeric" maxLength={6} value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-2xl font-extrabold text-center tracking-widest text-blue-900 focus:outline-none focus:border-blue-600" />{otpErr && <p className="text-red-500 text-sm font-semibold">{otpErr}</p>}<div className="flex gap-3"><button onClick={verifyOtp} className="flex-1 py-4 rounded-2xl text-base font-extrabold text-white active:scale-95" style={{ background: "#16a34a" }}>✅ {t.verifyOtp}</button><button onClick={sendOtp} className="flex-1 py-4 rounded-2xl text-base font-semibold text-blue-700 border-2 border-blue-200 bg-white active:scale-95">↻ {t.resendOtp}</button></div></div>)}{verified && (<div className="w-full max-w-xs rounded-2xl px-6 py-5 text-center" style={{ background: "#f0fdf4", border: "2px solid #16a34a" }}><p className="text-green-700 font-extrabold text-lg">✓ {t.verified}</p><p className="text-green-600 text-sm mt-1">{isNewAccount ? t.proceedingAccount : t.proceeding}</p></div>)}</div>);
}

function FormIntroScreen({ service, onChoice, onBack, lang, autoPlay }: { service: Service; onChoice: (c: "voice" | "scan" | "manual") => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang]; const svc = ALL_SERVICES.find((s) => s.key === service)!; const screenText = `${t.formIntro}. ${t.formOptions}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  const showScan = service === "kyc";
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-6"><div className="self-start w-full"><BackButton onBack={onBack} /></div><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><Logo size={72} /><div className="text-center"><div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-base font-bold mb-3" style={{ background: svc.color }}><span>{svc.icon}</span><span>{t[svc.labelKey]}</span></div><h2 className="text-2xl font-extrabold text-blue-900">{t.formIntro}</h2><p className="text-base text-blue-600 mt-2">{t.formOptions}</p></div><div className="flex flex-col gap-4 w-full max-w-xs"><button onClick={() => onChoice("voice")} className="w-full py-6 rounded-2xl text-xl font-bold text-white active:scale-95 transition-all shadow-lg" style={{ background: "#1a3a8f" }}>{t.voiceAnswer}</button>{showScan && (<button onClick={() => onChoice("scan")} className="w-full py-6 rounded-2xl text-xl font-bold text-white active:scale-95 transition-all shadow-lg" style={{ background: "#0369a1" }}>{t.docScan}</button>)}<button onClick={() => onChoice("manual")} className="w-full py-6 rounded-2xl text-xl font-bold text-white active:scale-95 transition-all shadow-lg" style={{ background: "#374151" }}>{t.manualEntry}</button></div></div>);
}

function VoiceLanguageBar({
  currentLang,
  onChange,
  listening,
}: {
  currentLang: VoiceLanguageCode;
  onChange: (lang: VoiceLanguageCode) => void;
  listening: boolean;
}) {
  const selected = VOICE_LANG_OPTIONS.find((o) => o.code === currentLang) || VOICE_LANG_OPTIONS[0];

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
          <span>🗣️</span>
          <span>Voice Language:</span>
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
            {selected.native}
          </span>
        </div>
        <select
          value={currentLang}
          onChange={(e) => onChange(e.target.value as VoiceLanguageCode)}
          disabled={listening}
          aria-label="Select speaking language"
          className="text-xs font-semibold text-blue-900 bg-white border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {VOICE_LANG_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.native} ({opt.label})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["en", "hi", "as", "bn", "mz", "mr", "gu", "ta", "te"] as VoiceLanguageCode[]).map((c) => {
          const opt = VOICE_LANG_OPTIONS.find((o) => o.code === c)!;
          const isCurrent = currentLang === c;
          return (
            <button
              key={c}
              type="button"
              disabled={listening}
              onClick={() => onChange(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                isCurrent
                  ? "bg-blue-800 text-white shadow-sm"
                  : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              {opt.native}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface VoiceController {
  stop: () => void;
}

async function captureVoiceInput({
  lang,
  onStart,
  onResult,
  onEnd,
  onError,
}: {
  lang: VoiceLanguageCode | Language;
  onStart: () => void;
  onResult: (text: string, normalized?: string | null, englishText?: string | null) => void;
  onEnd: () => void;
  onError: (err: string) => void;
}): Promise<VoiceController> {
  let isDone = false;
  let activeStream: MediaStream | null = null;
  let activeRecorder: MediaRecorder | null = null;
  let activeRecognition: any = null;
  const recordedChunks: BlobPart[] = [];
  let speechRecognitionText = "";

  const option = VOICE_LANG_OPTIONS.find((o) => o.code === lang) || VOICE_LANG_OPTIONS[0];
  const bcp47 = option.bcp47;
  const whisperLang = option.whisperCode;

  const cleanup = () => {
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
  };

  const finishWithResult = (text: string, normalized?: string | null, englishText?: string | null) => {
    if (isDone) return;
    isDone = true;
    cleanup();
    const finalNorm = normalized || clientNormalizeBanking(text);
    onResult(text, finalNorm, englishText || finalNorm);
    onEnd();
  };

  const finishWithError = (err: string) => {
    if (isDone) return;
    isDone = true;
    cleanup();
    onError(err);
    onEnd();
  };

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      finishWithError("Microphone is not supported in this browser.");
      return { stop: () => {} };
    }

    onStart();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    activeStream = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    activeRecorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    recorder.onstop = async () => {
      if (speechRecognitionText && speechRecognitionText.trim()) {
        const raw = speechRecognitionText.trim();
        const norm = clientNormalizeBanking(raw);
        finishWithResult(raw, norm, norm);
        return;
      }

      try {
        const audioBlob = new Blob(recordedChunks, { type: recorder.mimeType || "audio/webm" });
        if (audioBlob.size < 400) {
          finishWithError("Audio was too short or silent. Please speak clearly into your microphone.");
          return;
        }

        const res = await transcribeAudioApi(audioBlob, whisperLang);
        const transcript = (res.text || "").trim();
        if (transcript) {
          const norm = res.normalized || clientNormalizeBanking(transcript);
          finishWithResult(transcript, norm, res.english_text || norm);
        } else {
          finishWithError("Couldn't catch that. Please speak louder or type below.");
        }
      } catch (err: any) {
        finishWithError(err?.message || "Voice transcription failed. Please try again or type.");
      }
    };

    recorder.start(200);

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const canTryWebSpeech = SpeechRecognitionCtor && option.code !== "as" && option.code !== "mz";

    if (canTryWebSpeech) {
      try {
        const recognition = new SpeechRecognitionCtor();
        activeRecognition = recognition;
        recognition.lang = bcp47;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          if (current.trim()) {
            speechRecognitionText = current.trim();
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("SpeechRecognition notice:", e.error);
        };

        recognition.onend = () => {
          if (speechRecognitionText && speechRecognitionText.trim() && recorder.state === "recording") {
            recorder.stop();
          }
        };

        recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition start notice:", err);
      }
    }

    const timeoutId = setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch {}
      }
    }, 6000);

    const stop = () => {
      clearTimeout(timeoutId);
      if (activeRecognition) {
        try { activeRecognition.stop(); } catch {}
      }
      if (recorder.state === "recording") {
        recorder.stop();
      }
    };

    return { stop };
  } catch (err: any) {
    if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
      finishWithError("Microphone permission denied. Please allow microphone in browser.");
    } else {
      finishWithError("Could not access microphone: " + (err?.message || "check settings."));
    }
    return { stop: () => {} };
  }
}

function AIGuidanceScreen({ service, onNext, onBack, lang, autoPlay }: { service: Service; onNext: () => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang];
  const questions = SERVICE_QUESTIONS[service](lang);
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [showType, setShowType] = useState(false);
  const [typed, setTyped] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>(lang as VoiceLanguageCode);
  const [voiceFeedback, setVoiceFeedback] = useState<{ raw: string; normalized?: string | null; english?: string | null } | null>(null);
  const voiceControllerRef = useRef<VoiceController | null>(null);

  const current = questions[step];
  const screenText = `${current.q}. ${current.placeholder}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);

  const handleSpeak = async () => {
    if (listening && voiceControllerRef.current) {
      voiceControllerRef.current.stop();
      return;
    }
    setVoiceError("");
    setVoiceFeedback(null);
    const controller = await captureVoiceInput({
      lang: voiceLang,
      onStart: () => setListening(true),
      onResult: (text, normalized, englishText) => {
        setVoiceFeedback({ raw: text, normalized, english: englishText });
        const chosen = normalized || text;
        setTyped(chosen);
      },
      onEnd: () => setListening(false),
      onError: (err) => {
        setVoiceError(err);
        setShowType(true);
      },
    });
    voiceControllerRef.current = controller;
  };

  const advanceOrFinish = () => {
    setTyped("");
    setShowType(false);
    setVoiceError("");
    setVoiceFeedback(null);
    if (step < questions.length - 1) setStep(step + 1);
    else onNext();
  };

  const activeVoiceOption = VOICE_LANG_OPTIONS.find((o) => o.code === voiceLang) || VOICE_LANG_OPTIONS[0];

  return (
    <div className="flex flex-col min-h-screen px-5 py-7">
      <div className="flex items-center gap-3 mb-5">
        <BackButton onBack={onBack} />
        <Logo size={40} />
        <div className="flex-1">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
            Question {step + 1} of {questions.length}
          </p>
          <div className="flex gap-1 mt-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className="h-2 rounded-full flex-1 transition-all"
                style={{ background: i <= step ? "#1a3a8f" : "#bfdbfe" }}
              />
            ))}
          </div>
        </div>
      </div>

      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />

      <div className="rounded-3xl p-7 mb-4 flex flex-col items-center text-center" style={{ background: "#1a3a8f" }}>
        <div className="text-6xl mb-3">{listening ? "🔊" : "🤖"}</div>
        <p className="text-white text-xl font-bold leading-snug">{current.q}</p>
        <p className="text-blue-200 text-sm mt-2">{current.placeholder}</p>
      </div>

      <VoiceLanguageBar currentLang={voiceLang} onChange={setVoiceLang} listening={listening} />

      {listening && (
        <div className="flex flex-col items-center gap-2 my-3 p-3.5 bg-orange-50 rounded-2xl border border-orange-200 w-full animate-pulse">
          <div className="flex gap-1 items-end h-8">
            {[14, 22, 18, 26, 16, 20, 12, 24, 15].map((h, i) => (
              <div key={i} className="w-2 rounded-full" style={{ background: "#f97316", height: h, opacity: 0.85 }} />
            ))}
          </div>
          <p className="text-orange-700 font-bold text-sm">
            Listening in {activeVoiceOption.native} ({activeVoiceOption.label})… Speak now!
          </p>
          <button
            type="button"
            onClick={() => voiceControllerRef.current?.stop()}
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            ⏹️ Done Speaking (Transcribe)
          </button>
        </div>
      )}

      {voiceError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 text-center">
          <p className="text-red-600 text-sm font-bold">{voiceError}</p>
          <p className="text-xs text-red-500 mt-1">You can switch language above or type manually below.</p>
        </div>
      )}

      {typed && !listening && (
        <div className="w-full border-2 border-green-300 bg-green-50 rounded-2xl px-5 py-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-green-700 uppercase tracking-wider">
              🎤 Voice Input Received ({activeVoiceOption.label})
            </span>
            {voiceFeedback?.normalized && (
              <span className="bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                Standard Value Mapped
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-green-950 mt-1">"{typed}"</p>
          {voiceFeedback?.raw && voiceFeedback?.normalized && voiceFeedback.raw !== voiceFeedback.normalized && (
            <p className="text-xs text-green-700 mt-0.5">Spoken: "{voiceFeedback.raw}"</p>
          )}
          {voiceFeedback?.english && voiceFeedback.english !== typed && (
            <p className="text-xs text-green-600 mt-0.5">Translation: "{voiceFeedback.english}"</p>
          )}
        </div>
      )}

      {showType && !listening && (
        current.key === "dob" ? (
          <input
            type="date"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-lg font-medium text-blue-900 focus:outline-none focus:border-blue-600 mb-4"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={current.placeholder}
            className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-lg font-medium text-blue-900 focus:outline-none focus:border-blue-600 mb-4"
            autoFocus
          />
        )
      )}

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={handleSpeak}
          className="col-span-2 py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 transition-all shadow-md"
          style={{ background: listening ? "#ea580c" : "#f97316" }}
        >
          {listening ? "⏹️ Done Speaking" : "🎙️ " + (activeVoiceOption.code === "hi" ? "बोलें" : activeVoiceOption.native + " Speak")}
        </button>
        <button
          onClick={() => setShowType(!showType)}
          className="py-4 rounded-2xl text-base font-semibold text-blue-700 border-2 border-blue-200 bg-white active:scale-95"
        >
          {t.typeInstead}
        </button>
        <button
          onClick={speak}
          className="py-4 rounded-2xl text-base font-semibold text-blue-700 border-2 border-blue-200 bg-white active:scale-95"
        >
          {t.repeatQ}
        </button>
        <button
          onClick={advanceOrFinish}
          className="col-span-2 py-4 rounded-2xl text-base font-extrabold text-white active:scale-95 shadow-md"
          style={{ background: "#1a3a8f" }}
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
}

function DocumentScreen({ onNext, onBack, lang, autoPlay }: { onNext: () => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang];
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState("aadhaar_sample.jpg");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenText = `${t.docTitle}. ${t.docSub}. ${t.uploadDoc}. ${t.scanDoc}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploaded(true);
    try {
      await uploadOcrDocumentApi(file);
    } catch (err) {
      console.warn("OCR notice:", err);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
    else setUploaded(true);
  };

  return (
    <div className="flex flex-col min-h-screen px-5 py-7 gap-5">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
      <ScreenHeader title={t.docTitle} onBack={onBack} />
      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />
      <p className="text-blue-600 text-base">{t.docSub}</p>
      <div className="w-full rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-4 py-14 cursor-pointer active:bg-blue-100 transition-all" onClick={triggerUpload}>
        <span className="text-6xl">{uploaded ? "✅" : "📄"}</span>
        <p className="text-blue-700 font-semibold text-lg">{uploaded ? fileName : t.uploadDoc}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={triggerUpload} className="flex-1 py-5 rounded-2xl text-lg font-bold text-white active:scale-95" style={{ background: "#1a3a8f" }}>{t.uploadDoc}</button>
        <button onClick={triggerUpload} className="flex-1 py-5 rounded-2xl text-lg font-bold text-white active:scale-95" style={{ background: "#0369a1" }}>{t.scanDoc}</button>
      </div>
      {uploaded && (
        <>
          <div className="rounded-3xl p-5 border border-blue-100 bg-white">
            <p className="text-blue-800 font-extrabold text-base mb-4">{t.extractedFields}</p>
            {[[t.name, "Ramesh Kumar"], [t.dob, "15 / 08 / 1985"], [t.address, "Village Kothrud, Pune, MH 411038"]].map(([label, value]) => (
              <div key={label} className="flex justify-between items-start py-3 border-b border-blue-50 last:border-0">
                <span className="text-blue-400 font-semibold text-sm">{label}</span>
                <span className="text-blue-900 font-bold text-sm text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
          <button onClick={onNext} className="w-full py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 shadow-lg" style={{ background: "#f97316" }}>{t.confirmInfo}</button>
        </>
      )}
    </div>
  );
}

function KycDocumentScreen({ onNext, onBack, lang, mobile, autoPlay }: { onNext: (extracted: Record<string, string>, missingKeys: string[]) => void; onBack: () => void; lang: Language; mobile: string; autoPlay: boolean }) {
  const t = T[lang];
  const [aadhaarDone, setAadhaarDone] = useState(false);
  const [passbookDone, setPassbookDone] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState("");
  const [passbookFile, setPassbookFile] = useState("");
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const passbookRef = useRef<HTMLInputElement>(null);

  const [extractedDetails, setExtractedDetails] = useState<Record<string, string>>({
    name: "Ramesh Kumar",
    dob: "15 / 08 / 1985",
    gender: "Male",
    address: "Village Kothrud, Near Ganesh Mandir",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411038",
    idProofType: "D - UID (Aadhaar)",
    idNumber: "XXXX XXXX 3456",
    accountNo: "12345678901",
    branch: "Kothrud Branch, Pune",
    mobile: mobile || "+91 98765 43210",
  });

  const bothDone = aadhaarDone && passbookDone;
  const screenText = `${t.kycScanNote}. ${t.uploadAadhaar}. ${t.uploadPassbook}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  const missingKeys = ["maritalStatus", "fatherOrMotherName", "nationality", "occupationType", "monthlyIncome", "panNumber", "email", "placeOfBirth", "district"];

  const handleAadhaar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAadhaarFile(file.name);
    setAadhaarDone(true);
    try {
      const res = await uploadOcrDocumentApi(file);
      if (res.text) {
        const uidMatch = res.text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
        const dobMatch = res.text.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/);
        setExtractedDetails((prev) => ({
          ...prev,
          idNumber: uidMatch ? uidMatch[0] : prev.idNumber,
          dob: dobMatch ? dobMatch[0] : prev.dob,
        }));
      }
    } catch (err) {
      console.warn("OCR notice:", err);
    }
  };

  const handlePassbook = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPassbookFile(file.name);
    setPassbookDone(true);
    try {
      const res = await uploadOcrDocumentApi(file);
      if (res.text) {
        const accMatch = res.text.match(/\b\d{9,18}\b/);
        setExtractedDetails((prev) => ({
          ...prev,
          accountNo: accMatch ? accMatch[0] : prev.accountNo,
        }));
      }
    } catch (err) {
      console.warn("OCR notice:", err);
    }
  };

  const triggerAadhaar = () => {
    if (aadhaarRef.current) aadhaarRef.current.click();
    else setAadhaarDone(true);
  };

  const triggerPassbook = () => {
    if (passbookRef.current) passbookRef.current.click();
    else setPassbookDone(true);
  };

  return (
    <div className="flex flex-col min-h-screen px-5 py-7 gap-5">
      <input type="file" ref={aadhaarRef} accept="image/*" className="hidden" onChange={handleAadhaar} />
      <input type="file" ref={passbookRef} accept="image/*" className="hidden" onChange={handlePassbook} />
      <ScreenHeader title={t.docTitle} onBack={onBack} />
      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />
      <p className="text-blue-600 text-base">{t.kycScanNote}</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          [aadhaarDone ? (aadhaarFile || t.uploadAadhaar) : t.uploadAadhaar, aadhaarDone, triggerAadhaar],
          [passbookDone ? (passbookFile || t.uploadPassbook) : t.uploadPassbook, passbookDone, triggerPassbook],
        ].map(([label, done, onUpload]) => (
          <div key={label as string} onClick={onUpload as () => void} className="rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-3 py-9 cursor-pointer active:bg-blue-100 transition-all">
            <span className="text-4xl">{done ? "✅" : "📁"}</span>
            <p className="text-blue-700 font-semibold text-sm text-center px-2">{label as string}</p>
          </div>
        ))}
      </div>
      {bothDone && (
        <>
          <div className="rounded-3xl p-5 border border-blue-100 bg-white">
            <p className="text-blue-800 font-extrabold text-base mb-4">{t.extractedFields}</p>
            {[
              [t.name, extractedDetails.name],
              [t.dob, extractedDetails.dob],
              [t.gender, extractedDetails.gender],
              [t.address, extractedDetails.address],
              [t.state, extractedDetails.state],
              [t.pincode || "PIN Code", extractedDetails.pincode],
              [t.idProofType, extractedDetails.idProofType],
              [t.idNumber, extractedDetails.idNumber],
              [t.accountNo, extractedDetails.accountNo],
              [t.branch, extractedDetails.branch],
              [t.mobile, extractedDetails.mobile],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-start py-3 border-b border-blue-50 last:border-0">
                <span className="text-blue-400 font-semibold text-sm">{label}</span>
                <span className="text-blue-900 font-bold text-sm text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl px-5 py-4 border border-amber-200" style={{ background: "#fffbeb" }}>
            <p className="font-bold text-amber-800 text-sm mb-2">⚠️ {t.missingFieldsTitle}</p>
            <p className="text-amber-700 text-sm mb-3">{t.missingFieldsNotice}</p>
            <div className="flex flex-wrap gap-2">
              {missingKeys.map((k) => (
                <span key={k} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-800">{t[k]}</span>
              ))}
            </div>
          </div>
          <button onClick={() => onNext(extractedDetails, missingKeys)} className="w-full py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 shadow-lg" style={{ background: "#f97316" }}>
            {t.continueToMissing}
          </button>
        </>
      )}
    </div>
  );
}

function GenericMissingFieldsScreen({
  lang,
  questions,
  onDone,
  onBack,
  autoPlay,
}: {
  lang: Language;
  questions: { key: string; q: string; placeholder: string; sample: string }[];
  onDone: (answers: Record<string, string>) => void;
  onBack: () => void;
  autoPlay: boolean;
}) {
  const t = T[lang];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [listening, setListening] = useState(false);
  const [showType, setShowType] = useState(false);
  const [typed, setTyped] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [voiceLang, setVoiceLang] = useState<VoiceLanguageCode>(lang as VoiceLanguageCode);
  const [voiceFeedback, setVoiceFeedback] = useState<{ raw: string; normalized?: string | null; english?: string | null } | null>(null);
  const voiceControllerRef = useRef<VoiceController | null>(null);

  const current = questions[step];
  const screenText = `${current.q}. ${current.placeholder}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);

  const handleSpeak = async () => {
    if (listening && voiceControllerRef.current) {
      voiceControllerRef.current.stop();
      return;
    }
    setVoiceError("");
    setVoiceFeedback(null);
    const controller = await captureVoiceInput({
      lang: voiceLang,
      onStart: () => setListening(true),
      onResult: (text, normalized, englishText) => {
        setVoiceFeedback({ raw: text, normalized, english: englishText });
        const chosen = normalized || text;
        setTyped(chosen);
      },
      onEnd: () => setListening(false),
      onError: (err) => {
        setVoiceError(err);
        setShowType(true);
      },
    });
    voiceControllerRef.current = controller;
  };

  const saveAndAdvance = () => {
    const raw = (typed || current.sample).trim();
    const value = raw.toLowerCase() === "skip" ? "" : raw;
    const nextAnswers = { ...answers, [current.key]: value };
    setAnswers(nextAnswers);
    setTyped("");
    setShowType(false);
    setVoiceError("");
    setVoiceFeedback(null);
    if (step < questions.length - 1) setStep(step + 1);
    else onDone(nextAnswers);
  };

  const activeVoiceOption = VOICE_LANG_OPTIONS.find((o) => o.code === voiceLang) || VOICE_LANG_OPTIONS[0];

  return (
    <div className="flex flex-col min-h-screen px-5 py-7">
      <div className="flex items-center gap-3 mb-5">
        <BackButton onBack={onBack} />
        <Logo size={40} />
        <div className="flex-1">
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
            {t.questionOf} {step + 1} / {questions.length}
          </p>
          <div className="flex gap-1 mt-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className="h-2 rounded-full flex-1 transition-all"
                style={{ background: i <= step ? "#1a3a8f" : "#bfdbfe" }}
              />
            ))}
          </div>
        </div>
      </div>

      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />

      <div className="rounded-3xl p-7 mb-4 flex flex-col items-center text-center" style={{ background: "#1a3a8f" }}>
        <div className="text-6xl mb-3">{listening ? "🔊" : "🤖"}</div>
        <p className="text-white text-xl font-bold leading-snug">{current.q}</p>
        <p className="text-blue-200 text-sm mt-2">{current.placeholder}</p>
      </div>

      <VoiceLanguageBar currentLang={voiceLang} onChange={setVoiceLang} listening={listening} />

      {listening && (
        <div className="flex flex-col items-center gap-2 my-3 p-3.5 bg-orange-50 rounded-2xl border border-orange-200 w-full animate-pulse">
          <div className="flex gap-1 items-end h-8">
            {[14, 22, 18, 26, 16, 20, 12, 24, 15].map((h, i) => (
              <div key={i} className="w-2 rounded-full" style={{ background: "#f97316", height: h, opacity: 0.85 }} />
            ))}
          </div>
          <p className="text-orange-700 font-bold text-sm">
            Listening in {activeVoiceOption.native} ({activeVoiceOption.label})… Speak now!
          </p>
          <button
            type="button"
            onClick={() => voiceControllerRef.current?.stop()}
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            ⏹️ Done Speaking (Transcribe)
          </button>
        </div>
      )}

      {voiceError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 text-center">
          <p className="text-red-600 text-sm font-bold">{voiceError}</p>
          <p className="text-xs text-red-500 mt-1">You can switch language above or type manually below.</p>
        </div>
      )}

      {typed && !listening && (
        <div className="w-full border-2 border-green-300 bg-green-50 rounded-2xl px-5 py-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-green-700 uppercase tracking-wider">
              🎤 Voice Input Received ({activeVoiceOption.label})
            </span>
            {voiceFeedback?.normalized && (
              <span className="bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                Standard Value Mapped
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-green-950 mt-1">"{typed}"</p>
          {voiceFeedback?.raw && voiceFeedback?.normalized && voiceFeedback.raw !== voiceFeedback.normalized && (
            <p className="text-xs text-green-700 mt-0.5">Spoken: "{voiceFeedback.raw}"</p>
          )}
          {voiceFeedback?.english && voiceFeedback.english !== typed && (
            <p className="text-xs text-green-600 mt-0.5">Translation: "{voiceFeedback.english}"</p>
          )}
        </div>
      )}

      {showType && !listening && (
        current.key === "dob" ? (
          <input
            type="date"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-lg font-medium text-blue-900 focus:outline-none focus:border-blue-600 mb-4"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={current.placeholder}
            className="w-full border-2 border-blue-300 rounded-2xl px-5 py-4 text-lg font-medium text-blue-900 focus:outline-none focus:border-blue-600 mb-4"
            autoFocus
          />
        )
      )}

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={handleSpeak}
          className="col-span-2 py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 transition-all shadow-md"
          style={{ background: listening ? "#ea580c" : "#f97316" }}
        >
          {listening ? "⏹️ Done Speaking" : "🎙️ " + (activeVoiceOption.code === "hi" ? "बोलें" : activeVoiceOption.native + " Speak")}
        </button>
        <button
          onClick={() => setShowType(!showType)}
          className="py-4 rounded-2xl text-base font-semibold text-blue-700 border-2 border-blue-200 bg-white active:scale-95"
        >
          {t.typeInstead}
        </button>
        <button
          onClick={speak}
          className="py-4 rounded-2xl text-base font-semibold text-blue-700 border-2 border-blue-200 bg-white active:scale-95"
        >
          {t.repeatQ}
        </button>
        <button
          onClick={saveAndAdvance}
          className="col-span-2 py-4 rounded-2xl text-base font-extrabold text-white active:scale-95 shadow-md"
          style={{ background: "#1a3a8f" }}
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
}

const KycMissingFieldsScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={KYC_MISSING_QUESTIONS(props.lang)} />;
const DepositMissingFieldsScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={DEPOSIT_QUESTIONS(props.lang)} />;
const WithdrawalMissingFieldsScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={WITHDRAWAL_QUESTIONS(props.lang)} />;
const AccountGuidanceScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={ACCOUNT_QUESTIONS(props.lang)} />;
const Form15GuidanceScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={FORM15_QUESTIONS(props.lang)} />;
const MobileBankingGuidanceScreen = (props: { lang: Language; onDone: (a: Record<string, string>) => void; onBack: () => void; autoPlay: boolean }) => <GenericMissingFieldsScreen {...props} questions={MOBILE_BANKING_QUESTIONS(props.lang)} />;

function DocumentUploadScreen({ service, onDone, onBack, lang, autoPlay }: { service: "form15" | "mobile-banking"; onDone: (files: Record<string, File | null>) => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang];
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const isForm15 = service === "form15";
  const screenText = isForm15 ? t.form15UploadNote : t.mobileUploadNote;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  const allRequiredUploaded = isForm15 ? (files.panCard && files.form15) : (files.panCard && files.addressProof);
  return (
    <div className="flex flex-col min-h-screen px-5 py-7 gap-4">
      <ScreenHeader title={isForm15 ? "Form 15G / 15H" : "Mobile Banking"} onBack={onBack} />
      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />
      <p className="text-blue-600 text-sm">{screenText}</p>
      <div className="flex flex-col gap-3">
        <DocumentUpload label={t.uploadPan} required onUpload={(f) => setFiles((p) => ({ ...p, panCard: f }))} />
        {isForm15 && <DocumentUpload label={t.uploadForm15} required onUpload={(f) => setFiles((p) => ({ ...p, form15: f }))} />}
        {!isForm15 && <DocumentUpload label={t.uploadAddressProof} required onUpload={(f) => setFiles((p) => ({ ...p, addressProof: f }))} />}
      </div>
      <button onClick={() => onDone(files)} disabled={!allRequiredUploaded} className="w-full py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 shadow-lg mt-2" style={{ background: allRequiredUploaded ? "#16a34a" : "#94a3b8" }}>
        {allRequiredUploaded ? "✅ " + t.continueBtn : "⚠️ " + t.pleaseUpload}
      </button>
    </div>
  );
}

// ============ RECEIPT PRINTING HELPER ============
function printFormattedReceipt({
  refId,
  serviceTitle,
  mobile,
  data = {},
  qrCodeUrl,
  lang = "en",
}: {
  refId: string;
  serviceTitle: string;
  mobile: string;
  data: Record<string, any>;
  qrCodeUrl?: string;
  lang?: Language;
}) {
  const printWindow = window.open("", "_blank", "width=880,height=920");
  if (!printWindow) {
    alert("Please allow popups to print the official receipt.");
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const fieldKeyLabels: Record<string, string> = {
    fullName: "Applicant Name",
    name: "Full Name",
    dob: "Date of Birth",
    gender: "Gender",
    fatherOrMotherName: "Father / Spouse Name",
    maritalStatus: "Marital Status",
    nationality: "Nationality",
    occupationType: "Occupation",
    monthlyIncome: "Monthly Income",
    annualIncome: "Annual Income",
    email: "Email ID",
    mobile: "Mobile Number",
    address: "Residential Address",
    cityVillage: "City / Village",
    district: "District",
    state: "State",
    pincode: "PIN Code",
    idProofType: "ID Proof Type",
    idNumber: "ID / Document Number",
    pan: "PAN Number",
    accountNo: "Account Number",
    accountType: "Account Type",
    branch: "Branch Name",
    homeBranch: "Home Branch",
    amount: "Transaction Amount (₹)",
    amountWords: "Amount in Words",
    depositMode: "Deposit Mode",
    chequeNo: "Cheque Number",
    chequeBankBranch: "Cheque Bank & Branch",
    nomineeName: "Nominee Name",
    nomineeRelation: "Nominee Relationship",
    statementPreference: "Statement Preference",
    atmCard: "ATM / Debit Card Requested",
    internetBanking: "Internet Banking Requested",
    mobileBanking: "Mobile Banking Requested",
    smsAlerts: "SMS Alerts",
    financialYear: "Financial Year",
    interestIncome: "Estimated Interest Income",
    totalIncome: "Estimated Total Income",
    ovdType: "OVD Type",
    ovdNumber: "OVD Number",
  };

  const rowsHtml = Object.entries(data)
    .filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== "" && typeof v !== "object")
    .map(([k, v]) => {
      const label = (lang && T[lang] && T[lang][k]) || fieldKeyLabels[k] || k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (str) => str.toUpperCase());
      return `
        <tr>
          <td style="padding: 7px 12px; font-weight: 600; color: #1e3a8a; background: #f8fafc; border: 1px solid #cbd5e1; width: 38%; font-size: 12.5px;">${label}</td>
          <td style="padding: 7px 12px; color: #0f172a; border: 1px solid #cbd5e1; font-size: 12.5px; font-weight: 500;">${String(v)}</td>
        </tr>
      `;
    })
    .join("");

  const qrSectionHtml = qrCodeUrl
    ? `
      <div style="text-align: center; border: 2px solid #1a3a8f; border-radius: 10px; padding: 8px 10px; background: #ffffff; min-width: 120px;">
        <img src="${qrCodeUrl}" alt="Receipt QR Code" style="width: 100px; height: 100px; display: block; margin: 0 auto;" />
        <div style="font-size: 9.5px; font-weight: 800; color: #1a3a8f; margin-top: 4px; letter-spacing: 0.5px;">SCAN TO VERIFY</div>
        <div style="font-size: 8.5px; color: #64748b;">Ref: ${refId}</div>
      </div>
    `
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>BankSaarthi Official Receipt - ${refId}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Segoe UI', 'Nirmala UI', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-size: 12.5px;
            line-height: 1.45;
          }
          .receipt-card {
            border: 2px solid #1a3a8f;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
          }
          .header-banner {
            background: linear-gradient(135deg, #0f2d7a 0%, #1a3a8f 60%, #2563eb 100%);
            color: #ffffff;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .bank-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 1px;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .bank-sub {
            font-size: 11px;
            color: #bfdbfe;
            margin-top: 2px;
            font-weight: 500;
          }
          .receipt-meta-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            padding: 14px 20px;
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            align-items: center;
          }
          .meta-item {
            margin-bottom: 3px;
          }
          .meta-label {
            font-size: 10.5px;
            text-transform: uppercase;
            font-weight: 700;
            color: #475569;
            letter-spacing: 0.5px;
          }
          .meta-val {
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
          }
          .badge-success {
            display: inline-block;
            background: #16a34a;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 800;
            color: #1a3a8f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 14px 20px 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          table.data-table {
            width: calc(100% - 40px);
            margin: 0 20px 14px;
            border-collapse: collapse;
          }
          .security-footer {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .seal-box {
            border: 2px dashed #16a34a;
            border-radius: 8px;
            padding: 6px 14px;
            text-align: center;
            background: #f0fdf4;
          }
          .seal-title {
            font-size: 10.5px;
            font-weight: 900;
            color: #15803d;
            letter-spacing: 1px;
          }
          .seal-desc {
            font-size: 8.5px;
            color: #166534;
          }
          .tear-off-slip {
            border-top: 2px dashed #94a3b8;
            padding-top: 14px;
            margin-top: 16px;
          }
          .tear-badge {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            text-align: center;
            margin-bottom: 10px;
            letter-spacing: 1px;
          }
          .slip-box {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            background: #fafafa;
          }
          .slip-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
          }
          .sign-line {
            margin-top: 24px;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            text-align: center;
            font-size: 10.5px;
            font-weight: 600;
            color: #475569;
          }
          .no-print {
            text-align: center;
            margin-top: 16px;
          }
          .print-btn {
            background: #1a3a8f;
            color: #fff;
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header-banner">
            <div>
              <div class="bank-title">🏛️ BANKSARTHI DIGITAL KIOSK</div>
              <div class="bank-sub">National Banking Accessibility & Smart Assistance Initiative</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10.5px; color: #93c5fd; font-weight: 600;">OFFICIAL ACKNOWLEDGMENT</div>
              <div style="font-size: 11.5px; font-weight: 700;">FORM SUBMISSION RECEIPT</div>
            </div>
          </div>

          <div class="receipt-meta-grid">
            <div>
              <div style="display: flex; gap: 14px; align-items: baseline; margin-bottom: 6px;">
                <div>
                  <span class="meta-label">Reference ID: </span>
                  <span class="meta-val" style="color: #1a3a8f; font-size: 17px; letter-spacing: 1px;">${refId}</span>
                </div>
                <div>
                  <span class="badge-success">✓ REGISTERED & SUBMITTED</span>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px;">
                <div class="meta-item">
                  <span class="meta-label">Service: </span>
                  <span class="meta-val">${serviceTitle}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Date & Time: </span>
                  <span class="meta-val">${dateStr}, ${timeStr}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Applicant Mobile: </span>
                  <span class="meta-val">${mobile ? "+91 " + mobile : "Provided in Form"}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Kiosk ID: </span>
                  <span class="meta-val">BS-KIOSK-042 (Branch Kiosk)</span>
                </div>
              </div>
            </div>
            ${qrSectionHtml}
          </div>

          <div class="section-title">📝 Submitted Application Particulars</div>
          <table class="data-table">
            <tbody>
              ${rowsHtml || `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #64748b;">Standard application record registered.</td></tr>`}
            </tbody>
          </table>

          <div class="security-footer">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: #1e3a8a;">DIGITAL VERIFICATION SIGNATURE</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
                Digitally authenticated via BankSaarthi Secure Transaction Pipeline.<br />
                This is a computer-generated acknowledgment. Physical bank stamp not mandatory.
              </div>
            </div>
            <div class="seal-box">
              <div class="seal-title">✓ DIGITALLY VERIFIED</div>
              <div class="seal-desc">BankSaarthi Official Seal</div>
              <div style="font-size: 7.5px; color: #15803d; margin-top: 2px;">REF: ${refId}</div>
            </div>
          </div>
        </div>

        <div class="tear-off-slip">
          <div class="tear-badge">✂ - - - - - - - - - - - - - - - - - TEAR-OFF CUSTOMER ACKNOWLEDGMENT SLIP - - - - - - - - - - - - - - - - - ✂</div>
          <div class="slip-box">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px;">
              <span style="font-weight: 800; color: #1a3a8f; font-size: 11.5px;">🏛️ BANKSARTHI CUSTOMER COPY</span>
              <span style="font-size: 10.5px; font-weight: 700; color: #0f172a;">Ref No: <strong>${refId}</strong></span>
              <span style="font-size: 10.5px; color: #64748b;">${dateStr}</span>
            </div>
            <div class="slip-grid">
              <div>
                <div style="font-size: 9.5px; color: #64748b;">SERVICE TYPE</div>
                <div style="font-weight: 700; font-size: 11.5px; color: #0f172a;">${serviceTitle}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; color: #64748b;">APPLICANT / MOBILE</div>
                <div style="font-weight: 700; font-size: 11.5px; color: #0f172a;">${data.name || data.fullName || (mobile ? "+91 " + mobile : "Customer")}</div>
              </div>
              <div>
                <div style="font-size: 9.5px; color: #64748b;">STATUS</div>
                <div style="font-weight: 800; font-size: 11.5px; color: #16a34a;">✓ ACCEPTED</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 8px;">
              <div class="sign-line">Customer Signature / Thumb Impression</div>
              <div class="sign-line">Authorized Bank Official / Kiosk Validator</div>
            </div>
          </div>
        </div>

        <div class="no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Print Now</button>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 700);
}

function GenericPreviewScreen({ lang, form, onBack, onEdit, onConfirm, autoPlay, titleKey, fileName }: { lang: Language; form: React.ReactNode; onBack: () => void; onEdit: () => void; onConfirm: () => void; autoPlay: boolean; titleKey: string; fileName?: string }) {
  const t = T[lang];
  const { isSpeaking, speak } = useScreenReader(lang, t[titleKey] || "Form Preview", autoPlay);
  const [downloading, setDownloading] = useState(false);

  // ============ PRINT FUNCTION ============
  const handlePrint = () => {
    const printArea = document.getElementById("form-print-area");
    if (!printArea) {
      alert("Form not found. Please try again.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (!printWindow) {
      alert("Please allow popups to print the form.");
      return;
    }

    // Collect all stylesheets and style tags so Tailwind CSS classes render correctly
    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t[titleKey] || "BankSaarthi Form Print"}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { 
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 16px; 
              background: #ffffff !important;
              font-size: 11px;
            }
            #form-print-area { 
              width: 100%; 
              max-width: 800px;
              margin: 0 auto;
              page-break-inside: avoid;
            }
            table { border-collapse: collapse; width: 100%; }
            .page-break { page-break-before: always; }
            img { max-width: 100%; height: auto; }
            div { overflow: visible !important; }
            button, .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div id="form-print-area">${printArea.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 700);
  };

  // ============ DOWNLOAD AS PDF FUNCTION ============
  const handleDownloadPDF = async () => {
    const printArea = document.getElementById("form-print-area");
    if (!printArea) {
      alert("Form not found. Please try again.");
      return;
    }

    setDownloading(true);

    try {
      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const name = fileName || t[titleKey]?.replace(/[^a-zA-Z0-9]/g, "_") || "BankSaarthi_Form";
      pdf.save(`${name}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-5 py-7 gap-4">
      <div className="flex items-center gap-3 mb-1">
        <BackButton onBack={onBack} />
        <Logo size={40} />
        <div>
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Preview</p>
          <h1 className="text-lg font-extrabold text-blue-900 leading-tight">{t[titleKey] || "Form Preview"}</h1>
        </div>
      </div>

      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />

      <div id="form-print-area">{form}</div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onEdit}
          className="w-full py-4 rounded-2xl text-base font-bold text-blue-700 border-2 border-blue-200 bg-white active:scale-95"
        >
          ✏️ {t.editDepositDetails || "Edit Details"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="w-full py-4 rounded-2xl text-base font-bold text-white active:scale-95"
            style={{ background: "#0369a1" }}
          >
            🖨️ Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full py-4 rounded-2xl text-base font-bold text-white active:scale-95 disabled:opacity-60"
            style={{ background: "#7c3aed" }}
          >
            {downloading ? "⏳ Generating..." : "⬇️ Download PDF"}
          </button>
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 shadow-lg"
          style={{ background: "#16a34a" }}
        >
          {t.confirmSubmitDeposit || "✅ Confirm & Submit"}
        </button>
      </div>
    </div>
  );
}

const KycPreviewScreen = ({ lang, data, onBack, onEditMissing, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; onBack: () => void; onEditMissing: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<KycFormPreview data={data} t={T[lang]} />} onBack={onBack} onEdit={onEditMissing} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="kycFormTitle" />;
const DepositPreviewScreen = ({ lang, data, onBack, onEditMissing, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; onBack: () => void; onEditMissing: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<DepositFormPreview data={data} />} onBack={onBack} onEdit={onEditMissing} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="depositFormTitle" />;
const WithdrawalPreviewScreen = ({ lang, data, onBack, onEditMissing, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; onBack: () => void; onEditMissing: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<WithdrawalFormPreview data={data} />} onBack={onBack} onEdit={onEditMissing} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="depositFormTitle" />;
const AccountPreviewScreen = ({ lang, data, onBack, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; onBack: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<AccountFormPreview data={data} t={T[lang]} />} onBack={onBack} onEdit={onBack} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="acc_form_title" />;
const Form15PreviewScreen = ({ lang, data, files, onBack, onEdit, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; files: Record<string, File | null>; onBack: () => void; onEdit: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<Form15Preview data={data} files={files} />} onBack={onBack} onEdit={onEdit} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="form15Title" />;
const MobileBankingPreviewScreen = ({ lang, data, files, onBack, onEdit, onConfirm, autoPlay }: { lang: Language; data: Record<string, string>; files: Record<string, File | null>; onBack: () => void; onEdit: () => void; onConfirm: () => void; autoPlay: boolean }) => <GenericPreviewScreen lang={lang} form={<MobileBankingPreview data={data} files={files} />} onBack={onBack} onEdit={onEdit} onConfirm={onConfirm} autoPlay={autoPlay} titleKey="mobileBankingTitle" />;

function ReviewScreen({ service, onNext, onBack, lang, dynamicFields, autoPlay }: { service: Service; onNext: () => void; onBack: () => void; lang: Language; dynamicFields?: { label: string; value: string }[]; autoPlay: boolean }) {
  const t = T[lang]; const fields = dynamicFields || []; const screenText = `${t.reviewTitle}. ` + fields.map(f => `${f.label}: ${f.value}`).join(". ");
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  return (<div className="flex flex-col min-h-screen px-5 py-7 gap-5"><ScreenHeader title={t.reviewTitle} onBack={onBack} /><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><div className="flex flex-col gap-3 flex-1">{fields.map((f) => (<div key={f.label} className="flex items-center justify-between rounded-2xl px-5 py-4 bg-white border border-blue-100 shadow-sm"><div><p className="text-blue-400 text-xs font-semibold">{f.label}</p><p className="text-blue-900 text-base font-bold mt-0.5">{f.value}</p></div><button className="text-blue-400 border border-blue-200 rounded-lg px-3 py-1 text-xs font-semibold hover:text-blue-600 active:scale-95 ml-2 shrink-0">{t.edit}</button></div>))}</div><button onClick={onNext} className="w-full py-5 rounded-2xl text-xl font-extrabold text-white active:scale-95 shadow-lg" style={{ background: "#1a3a8f" }}>{t.submitConfirm}</button></div>);
}

function VoiceConfirmScreen({ onConfirm, onEdit, onBack, lang, autoPlay }: { onConfirm: () => void; onEdit: () => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang]; const screenText = `${t.voiceConfirmTitle}. ${t.isCorrect}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-7"><div className="self-start w-full"><BackButton onBack={onBack} /></div><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><Logo size={72} /><h2 className="text-3xl font-extrabold text-blue-900 text-center">{t.voiceConfirmTitle}</h2><div className="w-full rounded-3xl p-8 text-center cursor-pointer active:scale-95 transition-all" style={{ background: "#1a3a8f" }}><div className="text-7xl mb-4">🤖</div><p className="text-white text-2xl font-bold">{t.isCorrect}</p></div><div className="flex gap-4 w-full"><button onClick={onConfirm} className="flex-1 py-7 rounded-2xl text-2xl font-extrabold text-white active:scale-95 shadow-xl" style={{ background: "#16a34a" }}>{t.yes}</button><button onClick={onEdit} className="flex-1 py-7 rounded-2xl text-2xl font-extrabold text-white active:scale-95 shadow-xl" style={{ background: "#dc2626" }}>{t.no}</button></div><button onClick={onEdit} className="px-8 py-4 rounded-2xl text-lg font-bold text-blue-700 border-2 border-blue-200 bg-white active:scale-95">✏️ {t.editDetails}</button></div>);
}

function OutputScreen({ onNext, onBack, lang, autoPlay }: { onNext: () => void; onBack: () => void; lang: Language; autoPlay: boolean }) {
  const t = T[lang]; const screenText = `${t.outputTitle}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);
  const options = [{ icon: "🖨️", label: t.printForm, color: "#1a3a8f" }, { icon: "📱", label: t.generateQR, color: "#0369a1" }, { icon: "⬇️", label: t.downloadPDF, color: "#6d28d9" }, { icon: "🏦", label: t.sendBank, color: "#065f46" }];
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-8"><div className="self-start w-full"><BackButton onBack={onBack} /></div><VoiceButton onClick={speak} isSpeaking={isSpeaking} /><Logo size={72} /><h2 className="text-3xl font-extrabold text-blue-900 text-center">{t.outputTitle}</h2><div className="grid grid-cols-2 gap-4 w-full max-w-sm">{options.map((o) => (<button key={o.label} onClick={onNext} className="flex flex-col items-center gap-3 py-8 px-4 rounded-3xl text-white font-bold text-base active:scale-95 shadow-xl" style={{ background: o.color }}><span className="text-4xl">{o.icon}</span><span className="text-center text-sm leading-tight">{o.label}</span></button>))}</div></div>);
}

function SuccessScreen({
  onNext,
  onBack,
  lang,
  autoPlay,
  refId,
  formId,
  service = "account",
  mobile = "",
  submittedData = {},
}: {
  onNext: () => void;
  onBack: () => void;
  lang: Language;
  autoPlay: boolean;
  refId?: string;
  formId?: number | null;
  service?: Service;
  mobile?: string;
  submittedData?: Record<string, any>;
}) {
  const t = T[lang];
  const finalRefId = refId || ("BS" + Math.floor(100000 + Math.random() * 900000));
  const screenText = `${t.successTitle}. ${t.refId}: ${finalRefId}`;
  const { isSpeaking, speak } = useScreenReader(lang, screenText, autoPlay);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  const serviceTitles: Record<Service, string> = {
    account: t.accountOpen || "Account Opening",
    kyc: t.kyc || "KYC Update",
    deposit: t.cashDeposit || "Cash Deposit",
    withdrawal: t.withdrawal || "Cash Withdrawal",
    form15: t.form15 || "Form 15G / 15H",
    "mobile-banking": t.mobileBanking || "Mobile Banking Activation",
  };
  const serviceTitle = serviceTitles[service] || "Banking Service";

  // Generate interactive QR Code encoding official verification info
  useEffect(() => {
    const qrPayload = JSON.stringify({
      system: "BankSaarthi Kiosk",
      reference_id: finalRefId,
      service: serviceTitle,
      mobile: mobile || "N/A",
      timestamp: new Date().toISOString(),
      verify_url: formId
        ? getFormPdfUrl(formId)
        : `https://banksaarthi.gov.in/verify/${finalRefId}`,
    });

    QRCode.toDataURL(qrPayload, {
      width: 220,
      margin: 2,
      color: {
        dark: "#1a3a8f",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [finalRefId, serviceTitle, mobile, formId]);

  // Print official receipt with embedded QR code, applicant data, digital seal, and customer slip
  const handleReceipt = () => {
    printFormattedReceipt({
      refId: finalRefId,
      serviceTitle,
      mobile,
      data: submittedData,
      qrCodeUrl: qrDataUrl,
      lang,
    });
  };

  // Workable PDF Download: fetches from FastAPI backend if formId exists, else generates client-side PDF
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      if (formId) {
        const pdfUrl = getFormPdfUrl(formId);
        const res = await fetch(pdfUrl);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `BankSaarthi_${finalRefId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // Standalone/Client-side Fallback using jsPDF
      const pdf = new jsPDF("p", "mm", "a4");
      // Header Banner
      pdf.setFillColor(26, 58, 143);
      pdf.rect(0, 0, 210, 28, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("BANKSARTHI DIGITAL KIOSK", 15, 13);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Official Application & Acknowledgment Receipt", 15, 20);

      // Meta Info
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Reference ID: ${finalRefId}`, 15, 38);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Service: ${serviceTitle}`, 15, 45);
      pdf.text(`Date & Time: ${new Date().toLocaleString("en-IN")}`, 15, 51);
      if (mobile) {
        pdf.text(`Registered Mobile: +91 ${mobile}`, 15, 57);
      }

      // QR Code in PDF if available
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, "PNG", 145, 32, 45, 45);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text("Scan to Verify", 156, 80);
      }

      // Particulars table
      let y = 86;
      pdf.setDrawColor(203, 213, 225);
      pdf.setFillColor(241, 245, 249);
      pdf.rect(15, y, 180, 8, "FD");
      pdf.setTextColor(30, 58, 138);
      pdf.setFont("helvetica", "bold");
      pdf.text("APPLICATION PARTICULARS", 18, y + 5.5);
      y += 10;

      const entries = Object.entries(submittedData || {}).filter(
        ([k, v]) => v !== undefined && v !== null && String(v).trim() !== "" && typeof v !== "object"
      );

      for (const [key, val] of entries) {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFillColor(y % 16 === 0 ? 248 : 255, y % 16 === 0 ? 250 : 255, y % 16 === 0 ? 252 : 255);
        pdf.rect(15, y, 180, 8, "FD");
        pdf.setTextColor(71, 85, 105);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(key), 18, y + 5.5);
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "normal");
        pdf.text(String(val).substring(0, 55), 85, y + 5.5);
        y += 8;
      }

      // Digital Seal
      y += 10;
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      pdf.setDrawColor(22, 163, 74);
      pdf.setFillColor(240, 253, 244);
      pdf.roundedRect(15, y, 180, 18, 2, 2, "FD");
      pdf.setTextColor(21, 128, 61);
      pdf.setFont("helvetica", "bold");
      pdf.text("✓ DIGITALLY AUTHENTICATED VIA BANKSARTHI KIOSK", 20, y + 8);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Computer generated acknowledgment. Valid without physical signature.", 20, y + 14);

      pdf.save(`BankSaarthi_Receipt_${finalRefId}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
      if (formId) {
        window.open(getFormPdfUrl(formId), "_blank");
      } else {
        alert("Failed to download PDF. Please use the Print Receipt option.");
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8 gap-5">
      <div className="self-start w-full"><BackButton onBack={onBack} /></div>
      <VoiceButton onClick={speak} isSpeaking={isSpeaking} />
      <Logo size={64} />

      {/* Success Banner */}
      <div className="w-full rounded-3xl px-6 py-7 flex flex-col items-center gap-3" style={{ background: "#f0fdf4", border: "2px solid #16a34a" }}>
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-extrabold text-green-700 text-center">{t.successTitle}</h2>
        <div className="text-center mt-1">
          <p className="text-green-600 font-semibold text-xs tracking-wider uppercase">{t.refId}</p>
          <p className="text-3xl font-black mt-0.5 tracking-widest" style={{ color: "#1a3a8f" }}>{finalRefId}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold mt-1">
          <span>✓</span> <span>{serviceTitle}</span>
        </div>
      </div>

      {/* Interactive QR Code Card */}
      <div className="w-full bg-white rounded-3xl p-5 border border-blue-100 shadow-sm flex flex-col items-center text-center">
        <div className="flex items-center justify-between w-full mb-3 px-1">
          <div className="text-left">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Receipt QR Code</p>
            <p className="text-[11px] text-gray-500">Scan to download & verify</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {finalRefId}
          </span>
        </div>

        {qrDataUrl ? (
          <div className="p-3 bg-white border-2 border-blue-900/20 rounded-2xl shadow-inner mb-2">
            <img
              src={qrDataUrl}
              alt="Verification QR Code"
              className="w-44 h-44 object-contain rounded-lg cursor-pointer active:scale-95 transition-transform"
              onClick={() => setShowQrModal(true)}
              title="Click to enlarge"
            />
          </div>
        ) : (
          <div className="w-44 h-44 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 text-xs">
            Loading QR...
          </div>
        )}

        <p className="text-xs text-gray-600 max-w-xs mt-1">
          📱 Scan with any phone camera or kiosk scanner to verify your acknowledgment receipt.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={handleReceipt}
          className="w-full py-4 rounded-2xl text-base font-extrabold text-white active:scale-95 shadow-md flex items-center justify-center gap-2"
          style={{ background: "#1a3a8f" }}
        >
          <span>🖨️</span> <span>{t.printReceipt}</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={downloadingPdf}
          className="w-full py-4 rounded-2xl text-base font-extrabold text-white active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "#0369a1" }}
        >
          <span>{downloadingPdf ? "⏳" : "⬇️"}</span>
          <span>{downloadingPdf ? "Generating PDF..." : t.downloadPDF}</span>
        </button>

        <button
          onClick={() => setShowQrModal(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-blue-900 border-2 border-blue-200 bg-white active:scale-95 flex items-center justify-center gap-2"
        >
          <span>📱</span> <span>{t.showQR}</span>
        </button>

        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl text-base font-extrabold text-white active:scale-95 shadow-md"
          style={{ background: "#f97316" }}
        >
          {t.newSession}
        </button>
      </div>

      {/* QR Code Full Modal / Enlarge View */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full border-b border-gray-100 pb-2">
              <h3 className="font-extrabold text-blue-900 text-lg">BankSaarthi QR Code</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Enlarged QR Code"
                className="w-64 h-64 border-2 border-blue-900 rounded-2xl p-2 bg-white shadow-md"
              />
            )}
            <div className="text-sm">
              <p className="font-bold text-blue-900">{finalRefId}</p>
              <p className="text-xs text-gray-500 mt-0.5">{serviceTitle}</p>
            </div>
            <button
              onClick={() => {
                setShowQrModal(false);
                handleReceipt();
              }}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: "#1a3a8f" }}
            >
              🖨️ Print Receipt with QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionEndScreen({ onRestart, lang }: { onRestart: () => void; lang: Language }) {
  const t = T[lang]; const screenText = `${t.sessionEnd}. ${t.sessionMsg}`;
  const { speak } = useScreenReader(lang, screenText, false);
  useEffect(() => { speak(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (<div className="flex flex-col items-center justify-center min-h-screen px-8 py-12 gap-8" style={{ background: "linear-gradient(150deg,#0f2d7a 0%,#1a3a8f 50%,#2563eb 100%)" }}><Logo size={110} /><div className="text-center"><h2 className="text-4xl font-extrabold text-white">{t.sessionEnd}</h2><p className="text-blue-200 text-base mt-3 max-w-xs leading-relaxed">{t.sessionMsg}</p></div><div className="w-full rounded-3xl px-7 py-5 text-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}><p className="text-white text-lg font-semibold">🔒 Session data cleared</p><p className="text-blue-200 text-sm mt-1">Your privacy is protected</p></div><button onClick={onRestart} className="px-14 py-6 rounded-2xl text-2xl font-extrabold text-white active:scale-95 shadow-2xl" style={{ background: "#f97316" }}>{t.startNew}</button></div>);
}

// ==================== MAIN APP ====================
export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [lang, setLang] = useState<Language>("en");
  const [service, setService] = useState<Service>("account");
  const [verifiedMobile, setVerifiedMobile] = useState("");
  const [kycData, setKycData] = useState<Record<string, string>>({});
  const [kycScanned, setKycScanned] = useState(false);
  const [depositData, setDepositData] = useState<Record<string, string>>({});
  const [depositAnswered, setDepositAnswered] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<Record<string, string>>({});
  const [accountData, setAccountData] = useState<Record<string, string>>({});
  const [accountDone, setAccountDone] = useState(false);
  const [form15Data, setForm15Data] = useState<Record<string, string>>({});
  const [form15Files, setForm15Files] = useState<Record<string, File | null>>({});
  const [mobileBankingData, setMobileBankingData] = useState<Record<string, string>>({});
  const [mobileBankingFiles, setMobileBankingFiles] = useState<Record<string, File | null>>({});
  const [voiceGuidanceOn, setVoiceGuidanceOn] = useState(false);

  const [submittedRefId, setSubmittedRefId] = useState("");
  const [submittedFormId, setSubmittedFormId] = useState<number | null>(null);

  const go = (s: Screen) => setScreen(s);
  const requiresOtp = (s: Service) => s === "kyc" || s === "account" || s === "withdrawal" || s === "deposit" || s === "form15" || s === "mobile-banking";

  const resetSession = () => {
    setLang("en"); setVerifiedMobile(""); setKycData({}); setKycScanned(false); setDepositData({}); setDepositAnswered(false);
    setWithdrawalData({}); setAccountData({}); setAccountDone(false); setForm15Data({}); setForm15Files({});
    setMobileBankingData({}); setMobileBankingFiles({}); setVoiceGuidanceOn(false);
    setSubmittedRefId(""); setSubmittedFormId(null);
    go("welcome");
  };

  const getActiveFormData = (): Record<string, any> => {
    switch (service) {
      case "account": return accountData;
      case "kyc": return kycData;
      case "deposit": return depositData;
      case "withdrawal": return withdrawalData;
      case "form15": return form15Data;
      case "mobile-banking": return mobileBankingData;
      default: return {};
    }
  };

  const handleFinalSubmit = async () => {
    let payloadData: Record<string, any> = {};
    let formTypeTitle = "Account Opening";

    switch (service) {
      case "account":
        payloadData = { ...accountData, mobile: verifiedMobile || accountData.mobile };
        formTypeTitle = "Account Opening";
        break;
      case "kyc":
        payloadData = { ...kycData, mobile: verifiedMobile || kycData.mobile };
        formTypeTitle = "KYC";
        break;
      case "deposit":
        payloadData = { ...depositData, mobile: verifiedMobile || depositData.mobile };
        formTypeTitle = "Deposit";
        break;
      case "withdrawal":
        payloadData = { ...withdrawalData, mobile: verifiedMobile || withdrawalData.mobile };
        formTypeTitle = "Withdrawal";
        break;
      case "form15":
        payloadData = { ...form15Data, mobile: verifiedMobile || form15Data.mobile };
        formTypeTitle = "Form 15G / 15H";
        break;
      case "mobile-banking":
        payloadData = { ...mobileBankingData, mobile: verifiedMobile || mobileBankingData.mobile };
        formTypeTitle = "Mobile Banking Activation";
        break;
    }

    try {
      const res = await submitFormApi(formTypeTitle, payloadData);
      setSubmittedRefId(res.reference_id || `BS${Math.floor(100000 + Math.random() * 900000)}`);
      setSubmittedFormId(res.form_id || null);
    } catch (err) {
      console.warn("Backend submission notice:", err);
      setSubmittedRefId(`BS${Math.floor(100000 + Math.random() * 900000)}`);
    } finally {
      go("success");
    }
  };

  const t = T[lang];

  return (
    <div className="scrollbar-hide overflow-y-auto no-print" style={{ minHeight: "100%", background: "#f0f4ff", maxWidth: 480, margin: "0 auto" }}>
      {screen === "welcome" && <WelcomeScreen onNext={() => go("language")} />}
      {screen === "language" && <LanguageScreen onSelect={(l) => { setLang(l); go("accessibility"); }} onBack={() => go("welcome")} />}
      {screen === "accessibility" && (<AccessibilityScreen lang={lang} onContinue={(v) => { setVoiceGuidanceOn(v); go("services"); }} onSkip={() => { setVoiceGuidanceOn(false); go("services"); }} onBack={() => go("language")} />)}
      {screen === "services" && <ServicesScreen lang={lang} autoPlay={voiceGuidanceOn} onSelect={(s) => { setService(s); setKycScanned(false); setKycData({}); setDepositAnswered(false); setDepositData({}); setWithdrawalData({}); setAccountDone(false); setAccountData({}); setForm15Data({}); setForm15Files({}); setMobileBankingData({}); setMobileBankingFiles({}); go(requiresOtp(s) ? "otp" : "form-intro"); }} onBack={() => go("accessibility")} />}
      {screen === "otp" && <OtpScreen lang={lang} autoPlay={voiceGuidanceOn} service={service} onVerified={(m) => { setVerifiedMobile(m); go("form-intro"); }} onBack={() => go("services")} />}
      {screen === "form-intro" && (<FormIntroScreen lang={lang} autoPlay={voiceGuidanceOn} service={service} onChoice={(c) => { if (service === "account") go("account-guidance"); else if (service === "deposit") go("deposit-guidance"); else if (service === "withdrawal") go("withdrawal-guidance"); else if (service === "kyc") go(c === "scan" ? "document" : "ai-guidance"); else if (service === "form15") go("form15-guidance"); else if (service === "mobile-banking") go("mobile-banking-guidance"); else go(c === "scan" ? "document" : "ai-guidance"); }} onBack={() => go(requiresOtp(service) ? "otp" : "services")} />)}
      {screen === "ai-guidance" && <AIGuidanceScreen lang={lang} autoPlay={voiceGuidanceOn} service={service} onNext={() => go("review")} onBack={() => go("form-intro")} />}
      {screen === "account-guidance" && (<AccountGuidanceScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("form-intro")} onDone={(answers) => { setAccountData(answers); setAccountDone(true); go("review"); }} />)}
      {screen === "account-preview" && (<AccountPreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={accountData} onBack={() => go("voice-confirm")} onConfirm={handleFinalSubmit} />)}
      {screen === "deposit-guidance" && (<GenericMissingFieldsScreen lang={lang} autoPlay={voiceGuidanceOn} questions={DEPOSIT_QUESTIONS(lang)} onBack={() => go("form-intro")} onDone={(answers) => { setDepositData(answers); setDepositAnswered(true); go("review"); }} />)}
      {screen === "deposit-missing" && (<DepositMissingFieldsScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("deposit-guidance")} onDone={(answers) => { setDepositData((prev) => ({ ...prev, ...answers })); go("review"); }} />)}
      {screen === "withdrawal-guidance" && (<GenericMissingFieldsScreen lang={lang} autoPlay={voiceGuidanceOn} questions={WITHDRAWAL_QUESTIONS(lang)} onBack={() => go("form-intro")} onDone={(answers) => { setWithdrawalData(answers); go("review"); }} />)}
      {screen === "withdrawal-missing" && (<WithdrawalMissingFieldsScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("withdrawal-guidance")} onDone={(answers) => { setWithdrawalData((prev) => ({ ...prev, ...answers })); go("review"); }} />)}
      {screen === "document" && service === "kyc" && (<KycDocumentScreen lang={lang} autoPlay={voiceGuidanceOn} mobile={verifiedMobile} onNext={(extracted) => { setKycData((prev) => ({ ...prev, ...extracted })); setKycScanned(true); go("kyc-missing"); }} onBack={() => go("form-intro")} />)}
      {screen === "document" && service !== "kyc" && <DocumentScreen lang={lang} autoPlay={voiceGuidanceOn} onNext={() => go("review")} onBack={() => go("form-intro")} />}
      {screen === "kyc-missing" && (<KycMissingFieldsScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("document")} onDone={(answers) => { setKycData((prev) => ({ ...prev, ...answers })); go("review"); }} />)}
      {screen === "form15-guidance" && (<Form15GuidanceScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("form-intro")} onDone={(answers) => { setForm15Data(answers); go("form15-upload"); }} />)}
      {screen === "form15-upload" && (<DocumentUploadScreen service="form15" lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("form15-guidance")} onDone={(files) => { setForm15Files(files); go("review"); }} />)}
      {screen === "mobile-banking-guidance" && (<MobileBankingGuidanceScreen lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("form-intro")} onDone={(answers) => { setMobileBankingData(answers); go("mobile-banking-upload"); }} />)}
      {screen === "mobile-banking-upload" && (<DocumentUploadScreen service="mobile-banking" lang={lang} autoPlay={voiceGuidanceOn} onBack={() => go("mobile-banking-guidance")} onDone={(files) => { setMobileBankingFiles(files); go("review"); }} />)}
      {screen === "review" && (<ReviewScreen lang={lang} autoPlay={voiceGuidanceOn} service={service} dynamicFields={service === "kyc" && kycScanned ? buildKycReviewFields(kycData, t) : service === "deposit" ? buildDepositReviewFields(depositData, t) : service === "withdrawal" ? buildWithdrawalReviewFields(withdrawalData, t) : service === "account" && accountDone ? buildAccountReviewFields(accountData, t) : service === "form15" ? buildForm15ReviewFields(form15Data, t) : service === "mobile-banking" ? buildMobileBankingReviewFields(mobileBankingData, t) : undefined} onNext={() => go("voice-confirm")} onBack={() => { if (service === "kyc" && kycScanned) go("kyc-missing"); else if (service === "deposit") go("deposit-guidance"); else if (service === "withdrawal") go("withdrawal-guidance"); else if (service === "account" && accountDone) go("account-guidance"); else if (service === "form15") go("form15-upload"); else if (service === "mobile-banking") go("mobile-banking-upload"); else go("ai-guidance"); }} />)}
      {screen === "voice-confirm" && (<VoiceConfirmScreen lang={lang} autoPlay={voiceGuidanceOn} onConfirm={() => { if (service === "account" && accountDone) go("account-preview"); else if (service === "kyc" && kycScanned) go("kyc-print-preview"); else if (service === "deposit") go("deposit-preview"); else if (service === "withdrawal") go("withdrawal-preview"); else if (service === "form15") go("form15-preview"); else if (service === "mobile-banking") go("mobile-banking-preview"); else go("output"); }} onEdit={() => go("review")} onBack={() => go("review")} />)}
      {screen === "kyc-print-preview" && (<KycPreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={kycData} onBack={() => go("voice-confirm")} onEditMissing={() => go("kyc-missing")} onConfirm={handleFinalSubmit} />)}
      {screen === "deposit-preview" && (<DepositPreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={depositData} onBack={() => go("voice-confirm")} onEditMissing={() => go("deposit-missing")} onConfirm={handleFinalSubmit} />)}
      {screen === "withdrawal-preview" && (<WithdrawalPreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={withdrawalData} onBack={() => go("voice-confirm")} onEditMissing={() => go("withdrawal-missing")} onConfirm={handleFinalSubmit} />)}
      {screen === "form15-preview" && (<Form15PreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={form15Data} files={form15Files} onBack={() => go("voice-confirm")} onEdit={() => go("form15-upload")} onConfirm={handleFinalSubmit} />)}
      {screen === "mobile-banking-preview" && (<MobileBankingPreviewScreen lang={lang} autoPlay={voiceGuidanceOn} data={mobileBankingData} files={mobileBankingFiles} onBack={() => go("voice-confirm")} onEdit={() => go("mobile-banking-upload")} onConfirm={handleFinalSubmit} />)}
      {screen === "output" && <OutputScreen lang={lang} autoPlay={voiceGuidanceOn} onNext={handleFinalSubmit} onBack={() => go("voice-confirm")} />}
      {screen === "success" && (
        <SuccessScreen
          lang={lang}
          autoPlay={voiceGuidanceOn}
          refId={submittedRefId}
          formId={submittedFormId}
          service={service}
          mobile={verifiedMobile}
          submittedData={getActiveFormData()}
          onNext={() => go("session-end")}
          onBack={() => {
            if (service === "account") go("account-preview");
            else if (service === "kyc") go("kyc-print-preview");
            else if (service === "deposit") go("deposit-preview");
            else if (service === "withdrawal") go("withdrawal-preview");
            else if (service === "form15") go("form15-preview");
            else if (service === "mobile-banking") go("mobile-banking-preview");
            else go("output");
          }}
        />
      )}
      {screen === "session-end" && <SessionEndScreen lang={lang} onRestart={resetSession} />}
    </div>
  );
}