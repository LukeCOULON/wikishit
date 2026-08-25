@echo off
title Site documentation - serveur DEBUG
cd /d "%~dp0"

echo ==============================================
echo   SITE DOCUMENTATION - MODE DEBUG
echo ==============================================
echo [INFO] Dossier : %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe.
    echo Installe Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detecte :
node --version
echo.

if not exist package.json (
    echo [ERREUR] package.json introuvable.
    pause
    exit /b 1
)

if not exist data (
    echo [ERREUR] Dossier data introuvable.
    pause
    exit /b 1
)

echo [INFO] Verification des fichiers JSON...
for %%F in (data\*.json) do (
    echo [JSON] %%F
)
echo.

if not exist node_modules (
    echo [INFO] node_modules absent : installation de Express...
    call npm install
    if errorlevel 1 (
        echo [ERREUR] npm install a echoue.
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Lancement du serveur...
echo [INFO] Les logs du serveur vont apparaitre ci-dessous.
echo [INFO] Pour arreter : Ctrl+C
echo.

start "" "http://localhost:3000"
node server.js

echo.
echo ==============================================
echo   SERVEUR ARRETE
echo ==============================================
pause
