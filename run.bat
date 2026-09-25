@echo off
title BankSaarthi - Banking Assistance Platform
echo ========================================================
echo        Starting BankSaarthi Full-Stack Server
echo ========================================================
cd /d "%~dp0"

if exist "venv\Scripts\python.exe" (
    echo Using Python virtual environment: venv\Scripts\python.exe
    set "PY_EXE=%~dp0venv\Scripts\python.exe"
) else (
    echo Virtual environment not found, using system Python...
    set "PY_EXE=python"
)

echo.
echo ========================================================
echo  * Web Application:  http://127.0.0.1:8000/
echo  * API Documentation: http://127.0.0.1:8000/docs
echo  * Health Check:      http://127.0.0.1:8000/health
echo  * Vite Frontend:     http://localhost:5173/ (if running)
echo ========================================================
echo.
"%PY_EXE%" main.py
pause
