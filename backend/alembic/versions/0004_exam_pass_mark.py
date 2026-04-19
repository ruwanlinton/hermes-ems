"""add pass_mark to exams

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("exams", sa.Column("pass_mark", sa.Float(), nullable=False, server_default="50.0"))


def downgrade():
    op.drop_column("exams", "pass_mark")
