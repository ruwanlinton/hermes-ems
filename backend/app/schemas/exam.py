from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class ExamCreate(BaseModel):
    title: str
    name: str
    exam_date: Optional[datetime] = None
    total_questions: int = 0
    status: str = "draft"
    pass_mark: float = 50.0
    subject_id: Optional[str] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    exam_date: Optional[datetime] = None
    total_questions: Optional[int] = None
    status: Optional[str] = None
    pass_mark: Optional[float] = None
    # subject_id uses Any so explicit `null` can clear the assignment
    subject_id: Any = None


class ExamOut(BaseModel):
    id: str
    title: str
    name: Optional[str]
    question_type: Optional[str]
    exam_date: Optional[datetime]
    total_questions: int
    status: str
    pass_mark: float
    subject_id: Optional[str] = None
    # Populated only when fetched via GET /exams/{id} with eager-loaded subject
    subject_name: Optional[str] = None
    examination_id: Optional[str] = None
    examination_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    question_number: int
    question_type: str  # type1 or type2
    text: Optional[str] = None


class QuestionBulkCreate(BaseModel):
    questions: list[QuestionCreate]


class QuestionOut(BaseModel):
    id: str
    exam_id: str
    question_number: int
    question_type: str
    text: Optional[str]

    class Config:
        from_attributes = True


class AnswerKeyEntry(BaseModel):
    question_id: str
    correct_option: Optional[str] = None  # A-E for Type1
    sub_options: Optional[dict] = None  # {A: true, B: false, ...} for Type2


class AnswerKeyBulk(BaseModel):
    answers: list[AnswerKeyEntry]


class AnswerKeyOut(BaseModel):
    id: str
    question_id: str
    correct_option: Optional[str]
    sub_options: Optional[dict]

    class Config:
        from_attributes = True
