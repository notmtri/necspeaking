from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


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
        return {
            'id': f'user-{self.id}',
            'name': self.name,
            'username': self.username,
            'className': self.class_name or '',
            'school': self.school or '',
            'cohort': self.cohort or '',
            'role': self.role or 'Student',
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('community_posts', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        author = self.user
        return {
            'id': self.id,
            'title': self.title,
            'body': self.body,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'author': {
                'id': f'user-{author.id}' if author else None,
                'name': author.name if author else 'Unknown user',
                'username': author.username if author else '',
                'role': author.role if author else 'Student',
                'avatar': author.avatar if author else '',
            }
        }

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
