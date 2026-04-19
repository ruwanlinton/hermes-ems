"""add question_type column to exams

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("exams", sa.Column("question_type", sa.String(20), nullable=True))


def downgrade():
    op.drop_column("exams", "question_type")
