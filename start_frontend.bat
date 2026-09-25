@echo off
title BankSaarthi - Vite Dev Server (Port 5173)
echo ========================================================
echo        Starting BankSaarthi Vite Frontend (5173)
echo ========================================================
cd /d "%~dp0\Frontend"
set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
call npm run dev
pause
