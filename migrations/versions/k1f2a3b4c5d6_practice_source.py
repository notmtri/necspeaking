"""record where a practice came from (Analyze or Simulation)

The "Geared Up and Ready To Go" badge counts mock tests, and nothing stored
on an attempt said whether it was one. Attempts saved before this stay NULL
and do not count: their analysis jobs, which knew, are deleted after 72 h.

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-11-04 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'k1f2a3b4c5d6'
down_revision = 'j0e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('user_practice_sessions')}
    if 'source' not in columns:
        op.add_column('user_practice_sessions', sa.Column('source', sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column('user_practice_sessions', 'source')
