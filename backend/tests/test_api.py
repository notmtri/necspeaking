import os
import sys
import unittest
from io import BytesIO
from pathlib import Path

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / 'test_smoke.db'

os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['PRODUCTION'] = 'false'
os.environ['ALLOWED_ORIGINS'] = 'http://localhost:3001,http://127.0.0.1:3001'
os.environ['DATABASE_URL'] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ['ADMIN_PASSWORD_HASH'] = generate_password_hash('admin-pass-123')
os.environ['ENABLE_EMBEDDED_WORKER'] = 'false'

import app as app_module  # noqa: E402
from database import CommunityPost, Question, Sample, User, db  # noqa: E402


class ApiSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)
        cls.client = app_module.app.test_client()

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with app_module.app.app_context():
            db.session.remove()

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_health_endpoint(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'healthy')
        self.assertIn('X-Request-ID', response.headers)
        self.assertIn('rateLimiter', response.get_json())

    def test_default_announcement_endpoint(self):
        response = self.client.get('/api/site/announcement')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIn('announcement', payload)
        self.assertTrue(payload['announcement']['enabled'])
        self.assertIn('IMPORTANT NOTICE', payload['announcement']['message'])

    def test_signup_profile_and_logout_flow(self):
        signup_payload = {
            'email': 'student@example.com',
            'password': 'strongpass123',
            'profile': {
                'name': 'Student User',
                'username': 'studentuser',
                'className': '12A1',
                'school': 'LQD',
                'cohort': '2026',
                'role': 'Student',
                'bio': 'Testing flow',
            }
        }

        signup = self.client.post('/api/auth/signup', json=signup_payload)
        self.assertEqual(signup.status_code, 201)
        self.assertEqual(signup.get_json()['user']['username'], 'studentuser')

        auth_me = self.client.get('/api/auth/me')
        self.assertEqual(auth_me.status_code, 200)
        self.assertTrue(auth_me.get_json()['authenticated'])

        profile_update = self.client.put('/api/auth/profile', json={
            'name': 'Updated Student',
            'username': 'updatedstudent',
            'role': 'Teacher',
            'bio': 'Updated profile',
        })
        self.assertEqual(profile_update.status_code, 200)
        self.assertEqual(profile_update.get_json()['user']['username'], 'updatedstudent')
        self.assertEqual(profile_update.get_json()['user']['role'], 'Teacher')

        logout = self.client.post('/api/auth/logout')
        self.assertEqual(logout.status_code, 200)

        auth_me_after_logout = self.client.get('/api/auth/me')
        self.assertFalse(auth_me_after_logout.get_json()['authenticated'])

    def test_admin_can_update_announcement(self):
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

        response = self.client.put('/api/admin/announcement', json={
            'enabled': True,
            'message': 'Updated maintenance window notice.',
        })
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['announcement']['message'], 'Updated maintenance window notice.')

    def test_report_and_moderate_community_post(self):
        with app_module.app.app_context():
            user = User(
                email='poster@example.com',
                username='poster',
                password_hash=generate_password_hash('strongpass123'),
                name='Poster User',
            )
            db.session.add(user)
            db.session.flush()
            post = CommunityPost(user_id=user.id, title='Test post', body='Testing moderation flow')
            db.session.add(post)
            db.session.commit()
            post_id = post.id

        report_response = self.client.post(f'/api/community/posts/{post_id}/report')
        self.assertEqual(report_response.status_code, 200)
        self.assertEqual(report_response.get_json()['reportedCount'], 1)

        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

        list_response = self.client.get('/api/admin/community/posts')
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.get_json()['posts']), 1)

        hide_response = self.client.put(f'/api/admin/community/posts/{post_id}/visibility', json={
            'hidden': True,
            'reason': 'Hidden by moderation test',
        })
        self.assertEqual(hide_response.status_code, 200)
        self.assertTrue(hide_response.get_json()['post']['hidden'])

        public_feed = self.client.get('/api/community/posts')
        self.assertEqual(public_feed.status_code, 200)
        self.assertEqual(public_feed.get_json()['posts'], [])

    def test_analysis_job_is_queued_and_can_be_queried(self):
        response = self.client.post('/api/analyze', data={
            'topic': 'Describe a challenge you overcame.',
            'source': 'analyze',
            'audio': (BytesIO(b'fake-audio-content'), 'response.mp3'),
        }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertTrue(payload['success'])
        self.assertEqual(payload['job']['status'], 'pending')

        job_status = self.client.get(f"/api/analyze/jobs/{payload['job']['id']}")
        self.assertEqual(job_status.status_code, 200)
        self.assertEqual(job_status.get_json()['job']['status'], 'pending')

    def test_questions_and_samples_public_endpoints(self):
        with app_module.app.app_context():
            db.session.add(Question(topic='Environment', question='How should cities reduce air pollution?'))
            db.session.add(Sample(
                filename='sample.mp3',
                topic='Environment',
                question='How should cities reduce air pollution?',
                speaker='Test Speaker',
                score=1.9,
                duration=120,
                transcript='Sample transcript',
                feedback='Strong structure and evidence.',
                audio_url='https://example.com/sample.mp3',
            ))
            db.session.commit()

        questions = self.client.get('/api/questions')
        self.assertEqual(questions.status_code, 200)
        self.assertEqual(len(questions.get_json()['questions']), 1)

        samples = self.client.get('/api/samples')
        self.assertEqual(samples.status_code, 200)
        self.assertEqual(len(samples.get_json()['samples']), 1)


if __name__ == '__main__':
    unittest.main()
