"""add payments table and order payment fields

Revision ID: c9f3a1e58d27
Revises: b7d2e4a91c35
Create Date: 2026-09-30 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f3a1e58d27'
down_revision: Union[str, None] = 'b7d2e4a91c35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Orders that already exist were all cash-style orders whose loyalty
    # points were awarded when they were placed.
    op.add_column('orders', sa.Column('payment_method', sa.String(length=10), server_default='cash', nullable=False))
    op.add_column('orders', sa.Column('payment_status', sa.String(length=10), server_default='unpaid', nullable=False))
    op.add_column('orders', sa.Column('points_awarded', sa.Boolean(), server_default=sa.true(), nullable=False))

    op.create_table('payments',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('order_id', sa.UUID(), nullable=False),
    sa.Column('method', sa.String(length=10), nullable=False),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.String(length=10), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('merchant_request_id', sa.String(length=100), nullable=True),
    sa.Column('checkout_request_id', sa.String(length=100), nullable=True),
    sa.Column('mpesa_receipt', sa.String(length=30), nullable=True),
    sa.Column('result_code', sa.String(length=20), nullable=True),
    sa.Column('result_desc', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_order_id'), 'payments', ['order_id'], unique=False)
    op.create_index(op.f('ix_payments_checkout_request_id'), 'payments', ['checkout_request_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_checkout_request_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_order_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_column('orders', 'points_awarded')
    op.drop_column('orders', 'payment_status')
    op.drop_column('orders', 'payment_method')
