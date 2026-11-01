"""add users.email_verified_at; retire the self-chosen Teacher role

Account email (verification and password reset) records when the owner proved
they read the inbox. Existing accounts start unverified.

Anyone could pick "Teacher" at signup and wear the badge publicly; the one
account that did was a reported spam post. Everyone becomes Student (the
admin badge comes from the username, not this column).

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-11-02 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'g7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    existing = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('users')}
    if 'email_verified_at' not in existing:
        op.add_column('users', sa.Column('email_verified_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE users SET role = 'Student' WHERE role IS NULL OR role <> 'Student'")


def downgrade():
    op.drop_column('users', 'email_verified_at')
