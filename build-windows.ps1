# ============================================================
#  SLMC OMR - Windows Standalone Distribution Builder
#
#  Prerequisites (must be in PATH):
#    - Node.js 20+  (https://nodejs.org)
#
#  Usage:
#    powershell -ExecutionPolicy Bypass -File build-windows.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# $PSScriptRoot is always the directory containing this script
$ROOT       = $PSScriptRoot
$DIST       = "$ROOT\dist-windows"
$APP_DIR    = "$DIST\app"
$STATIC     = "$APP_DIR\static"
$PYTHON_VER = "3.11.9"
$PYTHON_ZIP = "python-$PYTHON_VER-embed-amd64.zip"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VER/$PYTHON_ZIP"
$GET_PIP    = "https://bootstrap.pypa.io/get-pip.py"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SLMC OMR - Windows Distribution Builder"       -ForegroundColor Cyan
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
& npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; Pop-Location; exit 1 }
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "npm build failed" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location

Write-Host "  Copying frontend build to static folder..."
New-Item -ItemType Directory -Path $STATIC | Out-Null
Copy-Item "$ROOT\frontend\dist\*" $STATIC -Recurse -Force

# ------------------------------------------------------------
# 3. Copy backend application code
# ------------------------------------------------------------
Write-Host "[3/7] Copying backend code..." -ForegroundColor Yellow

foreach ($d in @("app", "alembic")) {
    Copy-Item "$ROOT\backend\$d" "$APP_DIR\$d" -Recurse -Force
}
Copy-Item "$ROOT\backend\requirements.txt" "$APP_DIR\requirements.txt"
if (Test-Path "$ROOT\backend\alembic.ini") {
    Copy-Item "$ROOT\backend\alembic.ini" "$APP_DIR\alembic.ini"
}

# ------------------------------------------------------------
# 4. Download Python embeddable
# ------------------------------------------------------------
Write-Host "[4/7] Downloading Python $PYTHON_VER embeddable..." -ForegroundColor Yellow

$PYTHON_DIR = "$APP_DIR\python"
New-Item -ItemType Directory -Path $PYTHON_DIR | Out-Null

$TMP_ZIP = "$env:TEMP\$PYTHON_ZIP"
if (-not (Test-Path $TMP_ZIP)) {
    Write-Host "  Downloading from python.org..."
    Invoke-WebRequest -Uri $PYTHON_URL -OutFile $TMP_ZIP -UseBasicParsing
}
Write-Host "  Extracting..."
Expand-Archive -Path $TMP_ZIP -DestinationPath $PYTHON_DIR -Force

# ------------------------------------------------------------
# 5. Enable pip in embeddable Python
# ------------------------------------------------------------
Write-Host "[5/7] Setting up pip in embeddable Python..." -ForegroundColor Yellow

# Uncomment 'import site' in the ._pth file so pip and site-packages work
$pthFile = Get-ChildItem $PYTHON_DIR -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    $content = Get-Content $pthFile.FullName
    $content = $content -replace "#import site", "import site"
    Set-Content -Path $pthFile.FullName -Value $content
}

# Download get-pip.py
$getPipPath = "$env:TEMP\get-pip.py"
Invoke-WebRequest -Uri $GET_PIP -OutFile $getPipPath -UseBasicParsing
& "$PYTHON_DIR\python.exe" $getPipPath --no-warn-script-location 2>&1 | Out-Null

# Install requirements using an argument array (avoids backtick line-continuation issues)
Write-Host "  Installing Python packages (may take several minutes)..."
$pipArgs = @(
    "-m", "pip", "install",
    "--no-warn-script-location",
    "--target", "$PYTHON_DIR\Lib\site-packages",
    "-r", "$APP_DIR\requirements.txt"
)
& "$PYTHON_DIR\python.exe" @pipArgs 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pip install failed." -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# 6. Write launcher and helper scripts
# ------------------------------------------------------------
Write-Host "[6/7] Writing launcher scripts..." -ForegroundColor Yellow

# Use single-quote here-strings so batch syntax (%%a, %~dp0, etc.)
# is written literally without PowerShell variable expansion.

$launchContent = @'
@echo off
cd /d "%~dp0"

set DATABASE_URL=sqlite+aiosqlite:///./data/slmc_omr.db
set UPLOAD_DIR=%~dp0data\uploads
set JWT_SECRET_KEY=%SLMC_OMR_JWT_SECRET%
set CORS_ORIGINS=["http://localhost:8000"]
set FILL_THRESHOLD=0.50

if not exist data mkdir data
if not exist data\uploads mkdir data\uploads

echo Starting SLMC OMR System...
start /min "SLMC OMR Server" python\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

:: Wait for server to be ready (retry up to 30 seconds)
set /a TRIES=0
:wait
timeout /t 1 /nobreak >nul
set /a TRIES+=1
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto ready
if %TRIES% lss 30 goto wait
echo WARNING: Server took too long to start. Opening browser anyway.
:ready
start http://localhost:8000
'@
Set-Content -Path "$APP_DIR\launch.bat" -Value $launchContent -Encoding ASCII

$stopContent = @'
@echo off
echo Stopping SLMC OMR System...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Done.
pause
'@
Set-Content -Path "$APP_DIR\stop.bat" -Value $stopContent -Encoding ASCII

# ------------------------------------------------------------
# 7. Done
# ------------------------------------------------------------
Write-Host "[7/7] Build complete." -ForegroundColor Green
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  dist-windows\app\ is ready."                    -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next: compile the installer"                    -ForegroundColor Cyan
Write-Host "    1. Install Inno Setup:"
Write-Host "         https://jrsoftware.org/isinfo.php"
Write-Host "    2. Open:  installer\setup.iss"
Write-Host "    3. Click: Build -> Compile"
Write-Host "    4. Output: installer\Output\SLMC-OMR-Setup.exe"
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
