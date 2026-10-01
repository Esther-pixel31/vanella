"""add shortcode to payments

Revision ID: d4e8b2c7a913
Revises: c9f3a1e58d27
Create Date: 2026-10-01 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e8b2c7a913'
down_revision: Union[str, None] = 'c9f3a1e58d27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payments', sa.Column('shortcode', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('payments', 'shortcode')
