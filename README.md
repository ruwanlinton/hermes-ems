# SLMC OMR Web Application

Sri Lanka Medical Council — MCQ Licensing Exam OMR Management System.

## Features

- **Exam Management** — Create and manage MCQ exams with Type 1 (single best answer) and Type 2 (extended true/false) questions
- **PDF Sheet Generation** — Generate printable OMR answer sheets with QR codes and alignment marks
- **OMR Processing** — Upload scanned sheets; the pipeline auto-corrects perspective, detects filled bubbles, and grades answers
- **Results** — Score aggregation, pass/fail tracking, CSV/XLSX export, score distribution chart
- **Auth** — Asgardeo OIDC (JWT RS256 validation)
- **Deployment** — Choreo-ready with `component.yaml` files

---

## Architecture

```
slmc-omr/
├── backend/    # Python FastAPI service
├── frontend/   # React + TypeScript (Vite)
└── docker-compose.yml
```

---

## Quick Start (local dev)

### Prerequisites
- Docker & Docker Compose
- Node 20+
- Python 3.11+

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your Asgardeo credentials
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### 3. Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Start PostgreSQL separately, then:
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## OMR Pipeline

1. **Ingest** — Decode and validate image
2. **QR Decode** — Extract `exam_id` + `index_number` via pyzbar / cv2
3. **Perspective Correction** — Detect 4 alignment marks → warpPerspective to 2480×3508px
4. **Bubble Detection** — Compute fill ratios; threshold = 50% (configurable via `FILL_THRESHOLD`)
5. **Grading** — Type 1: 1pt per correct; Type 2: 0.2pt per correct sub-option (max 1pt/question)

---

## Asgardeo Setup

1. Create an OIDC app in Asgardeo console
2. Set Allowed Redirect URLs to your frontend domain + `/` and `/login`
3. Enable **Token Exchange** to get `resourceServerURLs` working
4. Copy `Client ID` and `Organization URL` to env files

---

## Choreo Deployment

1. Push this repo to GitHub
2. In Choreo, create a **Service** component pointing to `backend/` with the provided `component.yaml`
3. Create a **Web Application** component pointing to `frontend/`
4. Add secrets in Choreo for all required env vars
5. Deploy — Choreo injects the DB URL and Asgardeo credentials automatically

---

## API Reference

All endpoints require `Authorization: Bearer <token>` (Asgardeo JWT).

Base path: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/exams` | List / create exams |
| GET/PATCH/DELETE | `/exams/{id}` | Get / update / delete exam |
| GET/POST | `/exams/{id}/questions` | List / create questions |
| POST | `/exams/{id}/questions/bulk` | Bulk replace questions |
| GET/POST | `/exams/{id}/answer-key` | Get / upsert answer key |
| POST | `/exams/{id}/sheets/generate` | Generate PDF (CSV upload) |
| POST | `/exams/{id}/submissions` | Upload + process single image |
| POST | `/exams/{id}/submissions/batch` | Batch image upload |
| GET | `/exams/{id}/submissions` | List submissions |
| POST | `/exams/{id}/submissions/{sid}/reprocess` | Reprocess from saved image |
| GET | `/exams/{id}/results` | List results |
| GET | `/exams/{id}/results/summary` | Stats + distribution |
| GET | `/exams/{id}/results/export` | CSV or XLSX download |
