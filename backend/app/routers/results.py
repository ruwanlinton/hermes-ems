import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Exam, Result, Submission, Question, AnswerKey, User, Batch, BatchMembership, Subject
from app.auth.jwt import require_roles
from app.schemas.submission import ResultOut, ResultSummary, ResultDetail, QuestionDetail
from app.services.export_service import results_to_csv, results_to_xlsx

router = APIRouter()


async def _get_exam_or_404(exam_id: str, db: AsyncSession) -> Exam:
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _result_out(r: Result) -> ResultOut:
    out = ResultOut.model_validate(r)
    if r.candidate:
        out = out.model_copy(update={
            "candidate_name": r.candidate.name,
            "candidate_registration_number": r.candidate.registration_number,
        })
    return out


@router.get("/exams/{exam_id}/results", response_model=List[ResultOut])
async def list_results(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
):
    await _get_exam_or_404(exam_id, db)
    result = await db.execute(
        select(Result)
        .options(selectinload(Result.candidate))
        .where(Result.exam_id == exam_id)
        .order_by(Result.index_number)
    )
    return [_result_out(r) for r in result.scalars().all()]


@router.get("/exams/{exam_id}/results/{index_number}/detail", response_model=ResultDetail)
async def get_result_detail(
    exam_id: str,
    index_number: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
):
    """Return per-question marked/correct/score breakdown for one candidate."""
    await _get_exam_or_404(exam_id, db)

    # Fetch result
    res = await db.execute(
        select(Result).where(Result.exam_id == exam_id, Result.index_number == index_number)
    )
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    # Fetch raw_answers from the most recent completed submission for this candidate
    sub_res = await db.execute(
        select(Submission)
        .where(Submission.exam_id == exam_id, Submission.index_number == index_number, Submission.status == "completed")
        .order_by(Submission.created_at.desc())
        .limit(1)
    )
    submission = sub_res.scalar_one_or_none()
    raw_answers = submission.raw_answers if submission else {}

    # Fetch questions ordered by number
    q_res = await db.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.question_number)
    )
    questions = q_res.scalars().all()

    # Fetch answer keys
    question_ids = [q.id for q in questions]
    ak_res = await db.execute(
        select(AnswerKey).where(AnswerKey.question_id.in_(question_ids))
    )
    ak_by_qid = {ak.question_id: ak for ak in ak_res.scalars().all()}

    type1_answers = (raw_answers or {}).get("type1", {})
    type2_answers = (raw_answers or {}).get("type2", {})
    question_scores = result.question_scores or {}

    question_details = []
    for q in questions:
        q_num = str(q.question_number)
        ak = ak_by_qid.get(q.id)

        if q.question_type == "type1":
            marked = type1_answers.get(q_num)
            correct = ak.correct_option if ak else None
        else:
            marked = type2_answers.get(q_num)
            correct = ak.sub_options if ak else None

        question_details.append(QuestionDetail(
            question_number=q.question_number,
            question_type=q.question_type,
            marked=marked,
            correct=correct,
            score=question_scores.get(q_num, 0.0),
        ))

    return ResultDetail(
        index_number=index_number,
        score=result.score,
        percentage=result.percentage,
        questions=question_details,
    )


@router.get("/exams/{exam_id}/results/summary", response_model=ResultSummary)
async def get_results_summary(
    exam_id: str,
    pass_mark: float = Query(default=50.0, description="Pass mark percentage"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
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
    _: User = Depends(require_roles("admin", "creator", "marker", "viewer")),
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


@router.post("/exams/{exam_id}/results/link-candidates")
async def link_candidates(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    """Match existing unlinked results to candidates via batch membership index numbers.

    For each Result with candidate_id = NULL, look up batch_memberships where:
    - index_number matches the result's index_number
    - the membership's batch belongs to the same examination as this paper's subject

    Exactly one match → link. Zero or multiple → skip (reported back).
    """
    exam = await _get_exam_or_404(exam_id, db)

    # Resolve examination_id via the exam's subject
    examination_id: str | None = None
    if exam.subject_id:
        sub = (await db.execute(select(Subject).where(Subject.id == exam.subject_id))).scalar_one_or_none()
        if sub:
            examination_id = sub.examination_id

    if not examination_id:
        raise HTTPException(
            status_code=422,
            detail="This paper is not linked to an examination via a subject. Assign it to a subject first.",
        )

    # Fetch all unlinked results for this exam
    unlinked = (await db.execute(
        select(Result)
        .where(Result.exam_id == exam_id, Result.candidate_id.is_(None))
    )).scalars().all()

    linked = 0
    skipped = []

    for result in unlinked:
        # Find matching memberships in any batch under this examination
        matches = (await db.execute(
            select(BatchMembership)
            .join(Batch, Batch.id == BatchMembership.batch_id)
            .where(
                Batch.examination_id == examination_id,
                BatchMembership.index_number == result.index_number,
            )
        )).scalars().all()

        if len(matches) == 1:
            result.candidate_id = matches[0].candidate_id
            result.batch_membership_id = matches[0].id
            linked += 1
        else:
            skipped.append({
                "index_number": result.index_number,
                "reason": "no match" if len(matches) == 0 else f"{len(matches)} matches found",
            })

    await db.commit()
    return {"linked": linked, "skipped": skipped}
