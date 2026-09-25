import os
import sys

# Ensure root directory is in sys.path regardless of execution context
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Also ensure venv site-packages is in sys.path if running under system python
venv_site = os.path.join(BASE_DIR, "venv", "Lib", "site-packages")
if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.insert(1, venv_site)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models
from routers import (
    auth,
    ocr,
    voice,
    validation,
    forms
)

# Create database tables if they do not already exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BankSaarthi API",
    description="AI-powered multilingual banking form assistance platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for web and mobile frontends (localhost, local LAN IPs, Render, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Register API Routers
app.include_router(auth.router)
app.include_router(ocr.router)
app.include_router(voice.router)
app.include_router(validation.router)
app.include_router(forms.router)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected"
    }


# Mount Frontend if dist exists
dist_dir = os.path.join(BASE_DIR, "Frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/")
def serve_home():
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {
        "message": "BankSaarthi Backend is running",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health"
    }


@app.get("/{full_path:path}")
def serve_frontend_routes(full_path: str):
    # Pass through API routes and documentation
    if full_path.startswith(("docs", "redoc", "openapi.json", "auth", "forms", "validation", "ocr", "voice", "health")):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")

    target_file = os.path.join(dist_dir, full_path)
    if os.path.isfile(target_file):
        return FileResponse(target_file)

    index_file = os.path.join(dist_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)

    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)