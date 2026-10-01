"""add dispatch, promised time, delivery code and driver location

Revision ID: a6c2e9d47f18
Revises: f3b8d6a21c74
Create Date: 2026-10-01 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6c2e9d47f18'
down_revision: Union[str, None] = 'f3b8d6a21c74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('promised_by', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('is_scheduled', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('orders', sa.Column('delivery_code', sa.String(length=4), nullable=True))
    op.add_column('orders', sa.Column('delivery_code_attempts', sa.Integer(), server_default='0', nullable=False))

    # Existing open orders get a code too, so they can still be delivered.
    op.execute(
        "UPDATE orders SET delivery_code = lpad(floor(random() * 10000)::int::text, 4, '0') "
        "WHERE delivery_code IS NULL"
    )

    op.add_column('users', sa.Column('last_latitude', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('last_longitude', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('last_location_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_location_at')
    op.drop_column('users', 'last_longitude')
    op.drop_column('users', 'last_latitude')
    op.drop_column('orders', 'delivery_code_attempts')
    op.drop_column('orders', 'delivery_code')
    op.drop_column('orders', 'is_scheduled')
    op.drop_column('orders', 'promised_by')
    op.drop_column('orders', 'dispatched_at')
