"""add prompt_key and metrics to practice sessions

prompt_key groups repeat attempts at the same speaking prompt so a student can
compare one attempt against the last. metrics stores the per-attempt delivery
measurements derived from word-level timings.

Existing rows are backfilled with a prompt_key computed from their stored
topic, using the same normalisation as the application, so history recorded
before this change still groups correctly. metrics stays NULL for those rows --
they were transcribed without word timings and the UI treats missing metrics as
unavailable rather than zero.

Revision ID: b2c3d4e5f6a7
Revises: 5f2f9d6f4d58
Create Date: 2026-09-21 00:00:00.000000

"""
import hashlib
import re

from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = '5f2f9d6f4d58'
branch_labels = None
depends_on = None


def _prompt_key(topic):
    """Must match database.build_prompt_key."""
    normalised = re.sub(r'[^a-z0-9 ]', ' ', (topic or '').lower())
    normalised = ' '.join(normalised.split())
    if not normalised:
        return ''
    return hashlib.sha1(normalised.encode('utf-8')).hexdigest()[:32]


def upgrade():
    inspector = sa.inspect(op.get_bind())
    existing = {column['name'] for column in inspector.get_columns('user_practice_sessions')}

    if 'prompt_key' not in existing:
        op.add_column(
            'user_practice_sessions',
            sa.Column('prompt_key', sa.String(length=32), nullable=True, server_default=''),
        )
    if 'metrics' not in existing:
        op.add_column('user_practice_sessions', sa.Column('metrics', sa.JSON(), nullable=True))

    indexes = {index['name'] for index in inspector.get_indexes('user_practice_sessions')}
    if 'ix_user_practice_sessions_prompt_key' not in indexes:
        op.create_index(
            'ix_user_practice_sessions_prompt_key',
            'user_practice_sessions',
            ['prompt_key'],
            unique=False,
        )

    # Backfill in batches rather than loading every row at once.
    connection = op.get_bind()
    sessions = sa.table(
        'user_practice_sessions',
        sa.column('id', sa.Integer),
        sa.column('topic', sa.String),
        sa.column('prompt_key', sa.String),
    )
    rows = connection.execute(
        sa.select(sessions.c.id, sessions.c.topic).where(
            sa.or_(sessions.c.prompt_key.is_(None), sessions.c.prompt_key == '')
        )
    ).fetchall()

    for row in rows:
        connection.execute(
            sessions.update()
            .where(sessions.c.id == row.id)
            .values(prompt_key=_prompt_key(row.topic))
        )


def downgrade():
    op.drop_index('ix_user_practice_sessions_prompt_key', table_name='user_practice_sessions')
    op.drop_column('user_practice_sessions', 'metrics')
    op.drop_column('user_practice_sessions', 'prompt_key')
