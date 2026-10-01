"""add driver and delivery fields to orders

Revision ID: f3b8d6a21c74
Revises: e1a7c3f09b52
Create Date: 2026-10-01 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8d6a21c74'
down_revision: Union[str, None] = 'e1a7c3f09b52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('driver_id', sa.UUID(), nullable=True))
    op.add_column('orders', sa.Column('ready_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('cash_confirmed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('cash_confirmed_by_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_orders_driver_id', 'orders', 'users', ['driver_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_orders_cash_confirmed_by_id', 'orders', 'users', ['cash_confirmed_by_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_orders_driver_id'), 'orders', ['driver_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_orders_driver_id'), table_name='orders')
    op.drop_constraint('fk_orders_cash_confirmed_by_id', 'orders', type_='foreignkey')
    op.drop_constraint('fk_orders_driver_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'cash_confirmed_by_id')
    op.drop_column('orders', 'cash_confirmed_at')
    op.drop_column('orders', 'delivered_at')
    op.drop_column('orders', 'ready_at')
    op.drop_column('orders', 'driver_id')
