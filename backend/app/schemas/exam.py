from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ExamCreate(BaseModel):
    title: str
    exam_date: Optional[datetime] = None
    total_questions: int = 0
    status: str = "draft"


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    exam_date: Optional[datetime] = None
    total_questions: Optional[int] = None
    status: Optional[str] = None


class ExamOut(BaseModel):
    id: str
    title: str
    exam_date: Optional[datetime]
    total_questions: int
    status: str
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
