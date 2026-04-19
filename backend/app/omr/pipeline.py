"""
Full OMR processing pipeline: Ingest → QR Decode → Perspective → Bubble Detect → Grade.
"""
import os
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.db.models import Submission, Result, Question, AnswerKey
from app.omr.ingest import ingest_image, IngestError
from app.omr.qr_decode import decode_qr, QRDecodeError
from app.omr.perspective import correct_perspective, PerspectiveError
from app.omr.bubble_detect import detect_all_answers, detect_digit_grid
from app.omr.grader import grade_submission

settings = get_settings()


async def _get_questions_and_keys(exam_id: str, db: AsyncSession):
    """Fetch questions and answer keys for an exam."""
    q_result = await db.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.question_number)
    )
    questions = q_result.scalars().all()

    if not questions:
        return [], []

    question_ids = [q.id for q in questions]
    ak_result = await db.execute(
        select(AnswerKey).where(AnswerKey.question_id.in_(question_ids))
    )
    answer_keys_db = ak_result.scalars().all()

    # Build answer keys list aligned with questions
    ak_by_qid = {ak.question_id: ak for ak in answer_keys_db}
    answer_keys = []
    for q in questions:
        ak = ak_by_qid.get(q.id)
        answer_keys.append({
            "question_number": q.question_number,
            "question_type": q.question_type,
            "correct_option": ak.correct_option if ak else None,
            "sub_options": ak.sub_options if ak else None,
        })

    questions_list = [
        {"question_number": q.question_number, "question_type": q.question_type}
        for q in questions
    ]

    return questions_list, answer_keys


async def process_submission(
    image_bytes: bytes,
    exam_id: str,
    submission: Submission,
    db: AsyncSession,
    fill_threshold: Optional[float] = None,
    digit_count: int = 8,
    digit_orientation: str = "vertical",
) -> Submission:
    """
    Run the full OMR pipeline for a single submission.
    Updates submission status and creates/updates result on success.
    """
    threshold = fill_threshold or settings.FILL_THRESHOLD

    async def _fail(stage: str, msg: str):
        submission.status = "error"
        submission.error_stage = stage
        submission.error_message = msg
        await db.commit()
        await db.refresh(submission)
        return submission

    # Stage 1: Ingest
    try:
        img = ingest_image(image_bytes)
    except IngestError as e:
        return await _fail("ingest", str(e))

    # Stage 2: QR Decode — if QR is absent/unreadable, fall back to digit bubble grid
    try:
        qr_data = decode_qr(img)
        index_number = qr_data["index_number"]
        qr_exam_id = qr_data["exam_id"]
        if qr_exam_id != exam_id:
            return await _fail("qr_decode", f"QR exam_id mismatch: expected {exam_id}, got {qr_exam_id}")
    except QRDecodeError:
        # Attempt digit grid fallback (perspective-correct the image first)
        try:
            img_pre = correct_perspective(img)
        except Exception:
            img_pre = img
        import cv2 as _cv2
        gray_pre = _cv2.cvtColor(img_pre, _cv2.COLOR_BGR2GRAY)
        index_number = detect_digit_grid(gray_pre, fill_threshold=threshold, n_digits=digit_count, orientation=digit_orientation)
        if not index_number:
            return await _fail(
                "qr_decode",
                "QR code unreadable and digit bubble grid detection failed. "
                "Ensure the sheet is not damaged and all digit columns are filled.",
            )

    submission.index_number = index_number

    # Stage 3: Perspective correction
    try:
        img_warped = correct_perspective(img)
    except Exception as e:
        return await _fail("perspective", str(e))

    # Stage 4: Bubble detection
    questions_list, answer_keys = await _get_questions_and_keys(exam_id, db)
    if not questions_list:
        return await _fail("bubble_detect", "No questions found for this exam")

    type1_qs = [q for q in questions_list if q["question_type"] == "type1"]
    type2_qs = [q for q in questions_list if q["question_type"] == "type2"]

    # Compute section B top to match _draw_section_a's return value exactly:
    #   return max_y_mm + row_h + 5
    #   = SECTION_A_TOP_MM + 8 + (qpc-1)*row_h + row_h + 5
    #   = SECTION_A_TOP_MM + 13 + qpc * row_h
    # When type1 is empty, _draw_section_a returns SECTION_A_TOP_MM directly.
    import math
    from app.pdf.layout_constants import SECTION_A_TOP_MM, SECTION_A_ROW_HEIGHT_MM
    if type1_qs:
        questions_per_col = math.ceil(len(type1_qs) / 3)
        section_b_top = SECTION_A_TOP_MM + 13 + questions_per_col * SECTION_A_ROW_HEIGHT_MM
    else:
        section_b_top = SECTION_A_TOP_MM

    try:
        raw_answers = detect_all_answers(
            img_warped, type1_qs, type2_qs, threshold, section_b_top
        )
    except Exception as e:
        return await _fail("bubble_detect", str(e))

    submission.raw_answers = raw_answers

    # Stage 5: Grade
    try:
        total_score, question_scores = grade_submission(raw_answers, answer_keys, questions_list)
    except Exception as e:
        return await _fail("grading", str(e))

    max_possible = sum(
        1.0 if q["question_type"] == "type1" else 1.0 for q in questions_list
    )
    percentage = (total_score / max_possible * 100) if max_possible > 0 else 0.0

    # Save/update submission
    submission.status = "completed"
    submission.error_stage = None
    submission.error_message = None

    # Upsert result (unique on exam_id + index_number)
    result_stmt = pg_insert(Result).values(
        id=str(uuid.uuid4()),
        exam_id=exam_id,
        index_number=index_number,
        score=total_score,
        percentage=round(percentage, 2),
        question_scores=question_scores,
    ).on_conflict_do_update(
        index_elements=["exam_id", "index_number"],
        set_=dict(
            score=total_score,
            percentage=round(percentage, 2),
            question_scores=question_scores,
        ),
    )
    await db.execute(result_stmt)
    await db.commit()
    await db.refresh(submission)

    return submission
