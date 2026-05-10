# Hermes EMS — Enhancement Plan v2.0

> **Status: FINALIZED — ready for implementation.**
> All design decisions have been confirmed. Each phase is a self-contained implementation unit.

---

## Finalized Decisions

| # | Decision | Answer |
|---|----------|--------|
| 1 | Batch scope | **Batch belongs to Examination** — one index number per candidate per sitting, shared across all papers |
| 2 | Candidate deletion | **Hard delete, blocked** — 409 if candidate is enrolled in any batch; admin must unenroll first |
| 3 | Statistics scale | **≤ 5,000 submissions/paper** — Python-level JSONB aggregation is acceptable |
| 4 | Examination status lifecycle | **Yes, implement** — draft → active → closed with full state-transition API and edit locking |
| 5 | `exams` → `papers` rename | **Deferred to Phase 5** — keeps Phases 1–4 non-breaking |

---

## Overview

| Phase | Scope | Key Deliverable |
|-------|-------|----------------|
| 1 | Candidates | Candidate CRUD, CSV/XLSX import/export |
| 2 | Hierarchy | Examination → Subject → Paper model + status lifecycle |
| 3 | Batches | Candidate enrollment, index number assignment, batch-based sheet generation |
| 4 | Statistics | Question, paper, subject, examination, candidate-level stats |
| 5 | Cleanup | Rename `exams` → `papers` across DB, API, frontend |

---

## Phase 1 — Candidates

### DB: new table `candidates`

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(36) UUID PK | `gen_uuid()` default |
| `registration_number` | String(50) UNIQUE NOT NULL | primary identity across all exams |
| `name` | String(255) NOT NULL | |
| `date_of_birth` | Date | nullable |
| `address` | Text | nullable |
| `mobile` | String(30) | nullable |
| `created_at` | DateTime | `server_default now()` |
| `updated_at` | DateTime | `server_default now(), onupdate now()` |

Index: `ix_candidates_registration_number`

**Alembic migration:** `0008_candidates.py` — create table only, no changes to existing tables.

### Backend

**New files:**
- `backend/app/routers/candidates.py`
- `backend/app/schemas/candidate.py`

**Pydantic schemas:**
```
CandidateCreate:  registration_number, name, date_of_birth?, address?, mobile?
CandidateUpdate:  all Optional
CandidateOut:     id, registration_number, name, date_of_birth, address, mobile, created_at, updated_at
ImportResult:     imported: int, updated: int, errors: [{row: int, message: str}]
```

