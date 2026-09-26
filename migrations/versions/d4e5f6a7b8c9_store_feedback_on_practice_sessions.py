"""store feedback, sample response and grader on practice sessions

The written feedback and sample answer lived only on analysis_jobs, which are
deleted after ANALYSIS_JOB_RETENTION_HOURS (72). A student's history therefore
kept four numbers and nothing they could re-read, and the report link died
with the job. These columns keep them with the attempt permanently.

Attempts whose job is still retained are backfilled: the job's result carries
the same transcript text the attempt stored, for the same user. Older attempts
keep NULL; their feedback is already gone, and the UI says so.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    existing = {column['name'] for column in sa.inspect(bind).get_columns('user_practice_sessions')}

    if 'feedback' not in existing:
        op.add_column('user_practice_sessions', sa.Column('feedback', sa.JSON(), nullable=True))
    if 'sample_response' not in existing:
        op.add_column('user_practice_sessions', sa.Column('sample_response', sa.Text(), nullable=True))
    if 'grader' not in existing:
        op.add_column('user_practice_sessions', sa.Column('grader', sa.String(length=64), nullable=True))

    sessions = sa.table(
        'user_practice_sessions',
        sa.column('id', sa.Integer),
        sa.column('user_id', sa.Integer),
        sa.column('transcript', sa.Text),
        sa.column('feedback', sa.JSON),
        sa.column('sample_response', sa.Text),
        sa.column('grader', sa.String),
    )
    jobs = sa.table(
        'analysis_jobs',
        sa.column('user_id', sa.Integer),
        sa.column('status', sa.String),
        sa.column('result_payload', sa.JSON),
    )

    completed = bind.execute(
        sa.select(jobs.c.user_id, jobs.c.result_payload).where(
            jobs.c.status == 'completed', jobs.c.user_id.isnot(None),
        )
    ).fetchall()

    for user_id, payload in completed:
        payload = payload or {}
        transcript = payload.get('transcript')
        feedback = payload.get('feedback')
        if not transcript or not isinstance(feedback, dict) or not feedback:
            continue
        bind.execute(
            sessions.update()
            .where(
                sessions.c.user_id == user_id,
                sessions.c.transcript == transcript,
                sessions.c.feedback.is_(None),
            )
            .values(
                feedback=feedback,
                sample_response=payload.get('sample_response') or None,
                grader=(payload.get('grader_model') or payload.get('grader') or None),
            )
        )


def downgrade():
    op.drop_column('user_practice_sessions', 'grader')
    op.drop_column('user_practice_sessions', 'sample_response')
    op.drop_column('user_practice_sessions', 'feedback')
