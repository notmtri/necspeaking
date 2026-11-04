"""community post images and reactions; profile cover photos

- community_posts.image (data URI) + image_type: an optional picture per
  post, served from /api/community/posts/<id>/image so the feed stays small.
- community_post_reactions: one row per (post, account, emoji) for the five
  fixed reactions.
- users.cover (data URI) + cover_updated_at: a profile cover photo, served
  from /api/users/<id>/cover; the timestamp versions the URL.

Revision ID: j0e1f2a3b4c5
Revises: i9d0e1f2a3b4
Create Date: 2026-11-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'j0e1f2a3b4c5'
down_revision = 'i9d0e1f2a3b4'
branch_labels = None
depends_on = None


def _columns(inspector, table):
    return {column['name'] for column in inspector.get_columns(table)}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    posts = _columns(inspector, 'community_posts')
    if 'image' not in posts:
        op.add_column('community_posts', sa.Column('image', sa.Text(), nullable=True))
    if 'image_type' not in posts:
        op.add_column('community_posts', sa.Column('image_type', sa.String(length=20), nullable=True))

    users = _columns(inspector, 'users')
    if 'cover' not in users:
        op.add_column('users', sa.Column('cover', sa.Text(), nullable=True))
    if 'cover_updated_at' not in users:
        op.add_column('users', sa.Column('cover_updated_at', sa.DateTime(), nullable=True))

    if 'community_post_reactions' not in inspector.get_table_names():
        op.create_table(
            'community_post_reactions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('post_id', sa.Integer(), sa.ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('emoji', sa.String(length=16), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.UniqueConstraint('post_id', 'user_id', 'emoji', name='uq_community_post_reactions'),
        )
        op.create_index('ix_community_post_reactions_post_id', 'community_post_reactions', ['post_id'])
        op.create_index('ix_community_post_reactions_user_id', 'community_post_reactions', ['user_id'])

    if bind.dialect.name == 'postgresql':
        op.execute('ALTER TABLE "community_post_reactions" ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_table('community_post_reactions')
    op.drop_column('users', 'cover_updated_at')
    op.drop_column('users', 'cover')
    op.drop_column('community_posts', 'image_type')
    op.drop_column('community_posts', 'image')
