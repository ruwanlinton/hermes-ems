from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Examination, Subject, Exam, Result, Batch, BatchMembership, User
from sqlalchemy.orm import selectinload
from app.auth.jwt import require_roles
from app.schemas.examination import (
    ExaminationCreate,
    ExaminationUpdate,
    ExaminationOut,
    ExaminationDetail,
    SubjectCreate,
    SubjectUpdate,
    SubjectOut,
    SubjectWithPapers,
    TransitionRequest,
)
from app.schemas.exam import ExamOut
from app.schemas.stats import ExaminationStats, SubjectStats, SubjectStat, PaperStat

router = APIRouter()

_any_role = require_roles("admin", "creator", "marker", "viewer")
_creator_plus = require_roles("admin", "creator")
_admin_only = require_roles("admin")

# Allowed status transitions: {current: allowed_targets}
_TRANSITIONS = {
    "draft": {"active"},
    "active": {"closed"},
    "closed": set(),
}
# Who can trigger each transition
_TRANSITION_ROLES = {
    "active": {"admin", "creator"},
    "closed": {"admin"},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_examination_or_404(eid: str, db: AsyncSession) -> Examination:
    exam = (await db.execute(select(Examination).where(Examination.id == eid))).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return exam


async def _get_subject_or_404(eid: str, sid: str, db: AsyncSession) -> Subject:
    sub = (await db.execute(
        select(Subject).where(Subject.id == sid, Subject.examination_id == eid)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    return sub


def _assert_not_locked(examination: Examination, allowed_statuses: set[str], action: str):
    if examination.status not in allowed_statuses:
        raise HTTPException(
            status_code=409,
            detail=f"Examination is '{examination.status}': {action} is not permitted.",
        )


async def _build_detail(examination: Examination, db: AsyncSession) -> ExaminationDetail:
    """Fetch subjects + their papers and assemble ExaminationDetail."""
    subs_result = await db.execute(
        select(Subject)
        .options(selectinload(Subject.exams))
        .where(Subject.examination_id == examination.id)
        .order_by(Subject.display_order, Subject.name)
    )
    subjects = subs_result.scalars().all()

    subject_with_papers = []
    total_papers = 0
    for s in subjects:
        papers = [ExamOut.model_validate(e) for e in sorted(s.exams, key=lambda e: e.title)]
        total_papers += len(papers)
        subject_with_papers.append(
            SubjectWithPapers(
                id=s.id,
                examination_id=s.examination_id,
                name=s.name,
                display_order=s.display_order,
                papers=papers,
            )
        )

    return ExaminationDetail(
        id=examination.id,
        title=examination.title,
        description=examination.description,
        exam_date=examination.exam_date,
        status=examination.status,
        created_at=examination.created_at,
        updated_at=examination.updated_at,
        subjects=subject_with_papers,
        subject_count=len(subjects),
        paper_count=total_papers,
    )


# ---------------------------------------------------------------------------
# Examinations CRUD
# ---------------------------------------------------------------------------

@router.get("/examinations", response_model=list[ExaminationOut])
async def list_examinations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    rows = (await db.execute(
        select(Examination).order_by(Examination.exam_date.desc().nullslast(), Examination.created_at.desc())
    )).scalars().all()
    return rows


@router.post("/examinations", response_model=ExaminationOut, status_code=status.HTTP_201_CREATED)
async def create_examination(
    payload: ExaminationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    examination = Examination(**payload.model_dump())
    db.add(examination)
    await db.commit()
    await db.refresh(examination)
    return examination


@router.get("/examinations/{eid}", response_model=ExaminationDetail)
async def get_examination(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    examination = await _get_examination_or_404(eid, db)
    return await _build_detail(examination, db)


@router.patch("/examinations/{eid}", response_model=ExaminationOut)
async def update_examination(
    eid: str,
    payload: ExaminationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    examination = await _get_examination_or_404(eid, db)
    _assert_not_locked(examination, {"draft"}, "editing title, description, or date")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(examination, field, value)
    await db.commit()
    await db.refresh(examination)
    return examination


@router.delete("/examinations/{eid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_examination(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_admin_only),
):
    examination = await _get_examination_or_404(eid, db)
    _assert_not_locked(examination, {"draft"}, "deleting an examination")

    subject_count = (await db.execute(
        select(func.count()).where(Subject.examination_id == eid)
    )).scalar_one()
    if subject_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: examination has subjects. Remove all subjects first.",
        )

    await db.delete(examination)
    await db.commit()


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

@router.post("/examinations/{eid}/transition", response_model=ExaminationOut)
async def transition_examination(
    eid: str,
    payload: TransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_creator_plus),
):
    examination = await _get_examination_or_404(eid, db)

    # Check transition is allowed from current state
    allowed_targets = _TRANSITIONS.get(examination.status, set())
    if payload.target_status not in allowed_targets:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from '{examination.status}' to '{payload.target_status}'.",
        )

    # Check the user has the right role for this specific transition
    required_roles = _TRANSITION_ROLES[payload.target_status]
    user_roles = set(current_user.roles or [])
    if not user_roles & required_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Only {' or '.join(required_roles)} can perform this transition.",
        )

    examination.status = payload.target_status
    await db.commit()
    await db.refresh(examination)
    return examination


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------

@router.get("/examinations/{eid}/subjects", response_model=list[SubjectOut])
async def list_subjects(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    await _get_examination_or_404(eid, db)
    rows = (await db.execute(
        select(Subject)
        .where(Subject.examination_id == eid)
        .order_by(Subject.display_order, Subject.name)
    )).scalars().all()
    return rows


@router.post("/examinations/{eid}/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def add_subject(
    eid: str,
    payload: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    examination = await _get_examination_or_404(eid, db)
    _assert_not_locked(examination, {"draft"}, "adding subjects")

    clash = (await db.execute(
        select(Subject).where(Subject.examination_id == eid, Subject.name == payload.name)
    )).scalar_one_or_none()
    if clash:
        raise HTTPException(status_code=409, detail="A subject with this name already exists in this examination.")

    subject = Subject(examination_id=eid, **payload.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.patch("/examinations/{eid}/subjects/{sid}", response_model=SubjectOut)
async def update_subject(
    eid: str,
    sid: str,
    payload: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    examination = await _get_examination_or_404(eid, db)
    _assert_not_locked(examination, {"draft"}, "renaming subjects")
    subject = await _get_subject_or_404(eid, sid, db)

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] != subject.name:
        clash = (await db.execute(
            select(Subject).where(Subject.examination_id == eid, Subject.name == updates["name"])
        )).scalar_one_or_none()
        if clash:
            raise HTTPException(status_code=409, detail="A subject with this name already exists.")

    for field, value in updates.items():
        setattr(subject, field, value)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/examinations/{eid}/subjects/{sid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    eid: str,
    sid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    examination = await _get_examination_or_404(eid, db)
    _assert_not_locked(examination, {"draft"}, "deleting subjects")
    subject = await _get_subject_or_404(eid, sid, db)

    paper_count = (await db.execute(
        select(func.count()).where(Exam.subject_id == sid)
    )).scalar_one()
    if paper_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: subject has papers. Reassign or delete the papers first.",
        )

    await db.delete(subject)
    await db.commit()


# ---------------------------------------------------------------------------
# Papers under a subject
# ---------------------------------------------------------------------------

@router.get("/examinations/{eid}/subjects/{sid}/papers", response_model=list[ExamOut])
async def list_papers(
    eid: str,
    sid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    await _get_examination_or_404(eid, db)
    await _get_subject_or_404(eid, sid, db)
    rows = (await db.execute(
        select(Exam).where(Exam.subject_id == sid).order_by(Exam.title)
    )).scalars().all()
    return rows


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

async def _paper_stat(paper: Exam, db: AsyncSession) -> PaperStat:
    results = (await db.execute(
        select(Result).where(Result.exam_id == paper.id)
    )).scalars().all()
    total = len(results)
    pass_count = sum(1 for r in results if r.percentage >= paper.pass_mark)
    return PaperStat(
        paper_id=paper.id,
        title=paper.title,
        total_candidates=total,
        pass_count=pass_count,
        pass_rate=round(pass_count / total * 100, 2) if total > 0 else 0.0,
        mean_percentage=round(sum(r.percentage for r in results) / total, 2) if total > 0 else 0.0,
    )


@router.get("/examinations/{eid}/subjects/{sid}/stats", response_model=SubjectStats)
async def get_subject_stats(
    eid: str,
    sid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    await _get_examination_or_404(eid, db)
    subject = await _get_subject_or_404(eid, sid, db)

    papers = (await db.execute(
        select(Exam).where(Exam.subject_id == sid).order_by(Exam.title)
    )).scalars().all()

    return SubjectStats(
        subject_id=sid,
        subject_name=subject.name,
        examination_id=eid,
        papers=[await _paper_stat(p, db) for p in papers],
    )


@router.get("/examinations/{eid}/stats", response_model=ExaminationStats)
async def get_examination_stats(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_any_role),
):
    examination = await _get_examination_or_404(eid, db)

    subjects = (await db.execute(
        select(Subject).where(Subject.examination_id == eid).order_by(Subject.display_order, Subject.name)
    )).scalars().all()

    subject_stats: list[SubjectStat] = []
    for subject in subjects:
        papers = (await db.execute(
            select(Exam).where(Exam.subject_id == subject.id).order_by(Exam.title)
        )).scalars().all()
        subject_stats.append(SubjectStat(
            subject_id=subject.id,
            subject_name=subject.name,
            papers=[await _paper_stat(p, db) for p in papers],
        ))

    # Total enrolled candidates (sum across all batches in this examination)
    total_enrolled = (await db.execute(
        select(func.count(BatchMembership.id))
        .join(Batch, Batch.id == BatchMembership.batch_id)
        .where(Batch.examination_id == eid)
    )).scalar_one()

    return ExaminationStats(
        examination_id=eid,
        title=examination.title,
        status=examination.status,
        total_enrolled_candidates=total_enrolled,
        subjects=subject_stats,
    )


# ---------------------------------------------------------------------------
# Candidate reconciliation — link batch members to existing scanned results
# ---------------------------------------------------------------------------

@router.post("/examinations/{eid}/results/link-candidates")
async def link_examination_candidates(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_creator_plus),
):
    """
    For every paper in this examination, match unlinked Result rows to
    BatchMembership rows by index_number.

    A result is linked when exactly one BatchMembership in any batch of
    this examination shares the same index_number.  Zero or multiple
    matches are left unlinked and returned in the report.
    """
    await _get_examination_or_404(eid, db)

    # All papers under subjects of this examination
    subjects = (await db.execute(
        select(Subject).where(Subject.examination_id == eid)
    )).scalars().all()

    linked_total = 0
    skipped: list[dict] = []

    for subject in subjects:
        papers = (await db.execute(
            select(Exam).where(Exam.subject_id == subject.id)
        )).scalars().all()

        for paper in papers:
            unlinked = (await db.execute(
                select(Result).where(
                    Result.exam_id == paper.id,
                    Result.candidate_id.is_(None),
                )
            )).scalars().all()

            for result in unlinked:
                matches = (await db.execute(
                    select(BatchMembership)
                    .join(Batch, Batch.id == BatchMembership.batch_id)
                    .where(
                        Batch.examination_id == eid,
                        BatchMembership.index_number == result.index_number,
                    )
                )).scalars().all()

                if len(matches) == 1:
                    result.candidate_id = matches[0].candidate_id
                    result.batch_membership_id = matches[0].id
                    linked_total += 1
                else:
                    skipped.append({
                        "paper": paper.title,
                        "index_number": result.index_number,
                        "reason": "no match found" if len(matches) == 0
                                  else f"{len(matches)} candidates share this index number",
                    })

    await db.commit()
    return {"linked": linked_total, "skipped": skipped}
