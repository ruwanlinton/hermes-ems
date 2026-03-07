import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Exam, Question, User
from app.auth.jwt import get_current_user
from app.pdf.generator import generate_batch_pdf

router = APIRouter()


@router.post("/exams/{exam_id}/sheets/generate")
async def generate_sheets(
    exam_id: str,
    id_mode: str = Form("qr", description="'qr' | 'bubble_grid' | 'both'"),
    csv_file: Optional[UploadFile] = File(None, description="CSV with index_number column (not required for bubble_grid mode)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate OMR answer sheets PDF.

    id_mode='qr'          – personalised QR-coded sheets (CSV required)
    id_mode='bubble_grid' – single blank template; candidate fills digit bubbles (CSV not required)
    id_mode='both'        – personalised sheets with QR + digit grid (CSV required)
    """
    if id_mode not in ("qr", "bubble_grid", "both"):
        raise HTTPException(status_code=400, detail="id_mode must be 'qr', 'bubble_grid', or 'both'")

    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Parse CSV for index numbers (not needed for bubble_grid)
    if id_mode == "bubble_grid":
        index_numbers = [""]
    else:
        if csv_file is None:
            raise HTTPException(status_code=400, detail="CSV file is required for this id_mode")
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
    )

    filename = f"omr_sheets_{exam_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
