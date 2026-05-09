@echo off
setlocal EnableDelayedExpansion
title SLMC OMR — Installer

:: ============================================================
::  SLMC OMR System — Windows Installer
::  Requires: Docker Desktop, Git
:: ============================================================

echo.
echo  =====================================================
echo   Sri Lanka Medical Council — OMR Exam System
echo   Windows Installer
echo  =====================================================
echo.

:: ------------------------------------------------------------
:: 1. Check Git
:: ------------------------------------------------------------
echo [1/6] Checking for Git...
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: Git is not installed or not in PATH.
    echo.
    echo  Please download and install Git from:
    echo    https://git-scm.com/download/win
    echo.
    echo  After installing Git, re-run this script.
    echo.
    pause
    exit /b 1
)
echo        Git found.

:: ------------------------------------------------------------
:: 2. Check Docker
:: ------------------------------------------------------------
echo [2/6] Checking for Docker...
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: Docker is not installed or not in PATH.
    echo.
    echo  Please download and install Docker Desktop from:
    echo    https://www.docker.com/products/docker-desktop/
    echo.
    echo  After installing Docker Desktop, re-run this script.
    echo.
    pause
    exit /b 1
)
echo        Docker found.

:: ------------------------------------------------------------
:: 3. Check Docker daemon is running
:: ------------------------------------------------------------
echo [3/6] Checking Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: Docker Desktop does not appear to be running.
    echo.
    echo  Please open Docker Desktop from the Start Menu and
    echo  wait until the taskbar icon shows "Engine running",
    echo  then re-run this script.
    echo.
    pause
    exit /b 1
)
echo        Docker is running.

:: ------------------------------------------------------------
:: 4. Clone or update the repository
:: ------------------------------------------------------------
echo [4/6] Setting up application files...

set "INSTALL_DIR=%USERPROFILE%\slmc-omr"
set "REPO_URL=https://github.com/ruwanlinton/hermes-ems.git"

if exist "%INSTALL_DIR%\.git" (
    echo        Existing installation found — pulling latest update...
    cd /d "%INSTALL_DIR%"
    git pull origin main
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  WARNING: Could not pull latest update. Using existing files.
        echo.
    )
) else (
    echo        Cloning application to %INSTALL_DIR% ...
    git clone "%REPO_URL%" "%INSTALL_DIR%"
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  ERROR: Failed to download the application.
        echo  Check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    cd /d "%INSTALL_DIR%"
)

:: ------------------------------------------------------------
:: 5. Create .env if it does not already exist
:: ------------------------------------------------------------
echo [5/6] Configuring environment...

if not exist "%INSTALL_DIR%\.env" (
    :: Generate a pseudo-random secret key from %RANDOM% and date/time
    set "SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
    echo JWT_SECRET_KEY=!SECRET!> "%INSTALL_DIR%\.env"
    echo        New secret key generated and saved to .env
) else (
    echo        Existing .env found — keeping current configuration.
)

:: ------------------------------------------------------------
:: 6. Build and start the application
:: ------------------------------------------------------------
echo [6/6] Building and starting SLMC OMR...
echo.
echo  This may take 5-10 minutes on first run while Docker
echo  downloads and builds the application containers.
echo  Subsequent starts will be much faster.
echo.

cd /d "%INSTALL_DIR%"
docker compose up --build -d
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: Failed to start the application.
    echo  Check the output above for details.
    echo.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: Create Desktop shortcut to start the app
:: ------------------------------------------------------------
set "SHORTCUT=%USERPROFILE%\Desktop\SLMC OMR.lnk"
set "START_SCRIPT=%INSTALL_DIR%\start.bat"

:: Write start.bat
(
    echo @echo off
    echo title SLMC OMR
    echo cd /d "%INSTALL_DIR%"
    echo echo Starting SLMC OMR System...
    echo docker compose up -d
    echo timeout /t 3 /nobreak ^>nul
    echo start http://localhost:3000
) > "%START_SCRIPT%"

:: Write stop.bat
(
    echo @echo off
    echo title SLMC OMR
    echo cd /d "%INSTALL_DIR%"
    echo echo Stopping SLMC OMR System...
    echo docker compose down
    echo echo Done.
    echo pause
) > "%INSTALL_DIR%\stop.bat"

:: Create Desktop shortcut using PowerShell
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%SHORTCUT%'); ^
   $s.TargetPath = '%START_SCRIPT%'; ^
   $s.WorkingDirectory = '%INSTALL_DIR%'; ^
   $s.Description = 'Start SLMC OMR Exam Management System'; ^
   $s.Save()"

:: ------------------------------------------------------------
:: Done
:: ------------------------------------------------------------
echo.
echo  =====================================================
echo   Installation complete!
echo  =====================================================
echo.
echo   The SLMC OMR system is now running.
echo.
echo   Open in browser : http://localhost:3000
echo   Username        : admin
echo   Password        : admin123
echo.
echo   IMPORTANT: Change the admin password after first login.
echo.
echo   A shortcut "SLMC OMR" has been added to your Desktop.
echo   Use it to start the application in future.
echo.
echo   To stop the application, run:
echo     %INSTALL_DIR%\stop.bat
echo.
echo  =====================================================
echo.

:: Open the browser
timeout /t 3 /nobreak >nul
start http://localhost:3000

pause
endlocal
