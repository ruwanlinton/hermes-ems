# SLMC OMR System — Installation Guide

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Windows Installation](#windows-installation)
   - [Option A — Standalone Installer (Recommended)](#option-a--standalone-installer-recommended)
   - [Option B — Docker-based Installation](#option-b--docker-based-installation)
3. [macOS Installation](#macos-installation)
4. [Linux Installation](#linux-installation)
5. [Configuration](#configuration)
6. [First-Time Setup](#first-time-setup)
7. [Updating the Application](#updating-the-application)
8. [Backup and Data](#backup-and-data)
9. [Uninstalling](#uninstalling)
10. [Troubleshooting](#troubleshooting)

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk space | 2 GB free (standalone) / 5 GB free (Docker) | 10 GB free |
| CPU | Dual-core 64-bit | Quad-core |
| OS | Windows 10 64-bit, macOS 12, Ubuntu 20.04 | Windows 11, macOS 14, Ubuntu 22.04 |
| Internet | Required for initial install only | — |

---

## Windows Installation

There are two ways to install on Windows. **Option A** (standalone installer) is recommended for most users — it requires no Docker, no Git, and no prerequisites.

---

### Option A — Standalone Installer (Recommended)

The standalone installer bundles Python, PostgreSQL, and all application code into a single `.exe`. Nothing else needs to be installed first.

#### Installing

1. Obtain `SLMC-OMR-Setup.exe` from your system administrator.

2. Double-click `SLMC-OMR-Setup.exe`.

3. Follow the on-screen wizard. The installer will:
   - Install to `%LOCALAPPDATA%\SLMC-OMR` (no administrator rights required)
   - Generate a unique database password and JWT secret automatically
   - Create a **Desktop shortcut** and **Start Menu** shortcuts

4. Click **Finish**. The application starts automatically and opens in your browser.

5. Log in with the default administrator account:
   - **Username:** `admin`
   - **Password:** `admin123`

   **Change this password immediately** — see [First-Time Setup](#first-time-setup).

#### Starting and stopping

| Action | How |
|--------|-----|
| Start the application | Double-click **SLMC OMR** on the Desktop |
| Stop the application | **Start Menu → SLMC OMR → Stop SLMC OMR** |
| Change settings | **Start Menu → SLMC OMR → Configure SLMC OMR** |

> The application manages its own PostgreSQL database internally. There is no separate database service to start or stop.

#### What happens on first launch

The first time you start the application, it will:
1. Initialise the PostgreSQL database directory (one-time, takes ~10 seconds)
2. Start PostgreSQL on port **5433** (avoids conflicts with any existing PostgreSQL)
3. Create the `slmc_omr` database
4. Apply all database schema migrations
5. Start the web server on port **8000**
6. Open `http://localhost:8000` in your browser

Subsequent launches skip the initialisation step and are faster.

#### Application data location

All data is stored under the installation directory:

| Path | Contents |
|------|----------|
| `%LOCALAPPDATA%\SLMC-OMR\data\pgdata\` | PostgreSQL database files |
| `%LOCALAPPDATA%\SLMC-OMR\data\uploads\` | Original scanned sheet images |
| `%LOCALAPPDATA%\SLMC-OMR\data\pg.log` | PostgreSQL server log |
| `%LOCALAPPDATA%\SLMC-OMR\data\migrations.log` | Alembic migration log |
| `%LOCALAPPDATA%\SLMC-OMR\config.bat` | Configuration file |

---

### Option B — Docker-based Installation

Use this option if you prefer a containerised setup, are deploying on a server, or are running on macOS or Linux.

#### Prerequisites — install these first (one-time only)

**1. Docker Desktop**

1. Download **Docker Desktop for Windows** from: https://www.docker.com/products/docker-desktop/
2. Run the installer. When prompted, keep **"Use WSL 2 instead of Hyper-V"** selected.
3. Restart your computer when asked.
4. After restart, launch **Docker Desktop** and wait until the taskbar icon shows **"Engine running"**.

> If Docker Desktop prompts you to install a WSL 2 kernel update, follow the link and install it before continuing.

**2. Git for Windows**

1. Download from: https://git-scm.com/download/win
2. Run the installer with default options.

#### Running the installer

1. Download **`install.bat`** from:
   https://github.com/ruwanlinton/slmc-exam-omr/raw/main/install.bat

2. Make sure **Docker Desktop is running** (taskbar icon shows "Engine running").

3. Double-click `install.bat`.

The script automatically:

| Step | What happens |
|------|-------------|
| Check Git / Docker | Exits with a download link if either is not found |
| Check Docker Engine | Exits with instructions if Docker Desktop is not running |
| Download application | Clones the repo to `%USERPROFILE%\slmc-omr` |
| Configure secret key | Generates a random `JWT_SECRET_KEY` and saves it to `.env` |
| Build and start | Runs `docker compose up --build` in the background |
| Create shortcuts | Adds **SLMC OMR** shortcut to your Desktop |
| Open browser | Opens `http://localhost:3000` when ready |

> The first run downloads and builds the containers (~500 MB). This takes **5–10 minutes** depending on your internet speed.

4. When the installer finishes, log in at **http://localhost:3000**:
   - **Username:** `admin`
   - **Password:** `admin123`

   **Change this password immediately.**

#### Starting and stopping (Docker)

**Start:** Double-click the **SLMC OMR** Desktop shortcut (or run `start.bat` in `%USERPROFILE%\slmc-omr`)

**Stop:** Run `stop.bat` in `%USERPROFILE%\slmc-omr`

> Docker Desktop must be running before starting the application.

---

## macOS Installation

### Step 1 — Install Docker Desktop

1. Download **Docker Desktop for Mac** from: https://www.docker.com/products/docker-desktop/
2. Choose the correct version:
   - **Apple Silicon (M1/M2/M3/M4):** Download the Apple Silicon installer
   - **Intel:** Download the Intel installer
3. Open the `.dmg` file and drag Docker to Applications.
4. Launch Docker Desktop and wait for "Engine running".

### Step 2 — Download the application

```bash
git clone https://github.com/ruwanlinton/slmc-exam-omr.git
cd slmc-exam-omr
```

### Step 3 — Configure a secret key

```bash
echo "JWT_SECRET_KEY=replace-this-with-a-long-random-string" > .env
```

### Step 4 — Start the application

```bash
docker compose up --build
```

Open your browser and go to **http://localhost:3000**.

---

## Linux Installation

### Step 1 — Install Docker Engine and Docker Compose

```bash
# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow running Docker without sudo (log out and back in after this)
sudo usermod -aG docker $USER
```

### Step 2 — Download the application

```bash
git clone https://github.com/ruwanlinton/slmc-exam-omr.git
cd slmc-exam-omr
```

### Step 3 — Configure a secret key

```bash
echo "JWT_SECRET_KEY=replace-this-with-a-long-random-string" > .env
```

### Step 4 — Start the application

```bash
docker compose up --build
```

Open your browser and go to **http://localhost:3000**.

---

## Configuration

### Standalone installer (Windows)

All settings are stored in `config.bat` inside the installation folder. To edit:

1. Open **Start Menu → SLMC OMR → Configure SLMC OMR** — this opens `config.bat` in Notepad.
2. Edit the desired values.
3. Save the file and **restart the application** for changes to take effect.

**Available settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| `PG_PASSWORD` | (generated) | PostgreSQL password — do not change unless you also reset the database |
| `JWT_SECRET_KEY` | (generated) | JWT signing secret — changing this logs out all active users |
| `PG_PORT` | `5433` | Port PostgreSQL listens on — change if another service is using 5433 |
| `APP_PORT` | `8000` | Port the web application listens on |
| `FILL_THRESHOLD` | `0.50` | Bubble fill detection sensitivity (0.0–1.0) |

> **Warning:** Do not change `PG_PASSWORD` after the database has been initialised unless you also update the PostgreSQL role password manually. If you need to reset everything, see [Uninstalling](#uninstalling) and reinstall.

To open the config file directly without the shortcut, navigate to:
```
%LOCALAPPDATA%\SLMC-OMR\config.bat
```

### Docker-based installation

Settings are controlled via a `.env` file in the project root (where `docker-compose.yml` lives).

```env
JWT_SECRET_KEY=your-long-random-secret
JWT_EXPIRE_HOURS=8
```

Run `docker compose up` after editing for changes to take effect.

---

## First-Time Setup

After logging in for the first time as `admin`:

### 1. Change the Administrator Password

1. Click the user icon (top-right of the navbar) → **Settings**.
2. Enter your current password (`admin123`) and choose a new strong password.
3. Click **Save**.

### 2. Create User Accounts

1. Go to **Settings → Users** (admin only).
2. Click **Add User** and fill in:
   - Username
   - Full name
   - Email
   - Password
   - Role: `admin`, `creator`, `marker`, or `viewer`
3. Share the credentials with each user. Users can change their own password after first login.

### 3. Verify the System is Working

1. Create a test exam from the Dashboard.
2. Generate a single-page PDF sheet.
3. Print and scan the sheet, then upload it to confirm the full pipeline works end-to-end.

---

## Updating the Application

### Standalone installer (Windows)

1. Obtain the latest `SLMC-OMR-Setup.exe`.
2. Run it over the existing installation — the installer will update the application files.
3. Your data (`pgdata`, `uploads`) and `config.bat` are **not overwritten** — secrets and settings are preserved.

### Docker — Windows (install.bat)

Re-run `install.bat`. It detects the existing installation, pulls the latest code, rebuilds the containers, and restarts the application. Your data and `.env` are preserved.

### Docker — macOS / Linux

```bash
cd slmc-exam-omr
docker compose down
git pull origin main
docker compose up --build
```

The database is preserved. Migrations are applied automatically on startup.

---

## Backup and Data

### Standalone installer (Windows)

The database and uploaded images are plain files on disk — no Docker volumes needed.

**Back up the database:**

```bat
cd %LOCALAPPDATA%\SLMC-OMR
pgsql\bin\pg_dump.exe -h localhost -p 5433 -U postgres slmc_omr > backup_%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.sql
```

**Restore from backup:**

```bat
cd %LOCALAPPDATA%\SLMC-OMR
pgsql\bin\psql.exe -h localhost -p 5433 -U postgres slmc_omr < backup_20250507.sql
```

> The database must be running (`launch.bat` started, or start PostgreSQL manually via `pgsql\bin\pg_ctl.exe start -D data\pgdata`) before running backup or restore commands. `PGPASSWORD` must be set — open a Command Prompt, run `call config.bat`, then run the pg_dump / psql command in the same window.

**Back up uploaded images:**

Copy the folder `%LOCALAPPDATA%\SLMC-OMR\data\uploads\` to your backup destination.

**Full backup (simple):**

Copy the entire `%LOCALAPPDATA%\SLMC-OMR\data\` folder to your backup destination while the application is stopped.

### Docker-based installation

All data is stored in Docker volumes.

| Volume | Contents |
|--------|----------|
| `slmc-exam-omr_postgres_data` | All exam, submission, result, and user data |
| `slmc-exam-omr_uploads` | Original scanned sheet images |

**Back up the database:**

```bash
docker compose exec postgres pg_dump -U slmc slmc_omr > backup_$(date +%Y%m%d).sql
```

**Restore from backup:**

```bash
docker compose exec -T postgres psql -U slmc slmc_omr < backup_20250507.sql
```

**Back up uploaded images:**

```bash
docker run --rm -v slmc-exam-omr_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

> **Windows PowerShell note:** Replace `$(date +%Y%m%d)` with a date string manually, e.g. `backup_20250507.sql`.

---

## Uninstalling

### Standalone installer (Windows)

1. Stop the application: **Start Menu → SLMC OMR → Stop SLMC OMR**

2. Uninstall via the Start Menu:
   **Start Menu → SLMC OMR → Uninstall SLMC OMR**
   — or —
   **Settings → Apps → SLMC OMR → Uninstall**

3. The uninstaller removes the application files. Your data folder (`%LOCALAPPDATA%\SLMC-OMR\data\`) is **not deleted** automatically.
   To also delete all data, delete this folder manually:
   ```
   %LOCALAPPDATA%\SLMC-OMR\
   ```
   > **Warning:** This permanently deletes the database and all uploaded images. Take a backup first if needed.

### Docker — Windows

1. Open Command Prompt and run:
   ```
   cd %USERPROFILE%\slmc-omr
   docker compose down -v
   ```
   > **Warning:** `-v` deletes all data volumes. All data will be permanently lost. Take a backup first.

2. Delete the application folder:
   ```
   rmdir /s /q %USERPROFILE%\slmc-omr
   ```

3. Delete the Desktop shortcut.

4. To free Docker disk space:
   ```
   docker image prune -a
   ```

### Docker — macOS / Linux

```bash
cd slmc-exam-omr
docker compose down -v   # stops containers and deletes all data volumes
cd ..
rm -rf slmc-exam-omr
docker image prune -a
```

---

## Troubleshooting

### PostgreSQL fails to start (standalone)

**Symptom:** The console window shows `ERROR: Could not start PostgreSQL. See data\pg.log for details.`

**Fix:**
1. Open `%LOCALAPPDATA%\SLMC-OMR\data\pg.log` to read the error.
2. Most common cause: port 5433 is already in use.
   - Open **Configure SLMC OMR** and change `PG_PORT` to another unused port (e.g. `5434`).
   - Restart the application.
3. If the data directory is corrupt, stop the app, delete `%LOCALAPPDATA%\SLMC-OMR\data\pgdata\`, and restart — the database will be reinitialised (all data is lost; restore from backup).

---

### Port already in use (standalone)

**Symptom:** The application does not open, or `http://localhost:8000` shows "connection refused".

**Fix:** Change `APP_PORT` in `config.bat` via **Configure SLMC OMR**. Use any unused port (e.g. `8001`). Restart the application and navigate to `http://localhost:8001`.

---

### Port already in use (Docker)

**Symptom:** Error such as `bind: address already in use` for port 3000 or 8000.

**Fix:** Edit `docker-compose.yml` and change the left-hand port number:

```yaml
ports:
  - "3001:8080"   # change 3000 to 3001
```

Then access the frontend at `http://localhost:3001`.

---

### Docker Desktop is not running

**Symptom:** `docker compose up` fails with "Cannot connect to the Docker daemon".

**Fix:** Open Docker Desktop from the Start menu (Windows) or Applications (macOS) and wait for "Engine running" before retrying.

---

### First run takes very long or seems stuck (Docker)

**Symptom:** `docker compose up --build` has been running for more than 15 minutes.

**Fix:** Check your internet connection. The first run downloads ~500 MB of base images. If it is stuck on a specific layer for more than 5 minutes, press `Ctrl + C` and retry.

---

### "WSL 2 installation is incomplete" on Windows (Docker)

**Fix:** Follow the link shown in the Docker Desktop error dialog to install the WSL 2 Linux kernel update from Microsoft, then restart Docker Desktop.

---

### Login page appears but login fails

**Symptom:** Entering `admin` / `admin123` gives an error.

**Fix:** The backend may still be starting up. Wait 30 seconds and try again. For standalone installs, check `%LOCALAPPDATA%\SLMC-OMR\data\migrations.log` for any migration errors.

---

### Uploaded sheet returns an error

**Symptom:** A submission shows status `error`.

| Error stage | Likely cause | Fix |
|-------------|-------------|-----|
| `ingest` | Corrupt or unsupported file | Re-scan and upload again |
| `qr_decode` | QR code damaged or digit grid not filled | Check the sheet; use Reprocess after correcting |
| `perspective` | Alignment marks cropped or obscured | Re-scan with all four corner marks visible |
| `bubble_detect` | No questions set up for the exam | Add questions and an answer key before uploading |
| `grading` | No answer key saved | Save the answer key, then Reprocess the submission |

---

*For further assistance, contact the SLMC ICT division.*
