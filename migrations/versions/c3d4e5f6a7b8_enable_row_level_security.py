"""enable row level security on every application table

Supabase exposes the public schema through its auto-generated REST API to the
`anon` and `authenticated` roles. With RLS disabled, anyone holding the
project's anon key could read or rewrite every row -- including users.email and
users.password_hash -- without going near this backend. Supabase's advisor
flagged all nine tables as critical.

This app never uses that REST API: the backend connects directly as the table
owner, and owners bypass RLS unless it is forced. So enabling RLS with no
policies closes the REST exposure completely while leaving the backend's access
untouched. Do not add FORCE ROW LEVEL SECURITY; that would lock the backend out
too.

No-op on SQLite, which has no RLS.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


TABLES = (
    'users',
    'user_practice_sessions',
    'community_posts',
    'app_announcements',
    'analysis_jobs',
    'rate_limit_entries',
    'questions',
    'samples',
    'alembic_version',
)


def _existing_tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    existing = _existing_tables()
    for table in TABLES:
        if table in existing:
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def downgrade():
    if op.get_bind().dialect.name != 'postgresql':
        return
    existing = _existing_tables()
    for table in TABLES:
        if table in existing:
            op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
