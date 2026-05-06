# SLMC OMR System — Installation Guide

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Windows Installation (Recommended)](#windows-installation-recommended)
3. [macOS Installation](#macos-installation)
4. [Linux Installation](#linux-installation)
5. [First-Time Setup](#first-time-setup)
6. [Updating the Application](#updating-the-application)
7. [Backup and Data](#backup-and-data)
8. [Uninstalling](#uninstalling)
9. [Troubleshooting](#troubleshooting)

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk space | 5 GB free | 10 GB free |
| CPU | Dual-core | Quad-core |
| OS | Windows 10 64-bit, macOS 12, Ubuntu 20.04 | Windows 11, macOS 14, Ubuntu 22.04 |
| Internet | Required for initial install only | — |

---

## Windows Installation (Recommended)

Windows installation uses the provided `install.bat` script which automates the entire setup process.

### Prerequisites — install these first (one-time only)

**1. Docker Desktop**

1. Download **Docker Desktop for Windows** from:
   https://www.docker.com/products/docker-desktop/
2. Run the installer. When prompted, keep **"Use WSL 2 instead of Hyper-V"** selected.
3. Restart your computer when asked.
4. After restart, launch **Docker Desktop** from the Start menu and wait until the taskbar icon shows **"Engine running"**.

> If Docker Desktop prompts you to install a WSL 2 kernel update, follow the link and install it before continuing.

**2. Git for Windows**

1. Download from: https://git-scm.com/download/win
2. Run the installer with default options.

---

### Running the Installer

1. Download **`install.bat`** from:
   https://github.com/ruwanlinton/slmc-exam-omr/raw/main/install.bat

2. Make sure **Docker Desktop is running** (taskbar icon shows "Engine running").

3. Double-click `install.bat`.

The script will automatically:

| Step | What happens |
|------|-------------|
| Check Git | Exits with a download link if Git is not found |
| Check Docker | Exits with a download link if Docker is not found |
| Check Docker Engine | Exits with instructions if Docker Desktop is not running |
| Download application | Clones the repo to `%USERPROFILE%\slmc-omr` |
| Configure secret key | Generates a random `JWT_SECRET_KEY` and saves it to `.env` |
| Build and start | Runs `docker compose up --build` in the background |
| Create shortcuts | Adds **SLMC OMR** shortcut to your Desktop, and creates `start.bat` and `stop.bat` |
| Open browser | Opens `http://localhost:3000` automatically when ready |

> The first run downloads and builds the application containers (~500 MB). This takes **5–10 minutes** depending on your internet speed. The window will show progress throughout.

4. When the installer finishes, the browser will open at **http://localhost:3000**.

5. Log in with the default administrator account:
   - **Username:** `admin`
   - **Password:** `admin123`

   **Change this password immediately** — see [First-Time Setup](#first-time-setup).

---

### Starting and Stopping (Daily Use)

**To start the application:**
- Double-click the **SLMC OMR** shortcut on your Desktop, **or**
- Run `start.bat` in `%USERPROFILE%\slmc-omr`

> Docker Desktop must be running before starting the application.

**To stop the application:**
- Run `stop.bat` in `%USERPROFILE%\slmc-omr`

Your data is preserved between restarts.

---

### Updating the Application (Windows)

Re-running `install.bat` will automatically pull the latest version of the application and rebuild the containers. Your data and `.env` configuration are preserved.

---

## macOS Installation

### Step 1 — Install Docker Desktop

1. Download **Docker Desktop for Mac** from: https://www.docker.com/products/docker-desktop/
2. Choose the correct version for your Mac:
   - **Apple Silicon (M1/M2/M3/M4):** Download the Apple Silicon installer
   - **Intel:** Download the Intel installer
3. Open the `.dmg` file and drag Docker to Applications.
4. Launch Docker Desktop and wait for "Engine running".

### Step 2 — Download the Application

Open **Terminal** and run:

```bash
git clone https://github.com/ruwanlinton/slmc-exam-omr.git
cd slmc-exam-omr
```

### Step 3 — Configure a Secret Key

```bash
echo "JWT_SECRET_KEY=replace-this-with-a-long-random-string" > .env
```

### Step 4 — Start the Application

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

### Step 2 — Download the Application

```bash
git clone https://github.com/ruwanlinton/slmc-exam-omr.git
cd slmc-exam-omr
```

### Step 3 — Configure a Secret Key

```bash
echo "JWT_SECRET_KEY=replace-this-with-a-long-random-string" > .env
```

### Step 4 — Start the Application

```bash
docker compose up --build
```

Open your browser and go to **http://localhost:3000**.

---

## First-Time Setup

After logging in for the first time as `admin`:

### 1. Change the Administrator Password

1. Click the user icon (top-right of the navbar) → **Settings** (or navigate to the Settings page).
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

### Windows

Re-run `install.bat` — it detects the existing installation, pulls the latest code, rebuilds the containers, and restarts the application. Your data and `.env` are preserved.

### macOS / Linux

```bash
cd slmc-exam-omr
docker compose down
git pull origin main
docker compose up --build
```

The database is preserved. Migrations are applied automatically on startup.

---

## Backup and Data

All data is stored in Docker volumes on the host machine.

### What is stored

| Volume | Contents |
|--------|----------|
| `slmc-exam-omr_postgres_data` | All exam, submission, result, and user data (PostgreSQL) |
| `slmc-exam-omr_uploads` | Original scanned sheet images |

### Backing up the database

```bash
docker compose exec postgres pg_dump -U slmc slmc_omr > backup_$(date +%Y%m%d).sql
```

### Restoring from backup

```bash
docker compose exec -T postgres psql -U slmc slmc_omr < backup_20250419.sql
```

### Backing up uploaded images

```bash
docker run --rm -v slmc-exam-omr_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

> **Windows PowerShell note:** Replace `$(date +%Y%m%d)` with a date string manually, e.g. `backup_20250419.sql`.

---

## Uninstalling

### Windows

1. Open Command Prompt and run:
   ```
   cd %USERPROFILE%\slmc-omr
   docker compose down -v
   ```
   > **Warning:** `-v` deletes all data volumes. All exam, submission, result, and user data will be permanently lost. Take a backup first if needed.

2. Delete the application folder:
   - Open File Explorer and delete `%USERPROFILE%\slmc-omr`

3. Delete the Desktop shortcut:
   - Right-click **SLMC OMR** on the Desktop → Delete

4. To free Docker disk space:
   ```
   docker image prune -a
   ```

### macOS / Linux

```bash
cd slmc-exam-omr
docker compose down -v   # stops containers and deletes all data volumes
cd ..
rm -rf slmc-exam-omr
docker image prune -a
```

---

## Troubleshooting

### Docker Desktop is not running

**Symptom:** `docker compose up` fails with "Cannot connect to the Docker daemon".

**Fix:** Open Docker Desktop from the Start menu (Windows) or Applications (macOS) and wait for "Engine running" before retrying.

---

### Port already in use

**Symptom:** Error such as `bind: address already in use` for port 3000 or 8000.

**Fix:** Another application is using that port. Either stop the conflicting application, or edit `docker-compose.yml` and change the left-hand port number:

```yaml
ports:
  - "3001:8080"   # change 3000 to 3001
```

Then access the frontend at `http://localhost:3001` instead.

---

### First run takes very long or seems stuck

**Symptom:** `docker compose up --build` has been running for more than 15 minutes.

**Fix:** Check your internet connection. The first run downloads ~500 MB of base images. Progress is shown in the terminal. If it is stuck on a specific layer for more than 5 minutes, press `Ctrl + C` and retry.

---

### "WSL 2 installation is incomplete" on Windows

**Fix:** Follow the link shown in the Docker Desktop error dialog to install the WSL 2 Linux kernel update package from Microsoft, then restart Docker Desktop.

---

### Login page appears but login fails

**Symptom:** Entering `admin` / `admin123` gives an error.

**Fix:** The backend may still be starting up. Wait 30 seconds and try again. Check the terminal for any error messages from the `backend` service.

---

### Uploaded sheet returns an error

**Symptom:** A submission shows status `error` with a stage like `qr_decode` or `perspective`.

**Possible causes and fixes:**

| Error stage | Likely cause | Fix |
|-------------|-------------|-----|
| `ingest` | Corrupt or unsupported image file | Re-scan and upload again |
| `qr_decode` | QR code damaged or digit grid not filled | Check the sheet; use Reprocess after correcting |
| `perspective` | Alignment marks cropped or obscured | Re-scan ensuring all four corner marks are visible |
| `bubble_detect` | No questions set up for the exam | Add questions and an answer key before uploading |
| `grading` | No answer key saved | Save the answer key, then Reprocess the submission |

---

*For further assistance, contact the SLMC ICT division.*
