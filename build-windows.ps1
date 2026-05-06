# ============================================================
#  SLMC OMR — Windows Standalone Distribution Builder
#
#  Run this script on a Windows machine (or in GitHub Actions)
#  to produce the dist\ folder ready for Inno Setup.
#
#  Prerequisites (must be in PATH):
#    - Node.js 20+  (https://nodejs.org)
#    - Python 3.11  (only to run this script; embedded Python
#                    is downloaded automatically for the package)
#
#  Usage:
#    powershell -ExecutionPolicy Bypass -File build-windows.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$ROOT      = Split-Path -Parent $MyInvocation.MyCommand.Path
$DIST      = "$ROOT\dist-windows"
$APP_DIR   = "$DIST\app"
$STATIC    = "$APP_DIR\static"
$PYTHON_VER = "3.11.9"
$PYTHON_ZIP = "python-$PYTHON_VER-embed-amd64.zip"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VER/$PYTHON_ZIP"
$GET_PIP    = "https://bootstrap.pypa.io/get-pip.py"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SLMC OMR — Windows Distribution Builder" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# 1. Clean previous build
# ------------------------------------------------------------
Write-Host "[1/7] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path $DIST) { Remove-Item $DIST -Recurse -Force }
New-Item -ItemType Directory -Path $APP_DIR | Out-Null

# ------------------------------------------------------------
# 2. Build frontend
# ------------------------------------------------------------
Write-Host "[2/7] Building frontend..." -ForegroundColor Yellow

$NODE = Get-Command node -ErrorAction SilentlyContinue
if (-not $NODE) {
    Write-Host "  ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Push-Location "$ROOT\frontend"
npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "npm build failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Copy built frontend into backend/static
Write-Host "  Copying frontend build to static folder..."
New-Item -ItemType Directory -Path $STATIC | Out-Null
Copy-Item "$ROOT\frontend\dist\*" $STATIC -Recurse -Force

# ------------------------------------------------------------
# 3. Copy backend application code
# ------------------------------------------------------------
Write-Host "[3/7] Copying backend code..." -ForegroundColor Yellow

$BACKEND_DIRS = @("app", "alembic")
foreach ($d in $BACKEND_DIRS) {
    Copy-Item "$ROOT\backend\$d" "$APP_DIR\$d" -Recurse -Force
}
Copy-Item "$ROOT\backend\requirements.txt" "$APP_DIR\requirements.txt"
Copy-Item "$ROOT\backend\alembic.ini"      "$APP_DIR\alembic.ini" -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# 4. Download Python embeddable
# ------------------------------------------------------------
Write-Host "[4/7] Downloading Python $PYTHON_VER embeddable..." -ForegroundColor Yellow

$PYTHON_DIR = "$APP_DIR\python"
New-Item -ItemType Directory -Path $PYTHON_DIR | Out-Null

$TMP_ZIP = "$env:TEMP\$PYTHON_ZIP"
if (-not (Test-Path $TMP_ZIP)) {
    Invoke-WebRequest -Uri $PYTHON_URL -OutFile $TMP_ZIP -UseBasicParsing
}
Expand-Archive -Path $TMP_ZIP -DestinationPath $PYTHON_DIR -Force

# ------------------------------------------------------------
# 5. Enable pip in embeddable Python
# ------------------------------------------------------------
Write-Host "[5/7] Setting up pip in embeddable Python..." -ForegroundColor Yellow

# Uncomment the import site line in python311._pth so pip works
$pth_file = Get-ChildItem $PYTHON_DIR -Filter "python*._pth" | Select-Object -First 1
if ($pth_file) {
    (Get-Content $pth_file.FullName) -replace "#import site", "import site" |
        Set-Content $pth_file.FullName
}

# Download and run get-pip.py
$GET_PIP_PATH = "$env:TEMP\get-pip.py"
Invoke-WebRequest -Uri $GET_PIP -OutFile $GET_PIP_PATH -UseBasicParsing
& "$PYTHON_DIR\python.exe" $GET_PIP_PATH --no-warn-script-location 2>&1 | Out-Null

# Install all requirements
Write-Host "  Installing Python packages (this may take a few minutes)..."
& "$PYTHON_DIR\python.exe" -m pip install `
    --no-warn-script-location `
    --target "$PYTHON_DIR\Lib\site-packages" `
    -r "$APP_DIR\requirements.txt" 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pip install failed." -ForegroundColor Red; exit 1
}

# ------------------------------------------------------------
# 6. Write launcher and helper scripts
# ------------------------------------------------------------
Write-Host "[6/7] Writing launcher scripts..." -ForegroundColor Yellow

# launch.bat — the main entry point called by the Desktop shortcut
$launch = @"
@echo off
cd /d "%~dp0"
set DATABASE_URL=sqlite+aiosqlite:///./data/slmc_omr.db
set UPLOAD_DIR=%~dp0data\uploads
set JWT_SECRET_KEY=%SLMC_JWT_SECRET%
set CORS_ORIGINS=["http://localhost:8000"]
set FILL_THRESHOLD=0.50

if not exist data mkdir data
if not exist data\uploads mkdir data\uploads

echo Starting SLMC OMR System...
start /min "" python\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir "%~dp0"

:: Wait for server to be ready
:wait
timeout /t 1 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% neq 0 goto wait

start http://localhost:8000
"@
$launch | Set-Content "$APP_DIR\launch.bat" -Encoding ASCII

# stop.bat
$stop = @"
@echo off
echo Stopping SLMC OMR System...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
echo Stopped.
"@
$stop | Set-Content "$APP_DIR\stop.bat" -Encoding ASCII

# ------------------------------------------------------------
# 7. Write Inno Setup data file (list of files to include)
# ------------------------------------------------------------
Write-Host "[7/7] Build complete." -ForegroundColor Green

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  dist-windows\ is ready." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next step: compile the installer" -ForegroundColor Cyan
Write-Host "    1. Install Inno Setup from https://jrsoftware.org/isinfo.php"
Write-Host "    2. Open installer\setup.iss in Inno Setup"
Write-Host "    3. Click Build -> Compile"
Write-Host "    4. The installer will be created as:"
Write-Host "         installer\Output\SLMC-OMR-Setup.exe"
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
