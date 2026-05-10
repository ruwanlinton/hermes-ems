"""add candidate_id and batch_membership_id to results

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "results",
        sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id"), nullable=True),
    )
    op.add_column(
        "results",
        sa.Column(
            "batch_membership_id",
            sa.String(36),
            sa.ForeignKey("batch_memberships.id"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("results", "batch_membership_id")
    op.drop_column("results", "candidate_id")
