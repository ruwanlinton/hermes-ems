from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.db.session import get_db
from app.db.models import Exam, Question, User
from app.auth.jwt import get_current_user
from app.schemas.exam import QuestionCreate, QuestionBulkCreate, QuestionOut

router = APIRouter()


async def _get_exam_or_404(exam_id: str, db: AsyncSession) -> Exam:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


@router.get("/exams/{exam_id}/questions", response_model=List[QuestionOut])
async def list_questions(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.question_number)
    )
    return result.scalars().all()


@router.post("/exams/{exam_id}/questions", response_model=QuestionOut, status_code=201)
async def create_question(
    exam_id: str,
    payload: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    question = Question(exam_id=exam_id, **payload.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.post("/exams/{exam_id}/questions/bulk", response_model=List[QuestionOut], status_code=201)
async def bulk_create_questions(
    exam_id: str,
    payload: QuestionBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exam = await _get_exam_or_404(exam_id, db)

    # Delete existing questions for idempotent bulk replace
    await db.execute(delete(Question).where(Question.exam_id == exam_id))

    questions = [
        Question(exam_id=exam_id, **q.model_dump()) for q in payload.questions
    ]
    db.add_all(questions)

    # Update exam total_questions
    exam.total_questions = len(questions)

    await db.commit()
    result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.question_number)
    )
    return result.scalars().all()
