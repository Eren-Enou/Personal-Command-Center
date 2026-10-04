"""Shallow record-scoped Topics and Context Notes."""

import sqlalchemy as sa
from alembic import op

revision = "c3_deep_context"
down_revision = "b2_context_provenance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "topics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("parent_type", sa.String(), nullable=False),
        sa.Column("parent_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("normalized_name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.UniqueConstraint(
            "parent_type", "parent_id", "normalized_name", name="uq_topic_parent_name"
        ),
    )
    op.create_table(
        "context_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("parent_type", sa.String(), nullable=False),
        sa.Column("parent_id", sa.String(36), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
    )
    op.create_index(
        "ix_context_notes_parent_created",
        "context_notes",
        ["parent_type", "parent_id", "created_at", "id"],
    )
    op.create_table(
        "context_note_topics",
        sa.Column(
            "note_id",
            sa.String(36),
            sa.ForeignKey("context_notes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "topic_id",
            sa.String(36),
            sa.ForeignKey("topics.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_context_note_topics_topic", "context_note_topics", ["topic_id"])
    op.create_table(
        "context_note_tags",
        sa.Column(
            "note_id",
            sa.String(36),
            sa.ForeignKey("context_notes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id", sa.String(36), sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
        ),
    )


def downgrade() -> None:
    op.drop_table("context_note_tags")
    op.drop_table("context_note_topics")
    op.drop_table("context_notes")
    op.drop_table("topics")