**API endpoints** (prefix `/api/v1`):

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/candidates` | all | `?search=` filters name or reg number; paginated |
| POST | `/candidates` | creator+ | create single |
| GET | `/candidates/{id}` | all | |
| PATCH | `/candidates/{id}` | creator+ | partial update |
| DELETE | `/candidates/{id}` | creator+ | 409 if enrolled in any batch |
| POST | `/candidates/import` | creator+ | CSV or XLSX multipart upload; upsert on `registration_number` |
| GET | `/candidates/export` | all | `?format=csv\|xlsx` |

**Import logic:**
- Detect format by content-type or file extension
- Parse with `csv` stdlib (CSV) or `openpyxl` (XLSX) — already a dependency
- Expected columns: `registration_number`, `name`, `date_of_birth` (opt), `address` (opt), `mobile` (opt)
- Upsert: update if `registration_number` exists, insert if new
- Return `ImportResult`

**Register in `main.py`:** add candidates router.

### Frontend

**New files:**
- `frontend/src/api/candidates.ts`
- `frontend/src/pages/CandidatesPage.tsx` — searchable/paginated table, Import button (file picker), Export button
- `frontend/src/pages/CandidateDetailPage.tsx` — view/edit form; shows enrolled batches in Phase 3

**Navbar:** add "Candidates" link between "Exams" and "Users", visible to all roles.

**New routes in `App.tsx`:**
```
/candidates        → CandidatesPage
/candidates/:id    → CandidateDetailPage
```

---

## Phase 2 — Hierarchy: Examination → Subject → Paper

### DB: new tables

**`examinations`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(36) UUID PK | |
| `title` | String(255) NOT NULL | e.g. "SLMC Part 1 — May 2026" |
| `description` | Text | nullable |
| `exam_date` | DateTime | nullable |
| `status` | String(50) | default `"draft"` |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

**`subjects`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(36) UUID PK | |
| `examination_id` | String(36) FK → `examinations.id` NOT NULL | |
| `name` | String(255) NOT NULL | e.g. "Anatomy" |
| `display_order` | Integer | default 0 |
| `created_at` | DateTime | |

UniqueConstraint: `(examination_id, name)`

**`exams` (existing) — add column:**

| Column | Type | Notes |
|--------|------|-------|
| `subject_id` | String(36) FK → `subjects.id` | nullable (backward compat) |

**Alembic migration `0009_hierarchy.py`:**
1. `CREATE TABLE examinations`
2. `CREATE TABLE subjects`
3. `ALTER TABLE exams ADD COLUMN subject_id`
4. Data migration (within same migration):
   - Insert one "Legacy" Examination record (status = `"active"`)
   - Insert one "Legacy" Subject under it
   - `UPDATE exams SET subject_id = '<legacy_subject_id>'`

No data is lost. Admins reassign existing exams to real subjects via PATCH.

### Examination Status Lifecycle

**States:**

| Status | Meaning |
|--------|---------|
| `draft` | Examination is being configured; subjects, batches, and papers can be added or edited freely |
| `active` | Examination is in progress; submissions are accepted; new subjects/batches may still be added but existing names/dates are locked |
| `closed` | Examination is complete; all editing is locked; results are read-only |

**Allowed transitions:**

| From | To | Who |
|------|----|-----|
| `draft` | `active` | admin, creator |
| `active` | `closed` | admin only |
| `closed` | *(none)* | — closed is terminal |

Attempting a disallowed transition returns **422 Unprocessable Entity** with a message describing the constraint.

**Edit-locking rules:**

| Action | `draft` | `active` | `closed` |
|--------|---------|----------|----------|
| Rename/edit Examination | ✓ | ✗ locked | ✗ locked |
| Add/rename Subject | ✓ | ✗ locked | ✗ locked |
| Delete Subject | ✓ | ✗ locked | ✗ locked |
| Add/rename Batch | ✓ | ✓ | ✗ locked |
| Enroll/unenroll candidates | ✓ | ✓ | ✗ locked |
| Assign Paper to Subject | ✓ | ✓ | ✗ locked |
| Upload Submissions | ✓ | ✓ | ✗ locked |
| View Results / Export | ✓ | ✓ | ✓ |

**Backend enforcement:** each mutating endpoint checks `examination.status` before applying changes and returns 409 with `"Examination is {status}: this action is not permitted."` if locked.

### Backend

**New files:**
- `backend/app/routers/examinations.py`
- `backend/app/schemas/examination.py`

**Pydantic schemas:**
```
ExaminationCreate:    title, description?, exam_date?, status?
ExaminationUpdate:    title?, description?, exam_date?  (status NOT updatable via PATCH — use transition endpoint)
TransitionRequest:    target_status: Literal["active", "closed"]
ExaminationOut:       id, title, description, exam_date, status, created_at, updated_at
SubjectCreate:        name, display_order?
SubjectOut:           id, examination_id, name, display_order
SubjectWithPapers:    SubjectOut + papers: List[ExamOut]
ExaminationDetail:    ExaminationOut + subjects: List[SubjectOut]
```

**API endpoints:**

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/examinations` | all | list all |
| POST | `/examinations` | creator+ | create (status defaults to `draft`) |
| GET | `/examinations/{eid}` | all | detail with subjects embedded |
| PATCH | `/examinations/{eid}` | creator+ | update title/description/exam_date; 409 if `active` or `closed` |
| DELETE | `/examinations/{eid}` | admin | block if has subjects; must be `draft` |
| POST | `/examinations/{eid}/transition` | creator+ (active), admin (closed) | `{target_status}` — enforces allowed-transition table |
| GET | `/examinations/{eid}/subjects` | all | list |
| POST | `/examinations/{eid}/subjects` | creator+ | add subject; 409 if not `draft` |
| PATCH | `/examinations/{eid}/subjects/{sid}` | creator+ | rename/reorder; 409 if not `draft` |
| DELETE | `/examinations/{eid}/subjects/{sid}` | creator+ | block if has papers; 409 if not `draft` |
| GET | `/examinations/{eid}/subjects/{sid}/papers` | all | list papers (exams) in subject |

All existing `/exams/*` endpoints unchanged.

### Frontend

**New files:**
- `frontend/src/api/examinations.ts`
- `frontend/src/pages/ExaminationsPage.tsx` — list with subject/paper counts and status badge
- `frontend/src/pages/ExaminationCreatePage.tsx` — form with initial subject input
- `frontend/src/pages/ExaminationDetailPage.tsx` — tree view: examination → subjects → papers + status controls

**Status badge colours:**

| Status | Colour |
|--------|--------|
| `draft` | Grey |
| `active` | Green |
| `closed` | Navy |

