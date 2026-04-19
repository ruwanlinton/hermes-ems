import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Exam, Submission, User
from app.auth.jwt import require_roles
from app.config import get_settings
from app.omr.pipeline import process_submission
from app.omr.ingest import is_pdf, pdf_to_images, IngestError
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


async def _process_image_bytes(
    image_bytes: bytes,
    filename: str,
    exam_id: str,
    digit_count: int,
    digit_orientation: str,
    db: AsyncSession,
) -> dict:
    """Save, create submission record, and run the OMR pipeline for one image."""
    image_path = await _save_image(image_bytes, exam_id)
    submission = Submission(
        exam_id=exam_id,
        image_path=image_path,
        status="processing",
        digit_count=digit_count,
        digit_orientation=digit_orientation,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    submission = await process_submission(
        image_bytes, exam_id, submission, db,
        digit_count=digit_count,
        digit_orientation=digit_orientation,
    )
    return {
        "filename": filename,
        "submission_id": submission.id,
        "status": submission.status,
        "index_number": submission.index_number,
        "error_stage": submission.error_stage,
        "error_message": submission.error_message,
    }


@router.post("/exams/{exam_id}/submissions", response_model=SubmissionOut, status_code=201)
async def upload_submission(
    exam_id: str,
    file: UploadFile = File(...),
    digit_count: int = Query(8, ge=1, le=10),
    digit_orientation: str = Query("vertical"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker")),
):
    """Upload a single OMR sheet image or single-page PDF and process it."""
    await _get_exam_or_404(exam_id, db)

    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB.")

    if is_pdf(file_bytes):
        try:
            pages = pdf_to_images(file_bytes)
        except IngestError as e:
            raise HTTPException(status_code=422, detail=str(e))
        if len(pages) > 1:
            raise HTTPException(
                status_code=422,
                detail=f"PDF has {len(pages)} pages. Use the batch upload endpoint for multi-page PDFs.",
            )
        image_bytes = pages[0]
    else:
        image_bytes = file_bytes

    image_path = await _save_image(image_bytes, exam_id)
    submission = Submission(
        exam_id=exam_id,
        image_path=image_path,
        status="processing",
        digit_count=digit_count,
        digit_orientation=digit_orientation,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    submission = await process_submission(
        image_bytes, exam_id, submission, db,
        digit_count=digit_count,
        digit_orientation=digit_orientation,
    )
    return submission


@router.post("/exams/{exam_id}/submissions/batch", status_code=202)
async def batch_upload_submissions(
    exam_id: str,
    files: List[UploadFile] = File(...),
    digit_count: int = Query(8, ge=1, le=10),
    digit_orientation: str = Query("vertical"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker")),
):
    """Upload multiple OMR sheet images or PDFs and process them sequentially.
    PDF files are automatically split into one submission per page."""
    await _get_exam_or_404(exam_id, db)

    results = []
    for file in files:
        file_bytes = await file.read()

        if len(file_bytes) > MAX_UPLOAD_BYTES:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error_message": f"File too large (>{settings.MAX_UPLOAD_SIZE_MB}MB)",
            })
            continue

        if is_pdf(file_bytes):
            try:
                pages = pdf_to_images(file_bytes)
            except IngestError as e:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error_message": str(e),
                })
                continue

            for page_num, image_bytes in enumerate(pages, start=1):
                page_label = f"{file.filename} (page {page_num})"
                result = await _process_image_bytes(
                    image_bytes, page_label, exam_id, digit_count, digit_orientation, db
                )
                results.append(result)
        else:
            result = await _process_image_bytes(
                file_bytes, file.filename, exam_id, digit_count, digit_orientation, db
            )
            results.append(result)

    return {"results": results}


@router.get("/exams/{exam_id}/submissions", response_model=List[SubmissionOut])
async def list_submissions(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
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
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
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


@router.get("/exams/{exam_id}/submissions/{submission_id}/image")
async def get_submission_image(
    exam_id: str,
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
):
    """Download the original scanned image for a submission."""
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_id, Submission.exam_id == exam_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if not sub.image_path or not os.path.exists(sub.image_path):
        raise HTTPException(status_code=404, detail="Image not available")

    filename = f"sheet_{sub.index_number or submission_id[:8]}.jpg"
    return FileResponse(sub.image_path, media_type="image/jpeg", filename=filename)


@router.post("/exams/{exam_id}/submissions/{submission_id}/reprocess", response_model=SubmissionOut)
async def reprocess_submission(
    exam_id: str,
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker")),
):
    """Reprocess a submission from its saved image file using the original digit grid settings."""
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

    sub = await process_submission(
        image_bytes, exam_id, sub, db,
        digit_count=sub.digit_count,
        digit_orientation=sub.digit_orientation,
    )
    return sub
