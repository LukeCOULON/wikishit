@echo off
title Administration locale - Documentation
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js est requis.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] Installation des dependances...
  call npm install
  if errorlevel 1 (
    echo [ERREUR] npm install a echoue.
    pause
    exit /b 1
  )
)

echo.
echo [INFO] Lancement de l'administration LOCALE...
echo [INFO] Elle ecoute uniquement sur 127.0.0.1:3001
echo.
start "" "http://127.0.0.1:3001"
node admin/server.js
pause

