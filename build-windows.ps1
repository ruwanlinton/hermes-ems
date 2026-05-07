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
$PG_VER     = "15.6"
$PG_ZIP     = "postgresql-$PG_VER-1-windows-x64-binaries.zip"
$PG_URL     = "https://get.enterprisedb.com/postgresql/$PG_ZIP"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SLMC OMR - Windows Distribution Builder"       -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# 1. Clean previous build
# ------------------------------------------------------------
Write-Host "[1/8] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path $DIST) { Remove-Item $DIST -Recurse -Force }
New-Item -ItemType Directory -Path $APP_DIR | Out-Null

# ------------------------------------------------------------
# 2. Build frontend
# ------------------------------------------------------------
Write-Host "[2/8] Building frontend..." -ForegroundColor Yellow

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
Write-Host "[3/8] Copying backend code..." -ForegroundColor Yellow

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
Write-Host "[4/8] Downloading Python $PYTHON_VER embeddable..." -ForegroundColor Yellow

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
Write-Host "[5/8] Setting up pip in embeddable Python..." -ForegroundColor Yellow

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
# 6. Download and extract PostgreSQL 15
# ------------------------------------------------------------
Write-Host "[6/8] Downloading PostgreSQL $PG_VER..." -ForegroundColor Yellow

$TMP_PG_ZIP = "$env:TEMP\$PG_ZIP"
if (-not (Test-Path $TMP_PG_ZIP)) {
    Write-Host "  Downloading from EDB (~150 MB, please wait)..."
    Invoke-WebRequest -Uri $PG_URL -OutFile $TMP_PG_ZIP -UseBasicParsing
}
Write-Host "  Extracting PostgreSQL binaries..."
# The EDB zip extracts to a 'pgsql' folder at the root
Expand-Archive -Path $TMP_PG_ZIP -DestinationPath $APP_DIR -Force
# Result: $APP_DIR\pgsql\bin\postgres.exe, initdb.exe, pg_ctl.exe, psql.exe ...

# ------------------------------------------------------------
# 7. Write launcher and helper scripts
# ------------------------------------------------------------
Write-Host "[7/8] Writing launcher scripts..." -ForegroundColor Yellow

# config.bat — user-editable configuration file
# Placeholders are replaced by the Inno Setup installer at install time.
$configContent = @'
:: SLMC OMR — Configuration
:: Edit this file to change settings, then restart the application.

:: Database password (set during installation; change with care)
set PG_PASSWORD=PLACEHOLDER_PG_PASSWORD

:: JWT signing secret (set during installation; changing invalidates all sessions)
set JWT_SECRET_KEY=PLACEHOLDER_JWT_SECRET

:: Network ports — change if these conflict with other software on this machine
set PG_PORT=5433
set APP_PORT=8000

:: Bubble fill detection threshold (0.0–1.0, default 0.50)
set FILL_THRESHOLD=0.50
'@
Set-Content -Path "$APP_DIR\config.bat" -Value $configContent -Encoding ASCII

# launch.bat — main entry point
$launchContent = @'
@echo off
cd /d "%~dp0"

if not exist config.bat (
    echo ERROR: config.bat not found. Please re-run the installer.
    pause
    exit /b 1
)
call config.bat

set PGPASSWORD=%PG_PASSWORD%
set DATABASE_URL=postgresql+asyncpg://postgres:%PG_PASSWORD%@localhost:%PG_PORT%/slmc_omr
set UPLOAD_DIR=%~dp0data\uploads
set CORS_ORIGINS=["http://localhost:%APP_PORT%"]
set FILL_THRESHOLD=%FILL_THRESHOLD%
set JWT_SECRET_KEY=%JWT_SECRET_KEY%

if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0data\uploads" mkdir "%~dp0data\uploads"

:: First-run: initialise the PostgreSQL data directory
if not exist "%~dp0data\pgdata\PG_VERSION" (
    echo [Setup] Initialising database for the first time, please wait...
    echo %PG_PASSWORD%> "%~dp0data\pwfile.tmp"
    pgsql\bin\initdb.exe -D "%~dp0data\pgdata" -U postgres --pwfile="%~dp0data\pwfile.tmp" --auth=md5 --encoding=UTF8 > "%~dp0data\setup.log" 2>&1
    del "%~dp0data\pwfile.tmp"
    echo port = %PG_PORT% >> "%~dp0data\pgdata\postgresql.conf"
)

:: Start PostgreSQL
echo [1/3] Starting database...
pgsql\bin\pg_ctl.exe start -D "%~dp0data\pgdata" -l "%~dp0data\pg.log" -w -t 30 > nul 2>&1
if %ERRORLEVEL% neq 0 (
    pgsql\bin\psql.exe -h localhost -p %PG_PORT% -U postgres -c "SELECT 1" > nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Could not start PostgreSQL. See data\pg.log for details.
        pause
        exit /b 1
    )
)

:: Create application database if it does not exist yet
pgsql\bin\psql.exe -h localhost -p %PG_PORT% -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='slmc_omr'" 2>nul | find "1" > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [2/3] Creating application database...
    pgsql\bin\psql.exe -h localhost -p %PG_PORT% -U postgres -c "CREATE DATABASE slmc_omr ENCODING 'UTF8';" > nul 2>&1
)

:: Apply Alembic migrations (safe to run on every start — only applies pending changes)
echo [3/3] Applying database migrations...
python\python.exe -m alembic -c alembic.ini upgrade head > "%~dp0data\migrations.log" 2>&1

echo Starting SLMC OMR System...
start /min "SLMC OMR Server" python\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port %APP_PORT%

:: Wait for server to be ready (up to 30 seconds)
set /a TRIES=0
:wait
timeout /t 1 /nobreak > nul
set /a TRIES+=1
curl -s http://localhost:%APP_PORT%/health > nul 2>&1
if %ERRORLEVEL% equ 0 goto ready
if %TRIES% lss 30 goto wait
echo WARNING: Server took too long to start. Opening browser anyway.
:ready
start http://localhost:%APP_PORT%
'@
Set-Content -Path "$APP_DIR\launch.bat" -Value $launchContent -Encoding ASCII

# stop.bat — shuts down the app and database
$stopContent = @'
@echo off
cd /d "%~dp0"
call config.bat
echo Stopping SLMC OMR System...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%APP_PORT%" ^| find "LISTENING"') do (
    taskkill /PID %%a /F > nul 2>&1
)
pgsql\bin\pg_ctl.exe stop -D "%~dp0data\pgdata" -m fast > nul 2>&1
echo Done.
pause
'@
Set-Content -Path "$APP_DIR\stop.bat" -Value $stopContent -Encoding ASCII

# configure.bat — opens config.bat in Notepad for easy editing
$configureContent = @'
@echo off
cd /d "%~dp0"
echo Opening configuration...
echo After saving, close this window and restart SLMC OMR for changes to take effect.
notepad config.bat
pause
'@
Set-Content -Path "$APP_DIR\configure.bat" -Value $configureContent -Encoding ASCII

# ------------------------------------------------------------
# 8. Done
# ------------------------------------------------------------
Write-Host "[8/8] Build complete." -ForegroundColor Green
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
