# SLMC OMR — Claude Code Project Guide

## Project Overview

Sri Lanka Medical Council (SLMC) Optical Mark Recognition (OMR) examination management system.
Generates bubble-sheet answer sheets, processes scanned sheets, and grades candidates automatically.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI 0.111, SQLAlchemy 2 (async), Alembic, PostgreSQL 15 |
| Frontend | React 18, TypeScript, Vite 5, Axios |
| Auth | DB-backed local auth — bcrypt passwords, HS256 JWT access tokens |
| PDF | ReportLab 4.1 + qrcode + Pillow |
| OMR | OpenCV headless 4.9, pyzbar, numpy |
| DB driver | asyncpg |

## Running Locally (macOS, Homebrew, no Docker)

### Backend
```bash
cd /Users/ruwan/Projects/slmc-exam-omr/backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- Virtual env is at `backend/.venv/` (NOT `venv/`)
- `.env` must be loaded from `backend/` directory — always `cd` there first
- Runs on http://localhost:8000

### Frontend
```bash
PATH="/opt/homebrew/bin:/opt/homebrew/Cellar/node/25.7.0/bin:$PATH" \
  npm --prefix /Users/ruwan/Projects/slmc-exam-omr/frontend run dev
```
- Node is at `/opt/homebrew/Cellar/node/25.7.0/bin/node` (not in default PATH for background shells)
- npm is at `/opt/homebrew/bin/npm`
- Runs on http://localhost:5173

### Database
```
PostgreSQL 15 via Homebrew
URL: postgresql+asyncpg://slmc:slmc@localhost:5432/slmc_omr
Run migrations: cd backend && .venv/bin/alembic upgrade head
```

## Key Environment Variables

### backend/.env
```
DATABASE_URL=postgresql+asyncpg://slmc:slmc@localhost:5432/slmc_omr
JWT_SECRET_KEY=slmc-omr-secret-key-change-in-production
UPLOAD_DIR=/tmp/slmc_uploads
FILL_THRESHOLD=0.50
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

### frontend/.env
```
VITE_API_BASE_URL=http://localhost:8000
```

## Project Structure

```
slmc-exam-omr/
├── backend/
│   ├── .venv/                  # Python virtual environment
│   ├── .env                    # Local env vars (not committed)
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, router mounts
│   │   ├── config.py           # Pydantic settings (reads .env)
│   │   ├── auth/jwt.py         # bcrypt password hashing, HS256 JWT creation/validation
│   │   ├── db/
│   │   │   ├── models.py       # SQLAlchemy ORM: User, Exam, Question, AnswerKey, Submission, Result
│   │   │   └── session.py      # Async session factory, get_db dependency
│   │   ├── routers/            # FastAPI routers (one per resource)
│   │   │   ├── exams.py
│   │   │   ├── questions.py
│   │   │   ├── answer_keys.py
│   │   │   ├── sheets.py       # Sheet generation endpoint
│   │   │   ├── submissions.py
│   │   │   └── results.py
│   │   ├── pdf/
│   │   │   ├── layout_constants.py  # SINGLE SOURCE OF TRUTH for all mm positions
│   │   │   └── generator.py         # ReportLab PDF generation
│   │   └── omr/
│   │       ├── ingest.py       # Image loading/validation
│   │       ├── qr_decode.py    # pyzbar QR reading
│   │       ├── perspective.py  # Alignment mark detection, perspective warp
│   │       ├── bubble_detect.py# Fill ratio computation, digit grid detection
│   │       ├── pipeline.py     # Orchestrates all OMR stages
│   │       └── grader.py       # Scores answers against answer key
│   └── alembic/                # DB migrations
└── frontend/
    └── src/
        ├── api/
        │   ├── client.ts       # Axios instance + auth interceptor
        │   └── exams.ts        # All exam/question/sheet API calls
        ├── auth/
        │   ├── authConfig.ts   # API_BASE_URL export
        │   ├── AuthContext.tsx # React context: user, token, login(), logout()
        │   └── AuthGuard.tsx   # Route protection
        ├── components/layout/
        │   ├── Navbar.tsx      # SLMC logo, navy/gold theme
        │   └── Layout.tsx      # Page wrapper
        └── pages/
            ├── LoginPage.tsx
            ├── DashboardPage.tsx
            ├── ExamsPage.tsx
            ├── ExamCreatePage.tsx
            ├── ExamDetailPage.tsx
            ├── SheetGeneratorPage.tsx
            ├── UploadPage.tsx
            ├── SubmissionsPage.tsx
            └── ResultsPage.tsx
```

## API Routes (all prefixed /api/v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | /exams | List all exams |
| POST | /exams | Create exam |
| GET | /exams/{id} | Get exam detail |
| PATCH | /exams/{id} | Update exam |
| GET | /exams/{id}/questions | List questions |
| POST | /exams/{id}/questions/bulk | Bulk create questions |
| GET | /exams/{id}/answer-key | Get answer key |
| POST | /exams/{id}/answer-key | Upsert answer key |
| POST | /exams/{id}/sheets/generate?id_mode=qr\|bubble_grid\|both | Generate PDF |
| POST | /exams/{id}/submissions/upload | Upload scanned sheet images |
| GET | /exams/{id}/submissions | List submissions |
| POST | /exams/{id}/submissions/{sub_id}/reprocess | Re-run OMR pipeline |
| GET | /exams/{id}/results | Get graded results |
| GET /health | Health check |

