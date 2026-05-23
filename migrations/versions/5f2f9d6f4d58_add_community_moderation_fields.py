"""add community moderation fields

Revision ID: 5f2f9d6f4d58
Revises: 35213c5faf06
Create Date: 2026-05-24 03:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5f2f9d6f4d58'
down_revision = '35213c5faf06'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('community_posts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('hidden', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('hidden_reason', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('reported_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('last_reported_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('moderated_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_community_posts_hidden'), ['hidden'], unique=False)


def downgrade():
    with op.batch_alter_table('community_posts', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_community_posts_hidden'))
        batch_op.drop_column('moderated_at')
        batch_op.drop_column('last_reported_at')
        batch_op.drop_column('reported_count')
        batch_op.drop_column('hidden_reason')
        batch_op.drop_column('hidden')
