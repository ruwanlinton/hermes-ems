import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Exam, Submission, User
from app.auth.jwt import get_current_user
from app.config import get_settings
from app.omr.pipeline import process_submission
from app.schemas.submission import SubmissionOut

router = APIRouter()
settings = get_settings()

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


async def _get_exam_or_404(exam_id: str, db: AsyncSession) -> Exam:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


async def _save_image(image_bytes: bytes, exam_id: str) -> str:
    """Save image to upload directory and return path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    path = os.path.join(settings.UPLOAD_DIR, exam_id, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(image_bytes)
    return path


@router.post("/exams/{exam_id}/submissions", response_model=SubmissionOut, status_code=201)
async def upload_submission(
    exam_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a single OMR sheet image and process it."""
    await _get_exam_or_404(exam_id, db)

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    image_path = await _save_image(image_bytes, exam_id)

    submission = Submission(
        exam_id=exam_id,
        image_path=image_path,
        status="processing",
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # Process synchronously for single upload
    submission = await process_submission(image_bytes, exam_id, submission, db)
    return submission


@router.post("/exams/{exam_id}/submissions/batch", status_code=202)
async def batch_upload_submissions(
    exam_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload multiple OMR sheet images and process them sequentially."""
    await _get_exam_or_404(exam_id, db)

    results = []
    for file in files:
        image_bytes = await file.read()

        if len(image_bytes) > MAX_UPLOAD_BYTES:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": f"File too large (>{settings.MAX_UPLOAD_SIZE_MB}MB)",
            })
            continue

        image_path = await _save_image(image_bytes, exam_id)
        submission = Submission(
            exam_id=exam_id,
            image_path=image_path,
            status="processing",
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)

        submission = await process_submission(image_bytes, exam_id, submission, db)
        results.append({
            "filename": file.filename,
            "submission_id": submission.id,
            "status": submission.status,
            "index_number": submission.index_number,
            "error_stage": submission.error_stage,
            "error_message": submission.error_message,
        })

    return {"results": results}


@router.get("/exams/{exam_id}/submissions", response_model=List[SubmissionOut])
async def list_submissions(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Submission)
        .where(Submission.exam_id == exam_id)
        .order_by(Submission.created_at.desc())
    )
    return result.scalars().all()


@router.get("/exams/{exam_id}/submissions/{submission_id}", response_model=SubmissionOut)
async def get_submission(
    exam_id: str,
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id, Submission.exam_id == exam_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@router.post("/exams/{exam_id}/submissions/{submission_id}/reprocess", response_model=SubmissionOut)
async def reprocess_submission(
    exam_id: str,
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reprocess a submission from its saved image file."""
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id, Submission.exam_id == exam_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if not sub.image_path or not os.path.exists(sub.image_path):
        raise HTTPException(status_code=400, detail="Original image not available for reprocessing")

    with open(sub.image_path, "rb") as f:
        image_bytes = f.read()

    sub.status = "processing"
    sub.error_stage = None
    sub.error_message = None
    await db.commit()

    sub = await process_submission(image_bytes, exam_id, sub, db)
    return sub
