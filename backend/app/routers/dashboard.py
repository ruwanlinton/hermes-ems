from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import (
    Examination, Subject, Exam, Question,
    Candidate, Batch, BatchMembership, Result, Submission, User,
)
from app.auth.jwt import require_roles

router = APIRouter()

_any_role = require_roles("admin", "creator", "marker", "viewer")


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    async def count(model, **filters):
        q = select(func.count()).select_from(model)
        for col, val in filters.items():
            q = q.where(getattr(model, col) == val)
        return (await db.execute(q)).scalar_one()

    # Parallel counts
    exams_total      = await count(Examination)
    exams_draft      = await count(Examination, status="draft")
    exams_active     = await count(Examination, status="active")
    exams_closed     = await count(Examination, status="closed")

    subjects_total   = await count(Subject)

    papers_total     = await count(Exam)
    papers_draft     = await count(Exam, status="draft")
    papers_active    = await count(Exam, status="active")
    papers_closed    = await count(Exam, status="closed")

    questions_total  = await count(Question)

    candidates_total = await count(Candidate)
    batches_total    = await count(Batch)
    enrolled_total   = await count(BatchMembership)

    results_total    = await count(Result)
    submissions_total = await count(Submission)

    # Recent examinations (latest 5)
    recent_exams = (await db.execute(
        select(Examination).order_by(Examination.created_at.desc()).limit(5)
    )).scalars().all()

    return {
        "examinations": {
            "total": exams_total,
            "draft": exams_draft,
            "active": exams_active,
            "closed": exams_closed,
        },
        "subjects": {"total": subjects_total},
        "papers": {
            "total": papers_total,
            "draft": papers_draft,
            "active": papers_active,
            "closed": papers_closed,
        },
        "questions": {"total": questions_total},
        "candidates": {"total": candidates_total},
        "batches": {"total": batches_total},
        "enrolled": {"total": enrolled_total},
        "results": {"total": results_total},
        "submissions": {"total": submissions_total},
        "recent_examinations": [
            {
                "id": e.id,
                "title": e.title,
                "status": e.status,
                "exam_date": e.exam_date.isoformat() if e.exam_date else None,
                "created_at": e.created_at.isoformat(),
            }
            for e in recent_exams
        ],
    }
