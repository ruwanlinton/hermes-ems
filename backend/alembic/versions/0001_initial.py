"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("sub", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(255)),
        sa.Column("name", sa.String(255)),
        sa.Column("role", sa.String(50), nullable=False, server_default="admin"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "exams",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("exam_date", sa.DateTime),
        sa.Column("total_questions", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "questions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("question_number", sa.Integer, nullable=False),
        sa.Column("question_type", sa.String(10), nullable=False),
        sa.Column("text", sa.Text),
        sa.UniqueConstraint("exam_id", "question_number", name="uq_question_exam_num"),
    )

    op.create_table(
        "answer_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("question_id", sa.String(36), sa.ForeignKey("questions.id"), nullable=False, unique=True),
        sa.Column("correct_option", sa.String(1)),
        sa.Column("sub_options", postgresql.JSONB),
    )

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("index_number", sa.String(50)),
        sa.Column("image_path", sa.Text),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("raw_answers", postgresql.JSONB),
        sa.Column("error_stage", sa.String(50)),
        sa.Column("error_message", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "results",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("exam_id", sa.String(36), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("index_number", sa.String(50), nullable=False),
        sa.Column("score", sa.Float, nullable=False, server_default="0"),
        sa.Column("percentage", sa.Float, nullable=False, server_default="0"),
        sa.Column("question_scores", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("exam_id", "index_number", name="uq_result_exam_candidate"),
    )

    op.create_index("ix_submissions_exam_id", "submissions", ["exam_id"])
    op.create_index("ix_results_exam_id", "results", ["exam_id"])


def downgrade() -> None:
    op.drop_table("results")
    op.drop_table("submissions")
    op.drop_table("answer_keys")
    op.drop_table("questions")
    op.drop_table("exams")
    op.drop_table("users")
