"""topics and takes for the Unscripted page (Deep research, Takes)

Kept apart from `questions`, the NEC past papers, so Analyze and Simulation
never offer them. Seeded with the 100 topics and 100 takes the site owner
reviewed (migrations/data/unscripted_prompts.json); edited in the admin panel
after that.

Revision ID: m3b4c5d6e7f8
Revises: l2a3b4c5d6e7
Create Date: 2026-11-05 17:00:00.000000

"""
import json
import os

from alembic import op
import sqlalchemy as sa


revision = 'm3b4c5d6e7f8'
down_revision = 'l2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    if 'practice_prompts' in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        'practice_prompts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('kind', sa.String(length=10), nullable=False),
        sa.Column('category', sa.String(length=60), nullable=False, server_default='Ideas'),
        sa.Column('text', sa.String(length=300), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_practice_prompts_kind', 'practice_prompts', ['kind'])
    # Like every table here: closes Supabase's public REST API to it, while the
    # backend (the owner) is unaffected. See c3d4e5f6a7b8.
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('ALTER TABLE "practice_prompts" ENABLE ROW LEVEL SECURITY')

    seed_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'unscripted_prompts.json')
    with open(seed_path, encoding='utf-8') as seed_file:
        rows = json.load(seed_file)
    prompts = sa.table(
        'practice_prompts',
        sa.column('kind', sa.String), sa.column('category', sa.String),
        sa.column('text', sa.String), sa.column('active', sa.Boolean),
    )
    op.bulk_insert(prompts, [{**row, 'active': True} for row in rows])


def downgrade():
    op.drop_index('ix_practice_prompts_kind', table_name='practice_prompts')
    op.drop_table('practice_prompts')
