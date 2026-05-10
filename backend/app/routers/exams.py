from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.db.models import Exam, Subject, User
from app.auth.jwt import require_roles
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut

router = APIRouter()

_any_role = require_roles("admin", "creator", "marker", "viewer")
_creator_plus = require_roles("admin", "creator")
_marker_plus = require_roles("admin", "creator", "marker")


def _enrich_exam_out(exam: Exam) -> ExamOut:
    """Build ExamOut with optional breadcrumb fields from eager-loaded subject."""
    out = ExamOut.model_validate(exam)
    if exam.subject:
        out = out.model_copy(update={
            "subject_name": exam.subject.name,
            "examination_id": exam.subject.examination_id,
            "examination_title": (
                exam.subject.examination.title
                if exam.subject.examination else None
            ),
        })
    return out


@router.get("/exams", response_model=List[ExamOut])
async def list_exams(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    result = await db.execute(select(Exam).order_by(Exam.created_at.desc()))
    return result.scalars().all()


@router.post("/exams", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    exam = Exam(**payload.model_dump())
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam


@router.get("/exams/{exam_id}", response_model=ExamOut)
async def get_exam(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    result = await db.execute(
        select(Exam)
        .options(selectinload(Exam.subject).selectinload(Subject.examination))
        .where(Exam.id == exam_id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return _enrich_exam_out(exam)


@router.patch("/exams/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_marker_plus),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    await db.commit()
    await db.refresh(exam)
    return exam


@router.delete("/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    await db.delete(exam)
    await db.commit()
