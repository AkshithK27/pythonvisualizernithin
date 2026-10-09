@echo off
title Python Code Visualizer
cd /d "%~dp0"

echo ========================================
echo       Python Code Visualizer
echo ========================================

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.11+ and enable Add Python to PATH.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  py -m venv .venv
)

call ".venv\Scripts\activate.bat"
python -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

start "Python Code Visualizer API" cmd /k "python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000"

cd frontend
npm install
start "Python Code Visualizer Frontend" cmd /k "npm run dev"

echo.
echo Backend and frontend startup commands were launched.
echo Open http://localhost:5173 in your browser.
echo Keep the API terminal open while using the visualizer.
pause
