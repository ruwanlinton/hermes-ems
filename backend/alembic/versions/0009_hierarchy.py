"""add examination/subject hierarchy and link exams to subjects

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-10
"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create examinations table
    op.create_table(
        "examinations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("exam_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # 2. Create subjects table
    op.create_table(
        "subjects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("examination_id", sa.String(36), sa.ForeignKey("examinations.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("examination_id", "name", name="uq_subjects_examination_name"),
    )

    # 3. Add subject_id to exams (nullable for backward compat)
    op.add_column(
        "exams",
        sa.Column("subject_id", sa.String(36), sa.ForeignKey("subjects.id"), nullable=True),
    )

    # 4. Data migration — seed "Legacy" examination + subject and link existing exams
    conn = op.get_bind()

    # Only seed if there are existing exams that need a subject
    result = conn.execute(sa.text("SELECT COUNT(*) FROM exams")).scalar()
    if result and result > 0:
        legacy_exam_id = str(uuid.uuid4())
        legacy_subject_id = str(uuid.uuid4())

        conn.execute(
            sa.text(
                "INSERT INTO examinations (id, title, description, status, created_at, updated_at) "
                "VALUES (:id, :title, :desc, :status, NOW(), NOW())"
            ),
            {
                "id": legacy_exam_id,
                "title": "Legacy",
                "desc": "Auto-created to hold papers that existed before the examination hierarchy was introduced.",
                "status": "active",
            },
        )
        conn.execute(
            sa.text(
                "INSERT INTO subjects (id, examination_id, name, display_order, created_at) "
                "VALUES (:id, :eid, :name, 0, NOW())"
            ),
            {"id": legacy_subject_id, "eid": legacy_exam_id, "name": "Legacy"},
        )
        conn.execute(
            sa.text("UPDATE exams SET subject_id = :sid WHERE subject_id IS NULL"),
            {"sid": legacy_subject_id},
        )


def downgrade():
    op.drop_column("exams", "subject_id")
    op.drop_table("subjects")
    op.drop_table("examinations")
