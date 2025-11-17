from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

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