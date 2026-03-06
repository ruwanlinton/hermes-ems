import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models import Exam, Result, User
from app.auth.jwt import get_current_user
from app.schemas.submission import ResultOut, ResultSummary
from app.services.export_service import results_to_csv, results_to_xlsx

router = APIRouter()


async def _get_exam_or_404(exam_id: str, db: AsyncSession) -> Exam:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


@router.get("/exams/{exam_id}/results", response_model=List[ResultOut])
async def list_results(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Result)
        .where(Result.exam_id == exam_id)
        .order_by(Result.index_number)
    )
    return result.scalars().all()


@router.get("/exams/{exam_id}/results/summary", response_model=ResultSummary)
async def get_results_summary(
    exam_id: str,
    pass_mark: float = Query(default=50.0, description="Pass mark percentage"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Result).where(Result.exam_id == exam_id)
    )
    results = result.scalars().all()

    if not results:
        return ResultSummary(
            exam_id=exam_id,
            total_candidates=0,
            mean_score=0.0,
            mean_percentage=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            pass_count=0,
            fail_count=0,
            pass_percentage=0.0,
            distribution=[],
        )

    scores = [r.percentage for r in results]
    total = len(scores)
    mean_pct = sum(scores) / total
    mean_score = sum(r.score for r in results) / total

    pass_count = sum(1 for s in scores if s >= pass_mark)
    fail_count = total - pass_count

    # Distribution in 10% bands
    distribution = []
    for band_start in range(0, 100, 10):
        band_end = band_start + 10
        count = sum(1 for s in scores if band_start <= s < band_end)
        distribution.append({"range": f"{band_start}-{band_end}", "count": count})
    # 100% edge case
    if any(s == 100 for s in scores):
        distribution[-1]["count"] += sum(1 for s in scores if s == 100)

    return ResultSummary(
        exam_id=exam_id,
        total_candidates=total,
        mean_score=round(mean_score, 2),
        mean_percentage=round(mean_pct, 2),
        highest_score=max(scores),
        lowest_score=min(scores),
        pass_count=pass_count,
        fail_count=fail_count,
        pass_percentage=round(pass_count / total * 100, 2),
        distribution=distribution,
    )


@router.get("/exams/{exam_id}/results/export")
async def export_results(
    exam_id: str,
    format: str = Query(default="csv", enum=["csv", "xlsx"]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Result).where(Result.exam_id == exam_id).order_by(Result.index_number)
    )
    results = result.scalars().all()

    if format == "csv":
        data = results_to_csv(results)
        media_type = "text/csv"
        filename = f"results_{exam_id[:8]}.csv"
    else:
        data = results_to_xlsx(results)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"results_{exam_id[:8]}.xlsx"

    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
