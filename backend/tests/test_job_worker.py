import os
import sys
import unittest
from datetime import timedelta
from pathlib import Path

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / 'test_job_worker.db'

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ['DATABASE_URL'] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ['ENABLE_EMBEDDED_WORKER'] = 'false'

import app as app_module  # noqa: E402
from database import AnalysisJob, User, db, utcnow  # noqa: E402
from job_worker import (  # noqa: E402
    AUDIO_MISSING_MESSAGE,
    GRADING_FAILED_MESSAGE,
    AnalysisInputError,
    AnalysisWorker,
    student_facing_error,
)
from user_progress import create_practice_session  # noqa: E402


def make_job(status, started_minutes_ago=None):
    job = AnalysisJob(
        topic='t', source='analyze', original_filename='a.mp3',
        stored_audio_path='/tmp/a.mp3', status=status,
    )
    if started_minutes_ago is not None:
        job.started_at = utcnow() - timedelta(minutes=started_minutes_ago)
    db.session.add(job)
    return job


class StaleJobRecoveryTests(unittest.TestCase):
    """Production had 18 jobs stuck in 'processing' for up to 118 days.

    The worker only polls for 'pending' and cleanup only removes rows with
    completed_at set, so a job whose worker died mid-run was never touched
    again. Students saw a spinner until the client gave up.
    """

    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)
        cls.worker = AnalysisWorker(app_module.app, lambda: None, str(BACKEND_DIR / 'uploads'))

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_marks_long_running_processing_jobs_as_failed(self):
        with app_module.app.app_context():
            stuck = make_job('processing', started_minutes_ago=180)
            db.session.commit()
            stuck_id = stuck.id

            recovered = self.worker.recover_stale_jobs()
            self.assertEqual(recovered, 1)

            # The worker committed on its own app-context session. Drop this
            # session's cached copy so the read below really hits the database.
            db.session.expire_all()
            job = db.session.get(AnalysisJob, stuck_id)
            self.assertEqual(job.status, 'failed')
            self.assertIsNotNone(job.completed_at, 'must be eligible for retention cleanup now')
            self.assertIn('restarted', job.error_message)

    def test_leaves_recent_processing_jobs_alone(self):
        with app_module.app.app_context():
            active = make_job('processing', started_minutes_ago=2)
            db.session.commit()
            active_id = active.id

            self.assertEqual(self.worker.recover_stale_jobs(), 0)
            db.session.expire_all()
            self.assertEqual(db.session.get(AnalysisJob, active_id).status, 'processing')

    def test_ignores_pending_and_finished_jobs(self):
        with app_module.app.app_context():
            make_job('pending')
            done = make_job('completed', started_minutes_ago=500)
            done.completed_at = utcnow()
            db.session.commit()

            self.assertEqual(self.worker.recover_stale_jobs(), 0)
            statuses = sorted(j.status for j in AnalysisJob.query.all())
            self.assertEqual(statuses, ['completed', 'pending'])


class LongTopicTests(unittest.TestCase):
    """Real NEC prompts average ~450 characters and some exceed 500.

    AnalysisJob.topic was already Text but UserPracticeSession.topic was
    String(500), so a long prompt survived queueing and grading and then failed
    at the last step. Two production jobs died this way.
    """

    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_practice_session_accepts_a_prompt_over_500_characters(self):
        long_topic = 'Discuss the following statement in detail. ' * 20  # ~880 chars
        self.assertGreater(len(long_topic), 500)

        with app_module.app.app_context():
            user = User(email='long@example.com', username='longuser',
                        password_hash=generate_password_hash('strongpass123'), name='Long')
            db.session.add(user)
            db.session.flush()
            create_practice_session(user, long_topic, 'transcript', 60.0, {'total': 1.0})
            db.session.commit()

            stored = user.practice_sessions[0].topic
            self.assertEqual(stored, long_topic, 'topic must round-trip untruncated')


