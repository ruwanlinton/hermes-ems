from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel

from app.schemas.exam import ExamOut


class ExaminationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    exam_date: Optional[datetime] = None
    status: str = "draft"


class ExaminationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    exam_date: Optional[datetime] = None
    # status is NOT updatable via PATCH — use the transition endpoint


class TransitionRequest(BaseModel):
    target_status: Literal["active", "closed"]


class ExaminationOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    exam_date: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    name: str
    display_order: int = 0


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    display_order: Optional[int] = None


class SubjectOut(BaseModel):
    id: str
    examination_id: str
    name: str
    display_order: int

    class Config:
        from_attributes = True


class SubjectWithPapers(SubjectOut):
    papers: list[ExamOut]


class ExaminationDetail(ExaminationOut):
    subjects: list[SubjectWithPapers]
    subject_count: int
    paper_count: int
