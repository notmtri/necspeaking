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
from user_progress import create_practice_session  # noqa: E402


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
        # The queued-analysis test writes a stub upload; do not leave it behind.
        jobs_dir = BACKEND_DIR / 'uploads' / 'jobs'
        if jobs_dir.exists():
            for stored in jobs_dir.glob('*_response.mp3'):
                stored.unlink()
            if not any(jobs_dir.iterdir()):
                jobs_dir.rmdir()

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

    def test_profile_update_keeps_fields_that_were_not_submitted(self):
        self.client.post('/api/auth/signup', json={
            'email': 'partial@example.com',
            'password': 'strongpass123',
            'profile': {
                'name': 'Partial User',
                'username': 'partialuser',
                'className': '12A1',
                'school': 'LQD',
                'cohort': '2026',
                'bio': 'Original bio',
            },
        })

        # Only name is submitted; the untouched fields must survive.
        response = self.client.put('/api/auth/profile', json={'name': 'Renamed User'})
        self.assertEqual(response.status_code, 200)
        user = response.get_json()['user']
        self.assertEqual(user['name'], 'Renamed User')
        self.assertEqual(user['className'], '12A1')
        self.assertEqual(user['school'], 'LQD')
        self.assertEqual(user['cohort'], '2026')
        self.assertEqual(user['bio'], 'Original bio')

    def test_profile_update_can_still_clear_a_field_explicitly(self):
        self.client.post('/api/auth/signup', json={
            'email': 'clear@example.com',
            'password': 'strongpass123',
            'profile': {'name': 'Clear User', 'username': 'clearuser', 'school': 'LQD'},
        })

        response = self.client.put('/api/auth/profile', json={'name': 'Clear User', 'school': ''})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['user']['school'], '')

    def test_sample_upload_rejects_disallowed_extension(self):
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

        response = self.client.post('/api/samples/upload', data={
            'topic': 'Environment',
            'speaker': 'Test Speaker',
            'transcript': 'Sample transcript',
            'feedback': 'Strong structure.',
            'audio': (BytesIO(b'not really audio'), 'malicious.exe'),
        }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid file format', response.get_json()['error'])

    def test_root_and_unknown_paths_return_json(self):
        root = self.client.get('/')
        self.assertEqual(root.status_code, 200)
        self.assertIn('necs. API', root.get_json()['message'])

        missing = self.client.get('/api/definitely-not-a-route')
        self.assertEqual(missing.status_code, 404)
        self.assertIn('error', missing.get_json())

    def test_profile_rejects_oversized_avatar(self):
        self.client.post('/api/auth/signup', json={
            'email': 'avatar@example.com',
            'password': 'strongpass123',
            'profile': {'name': 'Avatar User', 'username': 'avataruser'},
        })

        oversized = 'data:image/png;base64,' + ('A' * (200 * 1024 + 10))
        response = self.client.put('/api/auth/profile', json={
            'name': 'Avatar User',
            'avatar': oversized,
        })
        self.assertEqual(response.status_code, 413)

    def test_community_listing_is_paginated(self):
        with app_module.app.app_context():
            for index in range(5):
                db.session.add(User(
                    email=f'member{index}@example.com',
                    username=f'member{index}',
                    password_hash=generate_password_hash('strongpass123'),
                    name=f'Member {index}',
                ))
            db.session.commit()

        response = self.client.get('/api/auth/community?limit=2')
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(payload['profiles']), 2)
        self.assertEqual(payload['total'], 5)
        self.assertTrue(payload['hasMore'])

        last = self.client.get('/api/auth/community?limit=2&offset=4').get_json()
        self.assertEqual(len(last['profiles']), 1)
        self.assertFalse(last['hasMore'])

    def test_community_listing_clamps_absurd_limits(self):
        response = self.client.get('/api/auth/community?limit=100000')
        self.assertLessEqual(response.get_json()['limit'], 200)

        response = self.client.get('/api/auth/community?limit=not-a-number')
        self.assertEqual(response.status_code, 200)

    def _signup(self, email='attempts@example.com', username='attemptsuser'):
        return self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'strongpass123',
            'profile': {'name': 'Attempts User', 'username': username},
        })

    def test_practice_attempts_groups_repeat_attempts_at_one_prompt(self):
        self._signup()
        with app_module.app.app_context():
            user = User.query.filter_by(username='attemptsuser').one()
            create_practice_session(user, 'What is AI?', 'first try', 30.0,
                                    {'content': 0.4, 'accuracy': 0.3, 'delivery': 0.2, 'total': 0.9})
            # Same question, messily retyped: must still group.
            create_practice_session(user, '  what   IS  ai ??  ', 'second try', 32.0,
                                    {'content': 0.6, 'accuracy': 0.4, 'delivery': 0.3, 'total': 1.3})
            create_practice_session(user, 'A different question entirely', 'other', 20.0,
                                    {'content': 0.2, 'accuracy': 0.2, 'delivery': 0.1, 'total': 0.5})
            db.session.commit()

        response = self.client.get('/api/auth/practice-attempts?topic=What is AI?')
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(len(payload['attempts']), 2)
        # Oldest first, so the client can show improvement over time.
        totals = [a['scores']['total'] for a in payload['attempts']]
        self.assertEqual(totals, [0.9, 1.3])

    def test_practice_attempts_requires_a_prompt(self):
        self._signup(email='noprompt@example.com', username='nopromptuser')
        self.assertEqual(self.client.get('/api/auth/practice-attempts').status_code, 400)

    def test_practice_attempts_requires_login(self):
        self.assertEqual(
            self.client.get('/api/auth/practice-attempts?topic=anything').status_code, 401)

    def test_practice_attempts_are_scoped_to_the_logged_in_user(self):
        # Another student's attempts at the same prompt must not leak.
        with app_module.app.app_context():
            other = User(email='other@example.com', username='otheruser',
                         password_hash=generate_password_hash('strongpass123'), name='Other')
            db.session.add(other)
            db.session.flush()
            create_practice_session(other, 'Shared prompt', 'theirs', 10.0,
                                    {'content': 0.9, 'accuracy': 0.6, 'delivery': 0.5, 'total': 2.0})
            db.session.commit()

        self._signup(email='mine@example.com', username='mineuser')
        response = self.client.get('/api/auth/practice-attempts?topic=Shared prompt')
        self.assertEqual(response.get_json()['attempts'], [])

    def test_practice_attempt_persists_delivery_metrics(self):
        """The retry loop is only useful if metrics survive to the next attempt."""
        from speech_metrics import build_speech_metrics

        self._signup(email='metrics@example.com', username='metricsuser')
        words = [{'word': 'um', 'start': 0.0, 'end': 0.2}] + [
            {'word': f'w{i}', 'start': 0.5 + i * 0.3, 'end': 0.7 + i * 0.3} for i in range(20)
        ]
        metrics = build_speech_metrics(words, 12.0)
        self.assertTrue(metrics['available'])

        with app_module.app.app_context():
            user = User.query.filter_by(username='metricsuser').one()
            create_practice_session(
                user, 'Reusable prompt', 'transcript', 12.0,
                {'content': 0.5, 'accuracy': 0.3, 'delivery': 0.2, 'total': 1.0},
                metrics=metrics,
            )
            db.session.commit()

        attempts = self.client.get(
            '/api/auth/practice-attempts?topic=Reusable prompt').get_json()['attempts']
        self.assertEqual(len(attempts), 1)
        stored = attempts[0]['metrics']
        self.assertTrue(stored['available'])
        self.assertEqual(stored['fillers']['total'], 1)
        self.assertEqual(stored['wordCount'], 21)

    def test_history_exposes_prompt_key_for_grouping(self):
        self._signup(email='grouping@example.com', username='groupinguser')
        with app_module.app.app_context():
            user = User.query.filter_by(username='groupinguser').one()
            create_practice_session(user, 'Consistent prompt', 'a', 10.0, {'total': 1.0})
            db.session.commit()

        sessions = self.client.get('/api/auth/practice-history').get_json()['sessions']
        self.assertTrue(sessions[0]['promptKey'])
        self.assertEqual(len(sessions[0]['promptKey']), 32)

    def test_cors_allows_configured_origin(self):
        response = self.client.get('/api/health', headers={'Origin': 'http://localhost:3001'})
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3001')
        self.assertEqual(response.headers.get('Access-Control-Allow-Credentials'), 'true')

    def test_cors_rejects_unknown_origin(self):
        # Guards the Flask-Cors configuration: a permissive default here would
        # let any site read authenticated responses.
        response = self.client.get('/api/health', headers={'Origin': 'https://evil.example.com'})
        self.assertIsNone(response.headers.get('Access-Control-Allow-Origin'))

    def test_cors_preflight_permits_csrf_header(self):
        response = self.client.options('/api/auth/profile', headers={
            'Origin': 'http://localhost:3001',
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'X-CSRF-Token',
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('X-CSRF-Token', response.headers.get('Access-Control-Allow-Headers', ''))

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


    # --- CSRF --------------------------------------------------------------

    def _with_csrf_enforced(self):
        app_module.app.config['CSRF_DISABLED'] = False
        app_module.app.config['TESTING'] = False
        self.addCleanup(app_module.app.config.update, TESTING=True)

    def test_guest_upload_needs_no_csrf_token(self):
        """Safari/iOS, Brave and incognito Chrome drop the cross-site session
        cookie, so a guest's token can never match. Production logs showed
        every such upload rejected with 403 in 0ms."""
        self._with_csrf_enforced()
        guest = app_module.app.test_client()
        response = guest.post('/api/analyze', data={
            'topic': 'Guest topic',
            'audio': (BytesIO(b'fake-audio-content'), 'response.mp3'),
        }, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 202)

    def test_logged_in_requests_still_need_the_csrf_token(self):
        self._signup(email='csrf@example.com', username='csrfuser')
        self._with_csrf_enforced()

        forged = self.client.put('/api/auth/profile', json={'name': 'Forged'})
        self.assertEqual(forged.status_code, 403)

        with self.client.session_transaction() as session:
            token = session['csrf_token']
        genuine = self.client.put('/api/auth/profile', json={'name': 'Genuine'},
                                  headers={'X-CSRF-Token': token})
        self.assertEqual(genuine.status_code, 200)

    def test_admin_requests_still_need_the_csrf_token(self):
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True
        self._with_csrf_enforced()
        response = self.client.put('/api/admin/announcement', json={'enabled': False, 'message': ''})
        self.assertEqual(response.status_code, 403)

    # --- client IP for rate limiting ----------------------------------------

    def _client_ip(self, forwarded_for, hops):
        from rate_limiter import client_ip
        os.environ['TRUSTED_PROXY_HOPS'] = str(hops)
        self.addCleanup(os.environ.pop, 'TRUSTED_PROXY_HOPS', None)
        headers = {'X-Forwarded-For': forwarded_for} if forwarded_for else {}
        with app_module.app.test_request_context('/', headers=headers, environ_base={'REMOTE_ADDR': '127.0.0.1'}):
            return client_ip()

    def test_client_ip_ignores_a_spoofed_forwarded_for_prefix(self):
        """The limiter used the first entry, which the client writes itself."""
        real = '116.96.77.213, 172.68.175.64, 10.31.166.32'
        self.assertEqual(self._client_ip(real, 3), '116.96.77.213')
        self.assertEqual(self._client_ip('6.6.6.6, ' + real, 3), '116.96.77.213')

    def test_client_ip_uses_the_socket_when_no_proxy_is_trusted(self):
        self.assertEqual(self._client_ip('6.6.6.6', 0), '127.0.0.1')

    def test_rate_limit_cannot_be_dodged_with_forwarded_for(self):
        os.environ['TRUSTED_PROXY_HOPS'] = '1'
        self.addCleanup(os.environ.pop, 'TRUSTED_PROXY_HOPS', None)
        statuses = [
            self.client.post('/api/admin/login', json={'password': 'wrong'},
                             headers={'X-Forwarded-For': f'10.0.0.{i}, 203.0.113.9'}).status_code
            for i in range(7)
        ]
        self.assertIn(429, statuses)

    # --- avatars --------------------------------------------------------------

    def test_legacy_oversized_avatar_is_not_served(self):
        with app_module.app.app_context():
            db.session.add(User(
                email='bigphoto@example.com', username='bigphoto', name='Big Photo',
                password_hash=generate_password_hash('strongpass123'),
                avatar='data:image/png;base64,' + 'A' * (1024 * 1024),
            ))
            db.session.commit()

        response = self.client.get('/api/auth/community')
        profile = response.get_json()['profiles'][0]
        self.assertTrue(profile['avatar'].startswith('data:image/svg+xml'))
        self.assertLess(len(response.get_data()), 20 * 1024)

    def test_community_listing_never_fetches_oversized_avatars(self):
        """Discarding big photos in Python still pulled ~2.4 MB across regions
        per listing. The query must leave them in the database, without
        falling back to one lazy load per user."""
        from sqlalchemy import event

        small = 'data:image/jpeg;base64,' + 'B' * 5000
        with app_module.app.app_context():
            db.session.add(User(email='big@example.com', username='bigone', name='Big One',
                                password_hash='x', avatar='data:image/png;base64,' + 'A' * (300 * 1024)))
            db.session.add(User(email='small@example.com', username='smallone', name='Small One',
                                password_hash='x', avatar=small))
            db.session.commit()

        statements = []

        def capture(conn, cursor, statement, *args):
            statements.append(statement)

        with app_module.app.app_context():
            engine = db.engine
        event.listen(engine, 'before_cursor_execute', capture)
        try:
            response = self.client.get('/api/auth/community')
        finally:
            event.remove(engine, 'before_cursor_execute', capture)

        profiles = {p['username']: p for p in response.get_json()['profiles']}
        self.assertEqual(profiles['smallone']['avatar'], small)
        self.assertTrue(profiles['bigone']['avatar'].startswith('data:image/svg+xml'))

        user_selects = [s for s in statements if 'FROM users' in s]
        self.assertEqual(len(user_selects), 2, 'one count and one page query, no per-user lazy loads')
        for statement in user_selects:
            self.assertNotIn('users.avatar AS users_avatar', statement)
        self.assertIn('CASE WHEN', user_selects[-1])

    def test_community_default_page_covers_all_users(self):
        """Leaderboards are computed client-side from this list."""
        with app_module.app.app_context():
            for index in range(70):
                db.session.add(User(
                    email=f'bulk{index}@example.com', username=f'bulk{index}', name=f'Bulk {index}',
                    password_hash='x',
                ))
            db.session.commit()
        payload = self.client.get('/api/auth/community').get_json()
        self.assertEqual(len(payload['profiles']), 70)
        self.assertFalse(payload['hasMore'])

    # --- admin question validation ------------------------------------------

    def test_question_endpoints_validate_instead_of_crashing(self):
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

        missing = self.client.post('/api/questions', json={'topic': 'Only a topic'})
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(missing.get_json()['error'], 'Question is required.')

        no_body = self.client.post('/api/questions', data='not json', content_type='text/plain')
        self.assertEqual(no_body.status_code, 400)

        created = self.client.post('/api/questions', json={
            'topic': 'Tech', 'question': 'Is AI good?', 'category': 'Society'})
        self.assertEqual(created.status_code, 200)
        question_id = created.get_json()['id']

        blanked = self.client.put(f'/api/questions/{question_id}', json={'question': '   '})
        self.assertEqual(blanked.status_code, 400)

    def test_sample_score_is_validated(self):
        with app_module.app.app_context():
            sample = Sample(filename='s.mp3', topic='t', speaker='s', transcript='x', feedback='y')
            db.session.add(sample)
            db.session.commit()
            sample_id = sample.id
        with self.client.session_transaction() as session:
            session['admin_authenticated'] = True

        response = self.client.put(f'/api/samples/{sample_id}', data={'score': 'excellent'})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('could not convert', response.get_json()['error'])

    # --- misc -----------------------------------------------------------------

    def test_postgres_urls_resolve_to_the_installed_driver(self):
        """SQLAlchemy 2.1 made bare postgresql:// mean psycopg v3, which is not
        installed; the first production deploy died at boot on exactly that.
        create_engine imports the DBAPI, so this fails the same way."""
        from sqlalchemy import create_engine
        for url in ('postgres://u:p@db.example.com:5432/app',
                    'postgresql://u:p@db.example.com:5432/app'):
            normalized = app_module.normalize_database_url(url)
            self.assertTrue(normalized.startswith('postgresql+psycopg2://'), normalized)
            engine = create_engine(normalized)
            self.assertEqual(engine.dialect.driver, 'psycopg2')
            engine.dispose()
        self.assertEqual(app_module.normalize_database_url('sqlite:///x.db'), 'sqlite:///x.db')

    def test_boot_log_never_contains_the_database_password(self):
        redacted = app_module.redact_database_url(
            'postgresql://postgres.ref:SuperSecret123@aws-0.pooler.supabase.com:6543/postgres')
        self.assertNotIn('SuperSecret123', redacted)
        self.assertIn('pooler.supabase.com', redacted)

    def test_progress_chart_keeps_the_same_month_of_different_years_apart(self):
        from datetime import datetime as dt
        from user_progress import build_progress_points

        class Practice:
            def __init__(self, when, total):
                self.created_at = when
                self.scores = {'total': total}

        points = build_progress_points([
            Practice(dt(2025, 9, 10), 0.8),
            Practice(dt(2026, 8, 10), 1.2),
            Practice(dt(2026, 9, 10), 1.6),
        ])
        self.assertEqual([p['value'] for p in points], [0.8, 1.2, 1.6])
        self.assertEqual([p['label'] for p in points], ['Sep', 'Aug', 'Sep'])

if __name__ == '__main__':
    unittest.main()
