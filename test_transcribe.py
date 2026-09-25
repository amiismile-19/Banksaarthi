import sys
import urllib.request
import urllib.parse
import uuid
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# 1. Test supported languages
try:
    req_lang = urllib.request.Request("http://127.0.0.1:8000/voice/languages")
    with urllib.request.urlopen(req_lang) as res:
        print("GET /voice/languages -> HTTP", res.getcode())
        print("Supported languages:", res.read().decode())
except Exception as e:
    print("Languages request failed:", e)

# 2. Test transcription with language
wav_sample = "uploads/244b9232-0e59-4a24-81bb-10abf58e7f77.wav"
if os.path.exists(wav_sample):
    with open(wav_sample, "rb") as f:
        audio_data = f.read()

    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"language\"\r\n\r\n"
        f"hi\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"sample.wav\"\r\n"
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + audio_data + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req_trans = urllib.request.Request(
        "http://127.0.0.1:8000/voice/transcribe",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    try:
        with urllib.request.urlopen(req_trans) as res:
            print("POST /voice/transcribe (hi) -> HTTP", res.getcode())
            print("Response:", res.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
    except Exception as e:
        print("Transcribe error:", e)

