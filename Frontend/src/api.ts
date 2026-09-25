// BankSaarthi Backend API Client

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Helper for authenticated/unauthenticated JSON requests.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("banksaarthi_token");
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// ==================== AUTH & OTP ====================

export async function sendOtpApi(mobile: string, service?: string) {
  return apiFetch<{ message: string; mobile: string; otp: string }>(
    "/auth/send-otp",
    {
      method: "POST",
      body: JSON.stringify({ mobile, service }),
    }
  );
}

export async function verifyOtpApi(mobile: string, otp: string) {
  const res = await apiFetch<{
    message: string;
    mobile: string;
    access_token?: string;
    token_type?: string;
  }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });

  if (res.access_token) {
    localStorage.setItem("banksaarthi_token", res.access_token);
  }
  return res;
}

// ==================== FORMS ====================

export async function submitFormApi(formType: string, data: Record<string, any>) {
  return apiFetch<{
    message: string;
    form_id: number;
    form_type_id: number;
    form_type: string;
    status: string;
    reference_id: string;
  }>("/forms/", {
    method: "POST",
    body: JSON.stringify({
      form_type: formType,
      data,
    }),
  });
}

export async function getFormApi(formId: number) {
  return apiFetch(`/forms/${formId}`);
}

export function getFormPdfUrl(formId: number): string {
  return `${API_BASE_URL}/forms/${formId}/pdf`;
}

// ==================== OCR (DOCUMENT EXTRACTION) ====================

export async function uploadOcrDocumentApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/ocr/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "OCR extraction failed";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<{ filename: string; text: string }>;
}

// ==================== VOICE / WHISPER TRANSLATION ====================

export interface TranscribeResponse {
  text: string;
  language: string;
  english_text?: string | null;
  normalized?: string | null;
}

export async function transcribeAudioApi(
  audioBlob: Blob,
  language?: string
): Promise<TranscribeResponse> {
  const formData = new FormData();
  const ext = audioBlob.type.includes("webm") ? "webm" : audioBlob.type.includes("ogg") ? "ogg" : "wav";
  formData.append("file", audioBlob, `recording.${ext}`);
  if (language) {
    formData.append("language", language);
  }

  const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Voice transcription failed";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<TranscribeResponse>;
}

export async function normalizeTextApi(
  text: string,
  language?: string
): Promise<{ raw: string; converted: string; normalized: string }> {
  return apiFetch("/voice/normalize", {
    method: "POST",
    body: JSON.stringify({ text, language }),
  });
}

