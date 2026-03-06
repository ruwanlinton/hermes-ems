from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.db.session import get_db
from app.db.models import Exam, Question, AnswerKey, User
from app.auth.jwt import get_current_user
from app.schemas.exam import AnswerKeyBulk, AnswerKeyOut

router = APIRouter()


@router.get("/exams/{exam_id}/answer-key", response_model=List[AnswerKeyOut])
async def get_answer_key(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    q_result = await db.execute(
        select(Question.id).where(Question.exam_id == exam_id)
    )
    question_ids = [r[0] for r in q_result.all()]

    ak_result = await db.execute(
        select(AnswerKey).where(AnswerKey.question_id.in_(question_ids))
    )
    return ak_result.scalars().all()


@router.post("/exams/{exam_id}/answer-key", response_model=List[AnswerKeyOut], status_code=201)
async def upsert_answer_key(
    exam_id: str,
    payload: AnswerKeyBulk,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    question_ids = [a.question_id for a in payload.answers]

    # Validate all question IDs belong to this exam
    q_result = await db.execute(
        select(Question.id).where(
            Question.exam_id == exam_id, Question.id.in_(question_ids)
        )
    )
    valid_ids = {r[0] for r in q_result.all()}
    for qid in question_ids:
        if qid not in valid_ids:
            raise HTTPException(
                status_code=400, detail=f"Question {qid} not found in exam {exam_id}"
            )

    # Delete existing answer keys for these questions
    await db.execute(delete(AnswerKey).where(AnswerKey.question_id.in_(question_ids)))

    answer_keys = [AnswerKey(**a.model_dump()) for a in payload.answers]
    db.add_all(answer_keys)
    await db.commit()

    ak_result = await db.execute(
        select(AnswerKey).where(AnswerKey.question_id.in_(question_ids))
    )
    return ak_result.scalars().all()
