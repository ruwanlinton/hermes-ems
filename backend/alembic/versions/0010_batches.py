"""add batches and batch_memberships tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "batches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("examination_id", sa.String(36), sa.ForeignKey("examinations.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("examination_id", "name", name="uq_batches_examination_name"),
    )

    op.create_table(
        "batch_memberships",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("batch_id", sa.String(36), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("index_number", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("batch_id", "candidate_id", name="uq_membership_batch_candidate"),
        sa.UniqueConstraint("batch_id", "index_number", name="uq_membership_batch_index"),
    )
    op.create_index(
        "ix_batch_memberships_batch_index",
        "batch_memberships",
        ["batch_id", "index_number"],
    )


def downgrade():
    op.drop_index("ix_batch_memberships_batch_index", table_name="batch_memberships")
    op.drop_table("batch_memberships")
    op.drop_table("batches")
