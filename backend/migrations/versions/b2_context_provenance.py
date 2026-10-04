"""Track conversion provenance without changing existing content or timestamps."""

import sqlalchemy as sa
from alembic import op

revision = "b2_context_provenance"
down_revision = "7aad0ff7b1ba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("inbox", sa.Column("converted", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("inbox", sa.Column("converted_type", sa.Text(), nullable=True))
    op.add_column("inbox", sa.Column("converted_id", sa.String(36), nullable=True))
    # Old events prove conversion, but cannot identify a destination unambiguously.
    op.execute(
        "UPDATE inbox SET converted = 1 WHERE id IN (SELECT record_id FROM activity WHERE kind = 'inbox' AND action = 'converted')"
    )


def downgrade() -> None:
    with op.batch_alter_table("inbox") as batch:
        batch.drop_column("converted_id")
        batch.drop_column("converted_type")
        batch.drop_column("converted")
