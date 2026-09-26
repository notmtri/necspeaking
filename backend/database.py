from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import case, func
from datetime import datetime, timezone
import hashlib
import re
import uuid
from urllib.parse import quote

db = SQLAlchemy()


def utcnow():
    """Current UTC time as a naive datetime.

    utcnow() is deprecated and slated for removal, but every DateTime
    column here is naive. Returning an aware value instead would raise on any
    comparison against stored rows, so the tzinfo is stripped after computing
    the time correctly in UTC.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


ADMIN_USERNAMES = {'notmtri'}

# Avatars are stored inline and echoed in the community listing, so they need a
# hard ceiling regardless of what the client sends. The frontend downscales to a
# 256px JPEG (tens of KB); this is the independent backstop.
MAX_AVATAR_CHARS = 200 * 1024


def is_special_admin(username):
    return (username or '').strip().lower().lstrip('@') in ADMIN_USERNAMES


def avatar_from_name(name):
    initials = ''.join([part[:1].upper() for part in (name or 'NECS User').split()[:2]]) or 'N'
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="avatar" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="30" fill="url(#avatar)" />
      <text x="48" y="56" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="700" font-family="Arial, sans-serif">{initials}</text>
    </svg>
    """.strip()
    return f"data:image/svg+xml;charset=UTF-8,{quote(svg)}"


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    class_name = db.Column(db.String(100), default='')
    school = db.Column(db.String(255), default='')
    cohort = db.Column(db.String(100), default='')
    role = db.Column(db.String(50), default='Student')
    bio = db.Column(db.Text, default='')
    avatar = db.Column(db.Text, default='')
    stats = db.Column(db.JSON, nullable=False, default=lambda: {
        'practices': 0,
        'avgScore': 0,
        'streak': 0,
        'bestScore': 0
    })
    progress = db.Column(db.JSON, nullable=False, default=lambda: [])
    commit_weeks = db.Column(db.JSON, nullable=False, default=lambda: [])
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    @classmethod
    def servable_avatar_column(cls):
        """SQL for the stored avatar, or '' when it exceeds MAX_AVATAR_CHARS.

        Filtering in Python still meant fetching every oversized photo from
        the database first. Four legacy photos (~2.4 MB together) crossed from
        Mumbai to Oregon on every community listing just to be discarded,
        making it the slowest call on every page load (~4.9 s). Selecting this
        instead of the raw column leaves them in the database.
        """
        return case((func.length(cls.avatar) <= MAX_AVATAR_CHARS, cls.avatar), else_='')

    def display_avatar(self, stored=None):
        """The avatar to serve, never larger than MAX_AVATAR_CHARS.

        Photos uploaded before the size cap existed are still stored -- one
        was over 1 MB -- and five of them made every public community listing
        3.4 MB. Those are replaced by the initials avatar until re-uploaded.
        `stored` is a value already read via servable_avatar_column(); when
        given, the (possibly deferred) avatar column is not touched.
        """
        avatar = (self.avatar if stored is None else stored) or ''
        if not avatar or len(avatar) > MAX_AVATAR_CHARS:
            return avatar_from_name(self.name)
        return avatar

    def _base_profile(self, stored_avatar=None):
        is_admin = is_special_admin(self.username)
        return {
            'id': f'user-{self.id}',
            'name': self.name,
            'username': self.username,
            'className': self.class_name or '',
            'school': self.school or '',
            'cohort': self.cohort or '',
            'role': 'Admin' if is_admin else (self.role or 'Student'),
            'isAdmin': is_admin,
            'bio': self.bio or '',
            'avatar': self.display_avatar(stored_avatar),
            'stats': self.stats or {},
            'progress': self.progress or [],
            'commitWeeks': self.commit_weeks or [],
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

    def to_dict(self):
        data = self._base_profile()
        data['email'] = self.email
        return data

    def to_public_dict(self, stored_avatar=None):
        return self._base_profile(stored_avatar)


def build_prompt_key(topic):
    """Stable identity for a speaking prompt.

    Attempts at the same question must group together even when the student
    retypes it with different spacing, casing or punctuation, so the text is
    normalised before hashing.
    """
    normalised = re.sub(r'[^a-z0-9 ]', ' ', (topic or '').lower())
    normalised = ' '.join(normalised.split())
    if not normalised:
        return ''
    return hashlib.sha1(normalised.encode('utf-8')).hexdigest()[:32]


class UserPracticeSession(db.Model):
    __tablename__ = 'user_practice_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    # Text, not String(500): real NEC prompts average ~450 characters and some
    # exceed 500. AnalysisJob.topic was already Text, so a long prompt passed
    # queueing and then failed here after grading had already succeeded.
    topic = db.Column(db.Text, nullable=False)
    # Groups repeat attempts at the same prompt. Indexed with user_id because
    # every read is "this student's attempts at this prompt".
    prompt_key = db.Column(db.String(32), default='', index=True)
    transcript = db.Column(db.Text, nullable=False)
    duration = db.Column(db.Float, nullable=False, default=0)
    scores = db.Column(db.JSON, nullable=False, default=dict)
    # Delivery measurements for this attempt; see speech_metrics.py.
    metrics = db.Column(db.JSON, nullable=True)
    # The written feedback and sample answer are what students come for. They
    # used to live only on the AnalysisJob, which is deleted after
    # ANALYSIS_JOB_RETENTION_HOURS, so history kept four numbers and nothing a
    # student could re-read. NULL for attempts saved before this was stored.
    feedback = db.Column(db.JSON, nullable=True)
    sample_response = db.Column(db.Text, nullable=True)
    grader = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    user = db.relationship('User', backref=db.backref('practice_sessions', lazy=True, cascade='all, delete-orphan'))

    def has_feedback(self):
        return bool(self.feedback)

    def to_dict(self):
        """History row: scores and metrics, light enough to list."""
        return {
            'id': self.id,
            'topic': self.topic,
            'promptKey': self.prompt_key or '',
            'transcript': self.transcript,
            'duration': self.duration,
            'scores': self.scores or {},
            'metrics': self.metrics or None,
            'hasFeedback': self.has_feedback(),
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

    def to_detail_dict(self):
        """One attempt in full, including the feedback and sample answer."""
        data = self.to_dict()
        data.update({
            'feedback': self.feedback or None,
            'sampleResponse': self.sample_response or '',
            'grader': self.grader or '',
        })
        return data

    def grading_result(self):
        """The stored attempt in the shape generate_docx expects."""
        return {
            'scores': self.scores or {},
            'feedback': self.feedback or {},
            'sample_response': self.sample_response or '',
        }


class CommunityPost(db.Model):
    __tablename__ = 'community_posts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    body = db.Column(db.Text, nullable=False)
    hidden = db.Column(db.Boolean, nullable=False, default=False, index=True)
    hidden_reason = db.Column(db.String(255), default='')
    reported_count = db.Column(db.Integer, nullable=False, default=0)
    last_reported_at = db.Column(db.DateTime, nullable=True)
    moderated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship('User', backref=db.backref('community_posts', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self, include_moderation=False):
        author = self.user
        author_is_admin = is_special_admin(author.username) if author else False
        payload = {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'reportedCount': int(self.reported_count or 0),
            'author': {
                'id': f'user-{author.id}' if author else None,
                'name': author.name if author else 'Unknown user',
                'username': author.username if author else '',
                'role': 'Admin' if author_is_admin else (author.role if author else 'Student'),
                'isAdmin': author_is_admin,
                'avatar': author.display_avatar() if author else '',
            }
        }
        if include_moderation:
            payload.update({
                'hidden': bool(self.hidden),
                'hiddenReason': self.hidden_reason or '',
                'reportedCount': int(self.reported_count or 0),
                'lastReportedAt': self.last_reported_at.isoformat() if self.last_reported_at else None,
                'moderatedAt': self.moderated_at.isoformat() if self.moderated_at else None,
            })
        return payload


class AppAnnouncement(db.Model):
    __tablename__ = 'app_announcements'

    id = db.Column(db.Integer, primary_key=True)
    enabled = db.Column(db.Boolean, nullable=False, default=False)
    message = db.Column(db.Text, nullable=False, default='')
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            'enabled': bool(self.enabled),
            'message': self.message or '',
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


class AnalysisJob(db.Model):
    __tablename__ = 'analysis_jobs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    topic = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(50), nullable=False, default='analyze')
    original_filename = db.Column(db.String(500), nullable=False)
    stored_audio_path = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='pending', index=True)
    progress_message = db.Column(db.String(255), nullable=False, default='Queued for processing.')
    error_message = db.Column(db.Text, default='')
    result_payload = db.Column(db.JSON, nullable=True)
    document_path = db.Column(db.String(1000), default='')
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship('User', backref=db.backref('analysis_jobs', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'topic': self.topic,
            'source': self.source,
            'progressMessage': self.progress_message or '',
            'error': self.error_message or '',
            'result': self.result_payload or None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
        }


class RateLimitEntry(db.Model):
    __tablename__ = 'rate_limit_entries'

    id = db.Column(db.Integer, primary_key=True)
    scope = db.Column(db.String(100), nullable=False, index=True)
    identifier = db.Column(db.String(255), nullable=False, index=True)
    window_key = db.Column(db.BigInteger, nullable=False, index=True)
    count = db.Column(db.Integer, nullable=False, default=0)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        db.UniqueConstraint('scope', 'identifier', 'window_key', name='uq_rate_limit_scope_identifier_window'),
    )

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(500), nullable=False)
    question = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(200), default='General')
    created_at = db.Column(db.DateTime, default=utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'question': self.question,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Sample(db.Model):
    __tablename__ = 'samples'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(500), nullable=False)
    topic = db.Column(db.String(500), nullable=False)
    question = db.Column(db.Text)
    speaker = db.Column(db.String(200), nullable=False)
    score = db.Column(db.Float, nullable=False, default=2.0)
    duration = db.Column(db.Integer)
    transcript = db.Column(db.Text, nullable=False)
    feedback = db.Column(db.Text, nullable=False)
    audio_url = db.Column(db.String(1000))
    created_at = db.Column(db.DateTime, default=utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'topic': self.topic,
            'question': self.question,
            'speaker': self.speaker,
            'score': self.score,
            'duration': self.duration,
            'transcript': self.transcript,
            'feedback': self.feedback,
            'audioUrl': self.audio_url,
            'tags': [self.topic, self.speaker, f"{self.score}/2.0"]
        }
