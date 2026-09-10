"""add community moderation fields

Revision ID: 5f2f9d6f4d58
Revises: 35213c5faf06
Create Date: 2026-05-24 03:25:00.000000

Plain ADD COLUMN is used rather than a batch_alter_table block: every backend
this app targets supports it natively, and SQLite's batch mode recreates the
whole table, which raises CircularDependencyError under SQLAlchemy 2.x when
several columns are added at once.

The adds are guarded so the revision can also be applied to a database that
already grew these columns via db.create_all().
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5f2f9d6f4d58'
down_revision = '35213c5faf06'
branch_labels = None
depends_on = None


NEW_COLUMNS = (
    ('hidden', lambda: sa.Column('hidden', sa.Boolean(), nullable=False, server_default=sa.false())),
    ('hidden_reason', lambda: sa.Column('hidden_reason', sa.String(length=255), nullable=True)),
    ('reported_count', lambda: sa.Column('reported_count', sa.Integer(), nullable=False, server_default='0')),
    ('last_reported_at', lambda: sa.Column('last_reported_at', sa.DateTime(), nullable=True)),
    ('moderated_at', lambda: sa.Column('moderated_at', sa.DateTime(), nullable=True)),
)


def _inspector():
    return sa.inspect(op.get_bind())


def upgrade():
    existing_columns = {column['name'] for column in _inspector().get_columns('community_posts')}
    for name, build_column in NEW_COLUMNS:
        if name not in existing_columns:
            op.add_column('community_posts', build_column())

    existing_indexes = {index['name'] for index in _inspector().get_indexes('community_posts')}
    if 'ix_community_posts_hidden' not in existing_indexes:
        op.create_index('ix_community_posts_hidden', 'community_posts', ['hidden'], unique=False)


def downgrade():
    op.drop_index('ix_community_posts_hidden', table_name='community_posts')
    for name, _ in reversed(NEW_COLUMNS):
        op.drop_column('community_posts', name)
