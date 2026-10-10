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

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 20.19+ or 22.12+ and restart VS Code.
  pause
  exit /b 1
)

node -e "const parts=process.versions.node.split('.').map(Number); if (parts[0] > 22) process.exit(0); if (parts[0] === 22) { if (parts[1] >= 12) process.exit(0); } if (parts[0] === 20) { if (parts[1] >= 19) process.exit(0); } process.exit(1)"
if errorlevel 1 (
  echo Unsupported Node.js version. Install Node.js 20.19+ or 22.12+.
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
if errorlevel 1 (
  echo Frontend dependency installation failed. Check your internet connection and Node.js version.
  pause
  exit /b 1
)
start "Python Code Visualizer Frontend" cmd /k "npm run dev"

echo.
echo Backend and frontend startup commands were launched.
echo Open http://localhost:5173 in your browser.
echo Keep the API terminal open while using the visualizer.
pause
