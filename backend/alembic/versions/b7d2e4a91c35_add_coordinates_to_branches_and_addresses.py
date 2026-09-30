"""add coordinates to branches and addresses

Revision ID: b7d2e4a91c35
Revises: 6a71e64e73d6
Create Date: 2026-09-30 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2e4a91c35'
down_revision: Union[str, None] = '6a71e64e73d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('branches', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('branches', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('addresses', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('addresses', sa.Column('longitude', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('addresses', 'longitude')
    op.drop_column('addresses', 'latitude')
    op.drop_column('branches', 'longitude')
    op.drop_column('branches', 'latitude')
