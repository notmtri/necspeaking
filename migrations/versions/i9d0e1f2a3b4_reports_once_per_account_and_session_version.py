"""one report per account per post; session_version to log out other devices

Reports were a bare counter any visitor could bump 20 times an hour, so one
person could make a post look widely reported. community_post_reports keeps
one row per (post, account).

users.session_version is bumped when the password changes. Sessions are
signed cookies with nothing stored server-side, so this number is the only
way to end the other devices' sessions.

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-11-02 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'i9d0e1f2a3b4'
down_revision = 'h8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if 'session_version' not in {column['name'] for column in inspector.get_columns('users')}:
        op.add_column('users', sa.Column('session_version', sa.Integer(), nullable=False, server_default='0'))

    if 'community_post_reports' not in inspector.get_table_names():
        op.create_table(
            'community_post_reports',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('post_id', sa.Integer(), sa.ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('post_id', 'user_id', name='uq_community_post_reports_post_user'),
        )
        op.create_index('ix_community_post_reports_post_id', 'community_post_reports', ['post_id'])
        op.create_index('ix_community_post_reports_user_id', 'community_post_reports', ['user_id'])

    if bind.dialect.name == 'postgresql':
        op.execute('ALTER TABLE "community_post_reports" ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_table('community_post_reports')
    op.drop_column('users', 'session_version')
