"""add feedback_messages for the in-app "Send feedback" form

Feedback used to go through a Google Form linked at the foot of the page,
which students missed. Messages now land in this table and show up in the
admin panel.

RLS is enabled with no policies, like every other table (see c3d4e5f6a7b8):
it closes Supabase's REST API without affecting the backend, which connects
as the table owner.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-11-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f6a7b8c9d0e1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if 'feedback_messages' not in sa.inspect(bind).get_table_names():
        op.create_table(
            'feedback_messages',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('contact', sa.String(length=255), nullable=False, server_default=''),
            sa.Column('page', sa.String(length=40), nullable=False, server_default=''),
            sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_feedback_messages_user_id', 'feedback_messages', ['user_id'])
        op.create_index('ix_feedback_messages_resolved', 'feedback_messages', ['resolved'])
        op.create_index('ix_feedback_messages_created_at', 'feedback_messages', ['created_at'])

    if bind.dialect.name == 'postgresql':
        op.execute('ALTER TABLE "feedback_messages" ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_table('feedback_messages')
