import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Batch, BatchMembership, Exam, Question, User
from app.auth.jwt import require_roles
from app.pdf.generator import generate_batch_pdf

router = APIRouter()


@router.post("/exams/{exam_id}/sheets/generate")
async def generate_sheets(
    exam_id: str,
    id_mode: str = Query("qr", description="'qr' | 'bubble_grid' | 'both'"),
    digit_count: int = Query(8, ge=1, le=10, description="Number of digit columns in bubble grid (1–10, bubble_grid mode only)"),
    digit_orientation: str = Query("vertical", description="Digit grid orientation: 'vertical' or 'horizontal'"),
    include_subject: bool = Query(True, description="Include Subject field in header"),
    include_date: bool = Query(True, description="Include Date field in header"),
    include_reg_no: bool = Query(True, description="Include Reg. No field in header"),
    batch_id: Optional[str] = Query(None, description="Use index numbers from this batch instead of CSV"),
    csv_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
):
    """Generate OMR answer sheets PDF.

    id_mode='qr'          – personalised QR-coded sheets (CSV or batch_id required)
    id_mode='bubble_grid' – single blank template; candidate fills digit bubbles (no CSV/batch needed)
    id_mode='both'        – personalised sheets with QR + digit grid (CSV or batch_id required)
    """
    if id_mode not in ("qr", "bubble_grid", "both"):
        raise HTTPException(status_code=400, detail="id_mode must be 'qr', 'bubble_grid', or 'both'")

    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Resolve index numbers
    if id_mode == "bubble_grid":
        index_numbers = [""]
    elif batch_id:
        # Validate batch belongs to this exam's examination
        batch = (await db.execute(select(Batch).where(Batch.id == batch_id))).scalar_one_or_none()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        memberships = (await db.execute(
            select(BatchMembership)
            .where(BatchMembership.batch_id == batch_id)
            .order_by(BatchMembership.index_number)
        )).scalars().all()
        index_numbers = [m.index_number for m in memberships]
        if not index_numbers:
            raise HTTPException(status_code=400, detail="Batch has no members")
    else:
        if csv_file is None:
            raise HTTPException(status_code=400, detail="CSV file or batch_id is required for this id_mode")
        content = await csv_file.read()
        try:
            decoded = content.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            index_numbers = [row["index_number"].strip() for row in reader if row.get("index_number")]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")
        if not index_numbers:
            raise HTTPException(status_code=400, detail="No index numbers found in CSV")

    # Fetch questions
    q_result = await db.execute(
        select(Question)
        .where(Question.exam_id == exam_id)
        .order_by(Question.question_number)
    )
    questions = q_result.scalars().all()
    type1 = [{"question_number": q.question_number} for q in questions if q.question_type == "type1"]
    type2 = [{"question_number": q.question_number} for q in questions if q.question_type == "type2"]

    exam_date = exam.exam_date.strftime("%Y-%m-%d") if exam.exam_date else "TBD"

    pdf_bytes = generate_batch_pdf(
        exam_id=exam_id,
        exam_title=exam.title,
        exam_date=exam_date,
        index_numbers=index_numbers,
        type1_questions=type1,
        type2_questions=type2,
        id_mode=id_mode,
        digit_count=digit_count,
        digit_orientation=digit_orientation,
        include_subject=include_subject,
        include_date=include_date,
        include_reg_no=include_reg_no,
    )

    filename = f"omr_sheets_{exam_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