class StudentFacingErrorTests(unittest.TestCase):
    """Students used to see raw exception text: "Expecting ',' delimiter: line 1
    column 465" or a server file path. They now get something to act on."""

    def test_parser_and_provider_errors_become_a_retry_later_message(self):
        import json
        for error in (json.JSONDecodeError("Expecting ',' delimiter", '{}', 1),
                      RuntimeError('Gemini grading request failed with HTTP 503')):
            self.assertEqual(student_facing_error(error), GRADING_FAILED_MESSAGE)

    def test_input_problems_keep_their_own_message(self):
        error = AnalysisInputError('This recording is longer than the 5 minute limit.')
        self.assertEqual(student_facing_error(error), str(error))

    def test_a_lost_upload_says_to_resubmit(self):
        self.assertEqual(student_facing_error(FileNotFoundError('/opt/render/x.webm')), AUDIO_MISSING_MESSAGE)


class LostUploadTests(unittest.TestCase):
    """A job queued just before a restart points at audio on the old disk."""

    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)
        cls.worker = AnalysisWorker(app_module.app, lambda: None, str(BACKEND_DIR / 'uploads'))

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_missing_audio_fails_with_a_resubmit_message_not_a_path(self):
        with app_module.app.app_context():
            job = make_job('pending')
            job.stored_audio_path = str(BACKEND_DIR / 'uploads' / 'jobs' / 'gone-after-restart.webm')
            db.session.commit()
            job_id = job.id

            self.assertTrue(self.worker.process_next_job())
            db.session.expire_all()
            job = db.session.get(AnalysisJob, job_id)
            self.assertEqual(job.status, 'failed')
            self.assertEqual(job.error_message, AUDIO_MISSING_MESSAGE)
            self.assertNotIn('uploads', job.error_message)


class FeedbackIsKeptTests(unittest.TestCase):
    """The feedback used to exist only on the job, which is deleted after 72
    hours. A logged-in student's attempt must keep it permanently."""

    GRADE = {
        'scores': {'content': 0.7, 'accuracy': 0.5, 'delivery': 0.4, 'total': 1.6},
        'feedback': {'content': 'Clear stance.', 'accuracy': 'Varied grammar.', 'delivery': 'Steady pace.'},
        'sample_response': 'My question is... Thank you.',
        'grader': 'gemini',
        'grader_model': 'gemini-3.6-flash',
        'audio_reviewed': True,
    }

    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)
        cls.upload_dir = BACKEND_DIR / 'uploads'
        cls.worker = AnalysisWorker(app_module.app, lambda: None, str(cls.upload_dir))

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_completed_job_stores_feedback_on_the_practice_session(self):
        from unittest import mock
        import job_worker
        from database import UserPracticeSession

        audio = self.upload_dir / 'jobs' / 'feedback-test.webm'
        audio.parent.mkdir(parents=True, exist_ok=True)
        audio.write_bytes(b'stub')

        def fake_convert(src, dst):
            Path(dst).write_bytes(b'wav')
            return dst

        with app_module.app.app_context():
            user = User(email='keep@example.com', username='keeper', name='Keeper',
                        password_hash=generate_password_hash('strongpass123'))
            db.session.add(user)
            db.session.flush()
            job = make_job('pending')
            job.user_id = user.id
            job.stored_audio_path = str(audio)
            db.session.commit()
            job_id = job.id

        with mock.patch.object(job_worker, 'get_audio_duration', return_value=60.0),                 mock.patch.object(job_worker, 'convert_to_wav', side_effect=fake_convert),                 mock.patch.object(job_worker, 'transcribe_audio',
                                  return_value={'text': 'my answer', 'words': [], 'duration': 60.0}),                 mock.patch.object(job_worker, 'grade_speech', return_value=dict(self.GRADE)),                 mock.patch.object(self.worker, 'cloudinary_report_upload_enabled', return_value=False):
            self.worker.process_next_job()

        with app_module.app.app_context():
            job = db.session.get(AnalysisJob, job_id)
            self.assertEqual(job.status, 'completed', job.error_message)
            session_id = job.result_payload['practice_session_id']
            practice = db.session.get(UserPracticeSession, session_id)
            self.assertEqual(practice.feedback, self.GRADE['feedback'])
            self.assertEqual(practice.sample_response, self.GRADE['sample_response'])
            self.assertEqual(practice.grader, 'gemini-3.6-flash')
            self.assertTrue(practice.to_dict()['hasFeedback'])
            doc = Path(job.document_path)
        if doc.exists():
            doc.unlink()


if __name__ == '__main__':
    unittest.main()
