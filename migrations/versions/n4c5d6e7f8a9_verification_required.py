"""new accounts must confirm their email before they count as logged in

Set on sign-up only. The accounts that existed before this (most of them
never confirmed) keep working as they did; only Community posting asks them.

Revision ID: n4c5d6e7f8a9
Revises: m3b4c5d6e7f8
Create Date: 2026-11-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'n4c5d6e7f8a9'
down_revision = 'm3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('users')}
    if 'verification_required' not in columns:
        op.add_column('users', sa.Column('verification_required', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column('users', 'verification_required')