## Sheet Generation — id_mode

The `sheets/generate` endpoint takes `id_mode` as a **query parameter**:

| Mode | Behaviour | CSV required |
|------|-----------|-------------|
| `qr` | QR code centered at top, one personalised sheet per CSV row | Yes |
| `bubble_grid` | Digit bubble grid (right side), single blank template | No |
| `both` | QR shifted left + digit grid right, one sheet per CSV row | Yes |

The frontend sends id_mode as a query param (NOT a Form field):
```ts
apiClient.post(`/exams/${examId}/sheets/generate?id_mode=${idMode}`, form, { responseType: "blob" })
```
The `csv_file` upload uses `File(None)` annotation in FastAPI for optional parsing.

## Layout Constants — Critical Rule

`backend/app/pdf/layout_constants.py` is the **single source of truth** for all mm positions.
Both `pdf/generator.py` and `omr/bubble_detect.py` import from it.
**Never hard-code positions in either file** — always add/update constants here first.

Key constants:
- `BUBBLE_DIAMETER_MM = 4.5`, `BUBBLE_SPACING_MM = 7.0` — Section A
- `SECTION_B_BUBBLE_DIAMETER_MM = 3.5`, `SECTION_B_BUBBLE_SPACING_MM = 5.0` — Section B
- `ID_GRID_LEFT_MM = 135.0`, `ID_GRID_TOP_MM = 20.0` — Digit bubble grid position
- `ID_GRID_DIGIT_COUNT = 8` — max digit columns in index number grid
- `QR_LEFT_MM_BOTH = 25.0` — QR x position when id_mode=="both"

## OMR Pipeline Stages

1. **Ingest** — load image bytes → OpenCV BGR array
2. **QR Decode** — pyzbar reads `{"exam_id": "...", "index_number": "..."}` from QR
   - On failure: falls back to **digit bubble grid detection** (`detect_digit_grid()`)
   - On both failures: submission marked `error` at stage `qr_decode`
3. **Perspective correction** — detect 4 alignment mark squares, warp to canonical 2480×3508px
4. **Bubble detection** — `detect_type1_answers()`, `detect_type2_answers()`, `detect_digit_grid()`
5. **Grading** — compare raw answers to answer key, compute score/percentage
6. **Upsert result** — ON CONFLICT (exam_id, index_number) DO UPDATE

## Question Types

| Type | Format | Sheet layout |
|------|--------|-------------|
| `type1` | Single best answer A–E | 3 columns, up to ceil(n/3) rows per column |
| `type2` | Extended True/False (T/F per sub-option A–E) | 4 columns, max 15 questions per column |

An exam always has **one question type** — never mixed.

## Auth — Local DB

- `POST /api/v1/auth/login` — JSON `{username, password}` → `{access_token, token_type, user}`
- Passwords hashed with bcrypt (using `bcrypt` library directly, NOT passlib — passlib has bcrypt 5.x incompatibility)
- JWT signed with HS256 using `JWT_SECRET_KEY`, expires in 8 hours (configurable via `JWT_EXPIRE_HOURS`)
- Token stored in `localStorage` as `auth_token`; user info stored as `auth_user`
- Frontend `AuthContext` (`useAuth()`) provides `user`, `token`, `login()`, `logout()`
- Axios interceptor in `api/client.ts` reads token from localStorage on each request
- Default admin seeded on first startup: username=`admin`, password=`admin123` (change immediately)
- Backend must be started from `backend/` directory so `.env` is found

## UI Theme — SLMC Brand

| Element | Value |
|---------|-------|
| Primary navy | `#233654` |
| Gold accent | `#b79a62` |
| Burgundy | `#ba3c3c` |
| Background | `#f2ede4` |
| Font | Roboto (Google Fonts) |
| Logo | https://slmc.gov.lk/images/SLMClogonew2025.png |

## Known Gotchas

1. **ReportLab BytesIO**: Always wrap with `ImageReader(buf)` before passing to `c.drawImage()` — raw BytesIO is not accepted.
2. **ReportLab fill color**: `c.circle(..., fill=0)` still uses the current fill color for the outline background. Always call `c.setFillColor(colors.black)` before drawing text after bubbles. Every draw function that may be called after bubble-drawing functions must reset fill color at its start — `_draw_header()` includes this guard.
3. **uvicorn not in PATH**: Background shells don't load zsh profile. Use `.venv/bin/uvicorn` explicitly.
4. **node not in PATH**: Same issue. Use full path `/opt/homebrew/Cellar/node/25.7.0/bin/node` or prepend to PATH.
5. **id_mode as query param**: Was originally a Form field but multipart parsing was unreliable when no file was attached. Changed to query parameter — keep it that way.
6. **Optional[UploadFile]**: Must use `= File(None)` annotation (not just `= None`) for FastAPI to parse the multipart body.
7. **bcrypt + passlib incompatibility**: bcrypt 5.x raises ValueError during passlib's internal wrap-bug detection. Use `bcrypt` library directly (`bcrypt.hashpw`/`bcrypt.checkpw`), not `passlib.context.CryptContext`.

## Git

- Remote: https://github.com/ruwanlinton/slmc-exam-omr
- Branch: main
- Commit and push after completing each feature or fix set
