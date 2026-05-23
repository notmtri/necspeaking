from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


ADMIN_USERNAMES = {'notmtri'}


def is_special_admin(username):
    return (username or '').strip().lower().lstrip('@') in ADMIN_USERNAMES


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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _base_profile(self):
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
            'avatar': self.avatar or '',
            'stats': self.stats or {},
            'progress': self.progress or [],
            'commitWeeks': self.commit_weeks or [],
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

    def to_dict(self):
        data = self._base_profile()
        data['email'] = self.email
        return data

    def to_public_dict(self):
        return self._base_profile()


class UserPracticeSession(db.Model):
    __tablename__ = 'user_practice_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    topic = db.Column(db.String(500), nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    duration = db.Column(db.Float, nullable=False, default=0)
    scores = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('practice_sessions', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'topic': self.topic,
            'transcript': self.transcript,
            'duration': self.duration,
            'scores': self.scores or {},
            'createdAt': self.created_at.isoformat() if self.created_at else None
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
                'avatar': author.avatar if author else '',
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
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('scope', 'identifier', 'window_key', name='uq_rate_limit_scope_identifier_window'),
    )

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(500), nullable=False)
    question = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(200), default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
