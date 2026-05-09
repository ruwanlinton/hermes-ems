# Hermes Examination Management System (EMS)

Examination Management System including Optical Mark Recognition (OMR) based automated answer sheet generation, marking and analysis.

## Features

- **Exam Management** — Create and manage MCQ exams with Type 1 (single best answer A–E) and Type 2 (extended true/false) questions
- **PDF Sheet Generation** — Generate printable OMR answer sheets with QR codes, digit bubble grids, or both
- **OMR Processing** — Upload scanned sheets; the pipeline auto-corrects perspective, detects filled bubbles, and grades answers
- **Multiple-answer detection** — If a candidate fills more than one bubble for a Type 1 question, it is recorded as "Multiple" and scored as wrong
- **Results** — Score aggregation, pass/fail tracking, per-candidate question breakdown, CSV/XLSX export, score distribution chart
- **Auth** — DB-backed local auth with bcrypt passwords and HS256 JWT tokens; role-based access control (admin, creator, marker, viewer)
- **Deployment** — Windows standalone `.exe` installer (no Docker, no Git) or Docker Compose on any platform

---

## Architecture

```
hermes-ems/
├── backend/          # Python 3.11, FastAPI, SQLAlchemy 2 (async), Alembic
├── frontend/         # React 18, TypeScript, Vite
└── docker-compose.yml
```

---

## Quick Start — Windows Standalone Installer

No Docker, no Git, no prerequisites. Download and run the installer.

### 1. Build the distribution (developer step)

> Requires: Node.js 20+ in PATH, and a Windows machine (or run the script on Windows).

```powershell
powershell -ExecutionPolicy Bypass -File build-windows.ps1
```

This downloads Python 3.11 embeddable, PostgreSQL 15 binaries, builds the React frontend, installs all Python packages, and writes the launcher scripts into `dist-windows\app\`.

### 2. Compile the installer

1. Install [Inno Setup](https://jrsoftware.org/isinfo.php) (free)
2. Open `installer\setup.iss` in Inno Setup
3. Click **Build → Compile**
4. The installer is written to `installer\Output\SLMC-OMR-Setup.exe`

### 3. Distribute

Copy `SLMC-OMR-Setup.exe` to the target Windows machine and double-click to install. The installer:
- Installs to `%LOCALAPPDATA%\SLMC-OMR` (no admin rights required)
- Generates unique JWT and database password secrets
- Creates Desktop and Start Menu shortcuts

**To launch:** double-click the **SLMC OMR** desktop shortcut.
The app opens at `http://localhost:8000` automatically.

Default login: **username** `admin` / **password** `admin123` — change this immediately.

See [INSTALLATION.md](INSTALLATION.md) for full installation and configuration details.

---

## Quick Start — Docker (cross-platform)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS, or Linux)

### 1. Clone the repo

```bash
git clone https://github.com/ruwanlinton/hermes-ems.git
cd hermes-ems
```

### 2. Start everything

```bash
docker compose up --build
```

First run downloads base images, builds containers, and runs DB migrations automatically. Subsequent starts skip the build:

```bash
docker compose up
```

### 3. Open the app

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

Default login: **username** `admin` / **password** `admin123` — change this immediately after first login.

### Stop

```bash
docker compose down
```

Database and uploaded images are persisted in Docker volumes and survive restarts.

### Optional: override settings

Create a `.env` file in the project root:

```env
JWT_SECRET_KEY=your-long-random-secret
JWT_EXPIRE_HOURS=8
```

Docker Compose picks this up automatically on the next `docker compose up`.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Ensure PostgreSQL is running, then:
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Required env vars (create `backend/.env`):
```env
DATABASE_URL=postgresql+asyncpg://slmc:slmc@localhost:5432/slmc_omr
JWT_SECRET_KEY=dev-secret-key
UPLOAD_DIR=/tmp/slmc_uploads
FILL_THRESHOLD=0.50
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Required env vars (create `frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## OMR Pipeline

1. **Ingest** — Decode and validate image bytes
2. **QR Decode** — Extract `exam_id` + `index_number` via pyzbar. Falls back to digit bubble grid if no QR is present
3. **Perspective Correction** — Detect 4 alignment marks → `warpPerspective` to 2480×3508 px
4. **Bubble Detection** — Compute fill ratios against configurable threshold (default 50%)
   - Type 1: single filled bubble → answer; multiple filled → `MULTIPLE` (scored wrong)
5. **Grading** — Type 1: 1 pt per correct answer; Type 2: 0.2 pt per correct sub-option (max 1 pt/question)
6. **Result Upsert** — ON CONFLICT (exam_id, index_number) DO UPDATE so reprocessing overwrites previous results

---

## Sheet Generation Modes

| Mode | Description | CSV required |
|------|-------------|-------------|
| `qr` | QR code at top — one personalised sheet per CSV row | Yes |
| `bubble_grid` | Digit bubble grid for manual index entry | No |
| `both` | QR shifted left + digit grid right | Yes |

---

## Role-Based Access

| Role | Permissions |
|------|-------------|
| `admin` | Full access including user management |
| `creator` | Create/edit exams, generate sheets, upload submissions |
| `marker` | Upload and reprocess submissions, view results |
| `viewer` | Read-only access to submissions and results |

---

## API Reference

All endpoints require `Authorization: Bearer <token>`. Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login → `{access_token, user}` |
| GET/POST | `/exams` | List / create exams |
| GET/PATCH | `/exams/{id}` | Get / update exam |
| GET/POST | `/exams/{id}/questions` | List / bulk-create questions |
| GET/POST | `/exams/{id}/answer-key` | Get / upsert answer key |
| POST | `/exams/{id}/sheets/generate` | Generate PDF (`?id_mode=qr\|bubble_grid\|both`) |
| POST | `/exams/{id}/submissions` | Upload + process single image |
| POST | `/exams/{id}/submissions/batch` | Batch image upload |
| GET | `/exams/{id}/submissions` | List submissions |
| POST | `/exams/{id}/submissions/{sid}/reprocess` | Reprocess from saved image |
| GET | `/exams/{id}/results` | List results |
| GET | `/exams/{id}/results/summary` | Stats + score distribution |
| GET | `/exams/{id}/results/{index}/detail` | Per-question breakdown for one candidate |
| GET | `/exams/{id}/results/export` | CSV or XLSX download |
