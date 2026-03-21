"""Replace Asgardeo sub with local username/password

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-14 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove existing users — Asgardeo accounts can't be migrated
    op.execute("DELETE FROM users")

    op.drop_column("users", "sub")
    op.add_column("users", sa.Column("username", sa.String(255), nullable=False, server_default=""))
    op.add_column("users", sa.Column("hashed_password", sa.String(255), nullable=False, server_default=""))
    op.create_unique_constraint("uq_users_username", "users", ["username"])

    # Remove server defaults now that table is empty
    op.alter_column("users", "username", server_default=None)
    op.alter_column("users", "hashed_password", server_default=None)


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "hashed_password")
    op.drop_column("users", "username")
    op.add_column("users", sa.Column("sub", sa.String(255), nullable=False, server_default=""))
    op.create_unique_constraint("uq_users_sub", "users", ["sub"])