**Transition controls (ExaminationDetailPage):**
- `draft` → show **"Activate"** button (creator+); confirm dialog: "This will lock subject and date editing."
- `active` → show **"Close Examination"** button (admin only); confirm dialog: "This will lock all editing permanently."
- `closed` → no transition button; display read-only banner: "This examination is closed."

**Navbar:** Add "Examinations" link (keep "Exams" for now as direct paper access).

**New routes:**
```
/examinations          → ExaminationsPage
/examinations/new      → ExaminationCreatePage
/examinations/:eid     → ExaminationDetailPage
```

**Update `ExamDetailPage.tsx`:** show subject/examination breadcrumb when `subject_id` is set.

---

## Phase 3 — Batches and Candidate Enrollment

### DB: new tables

**`batches`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(36) UUID PK | |
| `examination_id` | String(36) FK → `examinations.id` NOT NULL | batch belongs to an Examination sitting |
| `name` | String(255) NOT NULL | e.g. "Batch A", "Colombo Centre" |
| `created_at` | DateTime | |

UniqueConstraint: `(examination_id, name)`

**`batch_memberships`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | String(36) UUID PK | |
| `batch_id` | String(36) FK → `batches.id` NOT NULL | |
| `candidate_id` | String(36) FK → `candidates.id` NOT NULL | |
| `index_number` | String(50) NOT NULL | the index number this candidate uses in this sitting |
| `created_at` | DateTime | |

UniqueConstraints: `(batch_id, candidate_id)`, `(batch_id, index_number)`
Index: `(batch_id, index_number)` — hot path for OMR lookup

**`results` — add nullable columns (migration `0011_results_candidate_link.py`):**

| Column | Type |
|--------|------|
| `candidate_id` | String(36) FK → `candidates.id` nullable |
| `batch_membership_id` | String(36) FK → `batch_memberships.id` nullable |

**Alembic migrations:**
- `0010_batches.py` — create `batches` and `batch_memberships`
- `0011_results_candidate_link.py` — add nullable columns to `results`

### Backend

**New files:**
- `backend/app/routers/batches.py`
- `backend/app/schemas/batch.py`

**Pydantic schemas:**
```
BatchCreate:        name
BatchOut:           id, examination_id, name, member_count, created_at
MembershipCreate:   candidate_id, index_number
MembershipOut:      id, batch_id, candidate_id, index_number, candidate_name, candidate_registration_number
ImportResult:       enrolled: int, errors: [{row, message}]
```

**API endpoints:**

| Method | Path | Notes |
|--------|------|-------|
| GET | `/examinations/{eid}/batches` | |
| POST | `/examinations/{eid}/batches` | 409 if examination is `closed` |
| GET | `/examinations/{eid}/batches/{bid}` | includes member count |
| PATCH | `/examinations/{eid}/batches/{bid}` | 409 if `closed` |
| DELETE | `/examinations/{eid}/batches/{bid}` | block if has members; 409 if `closed` |
| GET | `/examinations/{eid}/batches/{bid}/members` | paginated, includes candidate name |
| POST | `/examinations/{eid}/batches/{bid}/members` | enroll single: `{candidate_id, index_number}`; 409 if `closed` |
| POST | `/examinations/{eid}/batches/{bid}/members/import` | CSV cols: `registration_number`, `index_number`; 409 if `closed` |
| DELETE | `/examinations/{eid}/batches/{bid}/members/{mid}` | unenroll; 409 if `closed` |
| GET | `/examinations/{eid}/batches/{bid}/members/export` | CSV/XLSX |
| POST | `/exams/{exam_id}/results/link-candidates` | admin reconciliation: match existing results to candidates by index_number |

**Sheet generation update:** add optional `?batch_id=` query param to `POST /exams/{id}/sheets/generate`. When supplied, pulls index numbers from `batch_memberships` (no CSV required). Existing CSV flow preserved as fallback.

**Reconciliation endpoint logic:**
For each `Result` with `candidate_id = NULL`: find `batch_memberships` where `index_number` matches and the batch's `examination_id` matches the paper's examination. If exactly one match → populate `candidate_id` and `batch_membership_id`. Zero or multiple matches → leave NULL, include in response report.

### Frontend

**New files:**
- `frontend/src/api/batches.ts`
- `frontend/src/pages/BatchDetailPage.tsx` — member table, import/export, enroll modal

**Update `ExaminationDetailPage.tsx`:** add Batches section with link to `BatchDetailPage`.

**Update `SheetGeneratorPage.tsx`:** when the paper belongs to an examination that has batches, show a "Use Batch" selector as an alternative to CSV upload.

