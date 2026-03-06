import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
    csv_file: UploadFile = File(..., description="CSV file with index_number column"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate OMR answer sheets PDF for a list of index numbers from CSV."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Parse CSV for index numbers
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
    )

    filename = f"omr_sheets_{exam_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
