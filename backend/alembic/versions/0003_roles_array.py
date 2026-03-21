"""Replace single role string with roles JSONB array

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-14 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("roles", postgresql.JSONB, nullable=False, server_default='["admin"]'),
    )
    # Migrate existing single role into a one-element array
    op.execute("UPDATE users SET roles = json_build_array(role)::jsonb")
    op.drop_column("users", "role")
    # Remove the server default now that data is migrated
    op.alter_column("users", "roles", server_default=None)


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(50), nullable=False, server_default="admin"),
    )
    op.execute("UPDATE users SET role = roles->>0")
    op.drop_column("users", "roles")
