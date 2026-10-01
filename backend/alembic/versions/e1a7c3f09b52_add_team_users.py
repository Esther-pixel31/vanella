"""add team users (admin, staff, driver)

Revision ID: e1a7c3f09b52
Revises: d4e8b2c7a913
Create Date: 2026-10-01 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a7c3f09b52'
down_revision: Union[str, None] = 'd4e8b2c7a913'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('full_name', sa.String(length=150), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=True),
    sa.Column('role', sa.String(length=10), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_branch_id'), 'users', ['branch_id'], unique=False)

    # A refresh token now belongs to either a customer or a team user.
    op.alter_column('refresh_tokens', 'customer_id', existing_type=sa.UUID(), nullable=True)
    op.add_column('refresh_tokens', sa.Column('user_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_refresh_tokens_user_id', 'refresh_tokens', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_check_constraint(
        'ck_refresh_tokens_one_owner',
        'refresh_tokens',
        '(customer_id IS NULL) <> (user_id IS NULL)',
    )


def downgrade() -> None:
    op.drop_constraint('ck_refresh_tokens_one_owner', 'refresh_tokens', type_='check')
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_constraint('fk_refresh_tokens_user_id', 'refresh_tokens', type_='foreignkey')
    op.drop_column('refresh_tokens', 'user_id')
    op.execute("DELETE FROM refresh_tokens WHERE customer_id IS NULL")
    op.alter_column('refresh_tokens', 'customer_id', existing_type=sa.UUID(), nullable=False)

    op.drop_index(op.f('ix_users_branch_id'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.drop_table('users')
