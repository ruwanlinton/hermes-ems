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

### Step 1 — Install Docker Desktop

1. Download **Docker Desktop for Windows** from:
   https://www.docker.com/products/docker-desktop/

2. Run the installer. When prompted, keep **"Use WSL 2 instead of Hyper-V"** selected (recommended).

3. Restart your computer when asked.

4. After restart, launch **Docker Desktop** from the Start menu. Wait until the taskbar icon shows **"Engine running"** (this may take up to a minute on first launch).

> If Docker Desktop prompts you to install a WSL 2 kernel update, follow the link provided and install it before continuing.

### Step 2 — Install Git

1. Download **Git for Windows** from: https://git-scm.com/download/win
2. Run the installer with default options.

### Step 3 — Download the Application

Open **Command Prompt** or **PowerShell** and run:

```
git clone https://github.com/ruwanlinton/slmc-exam-omr.git
cd slmc-exam-omr
```

### Step 4 — Configure a Secret Key

Create a file named `.env` inside the `slmc-exam-omr` folder with the following content:

```
JWT_SECRET_KEY=replace-this-with-a-long-random-string
```

Replace the value with any long random string (e.g. 40+ random characters). This protects user sessions. Keep this file private — do not share it.

### Step 5 — Start the Application

In the same Command Prompt or PowerShell window:

```
docker compose up --build
```

The first run will:
- Download the required base images (~500 MB)
- Build the application containers
- Set up the database automatically

This takes **5–10 minutes** on first run. Subsequent starts take under 30 seconds.

When you see output like:
```
Application startup complete.
```
the system is ready.

### Step 6 — Open the Application

Open your browser and go to: **http://localhost:3000**

Log in with the default administrator account:
- **Username:** `admin`
- **Password:** `admin123`

**Change this password immediately** — see [First-Time Setup](#first-time-setup).

### Starting and Stopping (Daily Use)

**To start the application** (Docker Desktop must be running first):
```
cd slmc-exam-omr
docker compose up
```

**To stop the application:**
Press `Ctrl + C` in the Command Prompt window, then run:
```
docker compose down
```

Your data is saved between restarts.

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

1. Stop the application if it is running:
   ```
   docker compose down
   ```

2. Pull the latest code:
   ```
   git pull origin main
   ```

3. Rebuild and restart:
   ```
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

To remove the application and all its data:

```bash
docker compose down -v   # stops containers and deletes volumes (ALL DATA WILL BE LOST)
```

To also remove the downloaded application files:
```bash
cd ..
rm -rf slmc-exam-omr     # macOS/Linux
# Windows: delete the slmc-exam-omr folder in File Explorer
```

To remove the Docker images (frees disk space):
```bash
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
