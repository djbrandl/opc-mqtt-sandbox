@echo off
title OPC UA / MQTT Sandbox
echo ============================================
echo   OPC UA / MQTT Sandbox
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download it from https://nodejs.org/
    pause
    exit /b 1
)

:: Move to script directory
cd /d "%~dp0"

:: Install dependencies if needed
if not exist "node_modules\" (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/2] Dependencies already installed.
)

echo [2/2] Starting servers (auto-detecting free API port)...
echo.

call npx tsx start-dev.ts

pause
