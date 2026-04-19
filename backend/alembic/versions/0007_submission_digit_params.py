"""add digit_count and digit_orientation to submissions

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("submissions", sa.Column("digit_count", sa.Integer(), nullable=False, server_default="8"))
    op.add_column("submissions", sa.Column("digit_orientation", sa.String(20), nullable=False, server_default="vertical"))


def downgrade():
    op.drop_column("submissions", "digit_orientation")
    op.drop_column("submissions", "digit_count")
