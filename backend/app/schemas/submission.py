from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SubmissionOut(BaseModel):
    id: str
    exam_id: str
    index_number: Optional[str]
    status: str
    raw_answers: Optional[dict]
    error_stage: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResultOut(BaseModel):
    id: str
    exam_id: str
    index_number: str
    score: float
    percentage: float
    question_scores: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResultSummary(BaseModel):
    exam_id: str
    total_candidates: int
    mean_score: float
    mean_percentage: float
    highest_score: float
    lowest_score: float
    pass_count: int
    fail_count: int
    pass_percentage: float
    distribution: list[dict]  # [{range: "0-10", count: N}, ...]