**New routes:**
```
/examinations/:eid/batches/:bid    → BatchDetailPage
```

---

## Phase 4 — Statistics

### New API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /exams/{id}/results/question-stats` | Per-question correct/wrong/multiple/unanswered counts and rates across all graded submissions |
| `GET /examinations/{eid}/subjects/{sid}/stats` | Aggregate pass rates across papers in subject; unique candidate count |
| `GET /examinations/{eid}/stats` | Examination-level: per-subject pass rates, overall distribution |
| `GET /candidates/{id}/performance` | Candidate's results across all examinations, per paper breakdown |

**Question-stats response shape:**
```json
[{
  "question_number": 1,
  "question_type": "type1",
  "total_responses": 120,
  "correct": 87,
  "wrong": 28,
  "multiple": 3,
  "unanswered": 2,
  "correct_rate": 0.725
}]
```

**Candidate performance response shape:**
```json
{
  "candidate": { "id": "...", "registration_number": "...", "name": "..." },
  "examinations": [{
    "examination_id": "...",
    "title": "SLMC Part 1 — May 2026",
    "papers": [{
      "paper_id": "...",
      "title": "Anatomy Paper 1",
      "score": 67.5,
      "percentage": 67.5,
      "passed": true
    }],
    "overall_percentage": 62.0
  }]
}
```

**Implementation note:** Question-level stats are computed in Python by iterating `result.question_scores` JSONB across all submissions for a paper. Acceptable up to ~5,000 results; add DB-level caching if volumes exceed this.

### Frontend updates

| File | Change |
|------|--------|
| `ResultsPage.tsx` | Add "Question Analysis" tab — per-question correct rate bar chart + table |
| `ExaminationDetailPage.tsx` | Add stats summary cards (enrolled candidates, papers complete, pass rate) |
| `CandidateDetailPage.tsx` | Add cross-examination performance table |

**New files:**
- `frontend/src/api/stats.ts` — `questionStats()`, `subjectStats()`, `examinationStats()`, `candidatePerformance()`
- `frontend/src/pages/ExaminationStatsPage.tsx` — route `/examinations/:eid/stats`
- `frontend/src/pages/SubjectStatsPage.tsx` — route `/examinations/:eid/subjects/:sid/stats`

---

## Phase 5 — Rename `exams` → `papers` (deferred cleanup)

Once Phases 1–4 are stable:

1. **Migration `0012_rename_exams_to_papers.py`:** rename table, update all FK references
2. **Backend:** rename model class, router file, schema file; update all imports
3. **Frontend:** rename all `/exams/` API calls to `/papers/`; update route paths
4. **Nav:** retire the flat "Exams" link

This is a mechanical change touching ~15 files. Do in one PR with a short maintenance window.

---

## Existing Data Compatibility

| Concern | Handling |
|---------|----------|
| Existing `Exam` rows | Phase 2 migration links them to "Legacy" Subject/Examination automatically |
| Existing `Submission`/`Result` rows | `candidate_id` on `Result` is nullable; left NULL until admin runs reconciliation endpoint |
| OMR pipeline | Completely unchanged — reads `index_number` from QR/bubble, grades as before |
| Sheet generation | Existing CSV flow preserved; batch-based flow is additive |
| Export | Phase 4 adds `candidate_name` + `registration_number` columns to CSV/XLSX export |
| Legacy Examination status | "Legacy" examination created by Phase 2 migration is seeded with status `active` so existing papers remain accessible and submittable without admin action |

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `question_scores` JSONB iteration is O(n) in Python — slow for large result sets | Medium | Acceptable to ~5k (confirmed); add `question_result_details` table if volumes grow |
| `exams` → `papers` rename touches ~15 files simultaneously | Medium | Deferred to Phase 5; do in one coordinated PR |
| Candidate hard-delete blocked by FK if enrolled | Low | Return 409 with clear message; admin unenrolls first |
| Import upsert on `registration_number` silently overwrites names | Low | Document clearly in UI |
| Stats endpoints do Python-level JSONB aggregation | Medium | Revisit with DB jsonb operators if slow |
| Transition to `closed` is irreversible | Low | Confirmation dialog required in UI; only admin can close |

---

## Critical Files for Implementation

```
backend/app/db/models.py              — add all new ORM models
backend/app/main.py                   — register new routers
backend/app/omr/pipeline.py           — unchanged in all phases
backend/alembic/versions/             — new migration files per phase
frontend/src/App.tsx                  — add new routes
frontend/src/components/layout/Navbar.tsx  — add new nav links
frontend/src/components/layout/ExamLayout.tsx  — add breadcrumb in Phase 2
```
