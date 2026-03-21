import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Float, Text, DateTime, ForeignKey,
    UniqueConstraint, Enum as SAEnum, func, Boolean
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    name: Mapped[Optional[str]] = mapped_column(String(255))
    roles: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, active, closed
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )
    results: Mapped[list["Result"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id"), nullable=False)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(10), nullable=False)  # type1, type2
    text: Mapped[Optional[str]] = mapped_column(Text)

    exam: Mapped["Exam"] = relationship(back_populates="questions")
    answer_key: Mapped[Optional["AnswerKey"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", uselist=False
    )

    __table_args__ = (UniqueConstraint("exam_id", "question_number"),)


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("questions.id"), unique=True, nullable=False
    )
    correct_option: Mapped[Optional[str]] = mapped_column(String(1))  # A-E for Type1
    sub_options: Mapped[Optional[dict]] = mapped_column(JSONB)  # {A: true, B: false, ...} for Type2

    question: Mapped["Question"] = relationship(back_populates="answer_key")


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id"), nullable=False)
    index_number: Mapped[Optional[str]] = mapped_column(String(50))
    image_path: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )  # pending, processing, completed, error
    raw_answers: Mapped[Optional[dict]] = mapped_column(JSONB)
    error_stage: Mapped[Optional[str]] = mapped_column(String(50))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    exam: Mapped["Exam"] = relationship(back_populates="submissions")


class Result(Base):
    __tablename__ = "results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id"), nullable=False)
    index_number: Mapped[str] = mapped_column(String(50), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    question_scores: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    exam: Mapped["Exam"] = relationship(back_populates="results")

    __table_args__ = (UniqueConstraint("exam_id", "index_number"),)
