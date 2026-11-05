"""a question's number on its paper, stored apart from its text

The NEC 25-26 questions are stored as the passage and task alone, without the
"Question N." the older years carry in their text, so the picker had no
number to label and sort them by. NULL = take it from the text, as before.

Revision ID: l2a3b4c5d6e7
Revises: k1f2a3b4c5d6
Create Date: 2026-11-05 16:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'l2a3b4c5d6e7'
down_revision = 'k1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('questions')}
    if 'number' not in columns:
        op.add_column('questions', sa.Column('number', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('questions', 'number')
