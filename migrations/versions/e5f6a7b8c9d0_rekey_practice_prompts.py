"""recompute practice prompt keys with numbering and boilerplate ignored

build_prompt_key now ignores how a question was numbered ("Question 2." vs
"2:") and the NEC papers' "You have 5 minutes to prepare... Good luck!" line,
so a question picked from the bank groups with the same question pasted in by
hand. Stored keys must be recomputed or the attempts endpoint, which keys the
requested prompt with the new function, would stop finding older attempts.

Data only; no schema change. The function is copied rather than imported so
this revision keeps meaning the same thing if the application code changes.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-27 01:00:00.000000

"""
import hashlib
import re

from alembic import op
import sqlalchemy as sa


revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


_NUMBERING = re.compile(r'^\s*(?:question\s*)?\d{1,3}\s*[.:)\-]\s*', re.IGNORECASE)
_BOILERPLATE = re.compile(
    r'you have (?:\d+|one|two|three|four|five) minutes? to prepare'
    r'(?: for your (?:talk|speech|presentation))?\.?|good luck!?',
    re.IGNORECASE,
)


def _prompt_key(topic):
    """Must match database.build_prompt_key as of this revision."""
    text = re.sub(r'[​-‏⁠﻿]', '', (topic or '').lower())
    text = _NUMBERING.sub('', text, count=1)
    text = _BOILERPLATE.sub(' ', text)
    text = ' '.join(re.sub(r'[^a-z0-9 ]', ' ', text).split())
    if not text:
        return ''
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:32]


def _legacy_prompt_key(topic):
    """The key before this revision (see b2c3d4e5f6a7), for downgrade."""
    text = ' '.join(re.sub(r'[^a-z0-9 ]', ' ', (topic or '').lower()).split())
    if not text:
        return ''
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:32]


def _rekey(key_function):
    bind = op.get_bind()
    sessions = sa.table(
        'user_practice_sessions',
        sa.column('id', sa.Integer),
        sa.column('topic', sa.Text),
        sa.column('prompt_key', sa.String),
    )
    for row in bind.execute(sa.select(sessions.c.id, sessions.c.topic, sessions.c.prompt_key)).fetchall():
        key = key_function(row.topic)
        if key != row.prompt_key:
            bind.execute(sessions.update().where(sessions.c.id == row.id).values(prompt_key=key))


def upgrade():
    _rekey(_prompt_key)


def downgrade():
    _rekey(_legacy_prompt_key)
