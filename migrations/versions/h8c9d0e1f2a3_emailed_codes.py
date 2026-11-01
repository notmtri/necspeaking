"""store one emailed 6-digit code per account

Verification and password reset moved from emailed links to a 6-digit code
typed into the site: the link's token was being lost between the email and
the browser. The code is stored only as an HMAC, with its purpose, expiry and
a count of wrong guesses.

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-11-02 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'h8c9d0e1f2a3'
down_revision = 'g7b8c9d0e1f2'
branch_labels = None
depends_on = None

COLUMNS = (
    sa.Column('email_code_hash', sa.String(length=64), nullable=True),
    sa.Column('email_code_purpose', sa.String(length=20), nullable=True),
    sa.Column('email_code_expires_at', sa.DateTime(), nullable=True),
    sa.Column('email_code_attempts', sa.Integer(), nullable=False, server_default='0'),
)


def upgrade():
    existing = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('users')}
    for column in COLUMNS:
        if column.name not in existing:
            op.add_column('users', column)


def downgrade():
    for column in reversed(COLUMNS):
        op.drop_column('users', column.name)
