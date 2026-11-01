"""Email verification, forgotten passwords and the retired Teacher role."""
import os
import re
import sys
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest import mock

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / 'test_account_email.db'

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ.setdefault('ALLOWED_ORIGINS', 'http://localhost:3001')
os.environ.setdefault('DATABASE_URL', f"sqlite:///{TEST_DB_PATH.as_posix()}")
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

import app as app_module  # noqa: E402
import email_service  # noqa: E402
from database import User, db  # noqa: E402


CODE = re.compile(r'\b(\d{6})\b')


class AccountEmailTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()
        self.browser = app_module.app.test_client()
        self.sent = []

        def fake_send(to, subject, text):
            self.sent.append({'to': to, 'subject': subject, 'text': text})
            return True

        patches = [
            mock.patch.object(app_module, 'email_enabled', return_value=True),
            mock.patch.object(app_module, 'send_email', side_effect=fake_send),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

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

    def signup(self, browser=None, email='student@example.com', username='student'):
        return (browser or self.browser).post('/api/auth/signup', json={
            'email': email,
            'password': 'oldpassword1',
            'profile': {'name': 'Student One', 'username': username, 'role': 'Teacher'},
        })

    def code_from(self, message):
        return CODE.search(message['text']).group(1)

    def wrong(self, code):
        return f'{(int(code) + 1) % 10 ** 6:06d}'

    def login(self, password, email='student@example.com'):
        return app_module.app.test_client().post('/api/auth/login', json={'email': email, 'password': password})

    def reset(self, code, password='newpassword2', browser=None, email='student@example.com'):
        return (browser or self.browser).post('/api/auth/password/reset', json={
            'email': email, 'code': code, 'newPassword': password})

    # --- verification ---

    def test_signup_emails_a_code_that_confirms_the_address(self):
        response = self.signup()
        self.assertTrue(response.get_json()['verificationSent'])
        self.assertFalse(response.get_json()['user']['emailVerified'])
        self.assertEqual(self.sent[0]['to'], 'student@example.com')
        code = self.code_from(self.sent[0])
        self.assertIn(code, self.sent[0]['subject'])

        confirmed = self.browser.post('/api/auth/verify-email', json={'code': code})
        self.assertEqual(confirmed.status_code, 200)
        self.assertTrue(confirmed.get_json()['user']['emailVerified'])
        self.assertTrue(self.browser.get('/api/auth/me').get_json()['user']['emailVerified'])

    def test_a_code_typed_with_spaces_still_works(self):
        self.signup()
        code = self.code_from(self.sent[0])
        spaced = f'{code[:3]} {code[3:]}'
        self.assertEqual(self.browser.post('/api/auth/verify-email', json={'code': spaced}).status_code, 200)

    def test_a_wrong_code_is_refused(self):
        self.signup()
        refused = self.browser.post('/api/auth/verify-email', json={'code': self.wrong(self.code_from(self.sent[0]))})
        self.assertEqual(refused.status_code, 400)
        self.assertFalse(self.browser.get('/api/auth/me').get_json()['user']['emailVerified'])

    def test_a_new_code_replaces_the_old_one(self):
        self.signup()
        old_code = self.code_from(self.sent[0])
        self.assertEqual(self.browser.post('/api/auth/verify-email/request').status_code, 200)
        new_code = self.code_from(self.sent[1])
        if old_code != new_code:
            self.assertEqual(self.browser.post('/api/auth/verify-email', json={'code': old_code}).status_code, 400)
        self.assertEqual(self.browser.post('/api/auth/verify-email', json={'code': new_code}).status_code, 200)

    def test_confirming_needs_the_account_to_be_logged_in(self):
        self.signup()
        stranger = app_module.app.test_client()
        self.assertEqual(stranger.post('/api/auth/verify-email', json={'code': self.code_from(self.sent[0])}).status_code, 401)

    def test_the_stored_code_is_never_the_code_itself(self):
        self.signup()
        code = self.code_from(self.sent[0])
        with app_module.app.app_context():
            stored = User.query.filter_by(email='student@example.com').first().email_code_hash
        self.assertNotIn(code, stored)
        self.assertEqual(len(stored), 64)

    # --- forgotten password ---

    def test_forgot_password_resets_with_the_emailed_code_and_logs_in(self):
        self.signup()
        stranger = app_module.app.test_client()
        self.assertEqual(stranger.post('/api/auth/password/forgot', json={'email': ' Student@Example.com '}).status_code, 200)
        self.assertIn('reset', self.sent[-1]['subject'])

        reset = self.reset(self.code_from(self.sent[-1]), browser=stranger, email='STUDENT@example.com')
        self.assertEqual(reset.status_code, 200)
        self.assertTrue(reset.get_json()['user']['emailVerified'])  # they proved they read the inbox
        self.assertTrue(stranger.get('/api/auth/me').get_json()['authenticated'])

        self.assertEqual(self.login('oldpassword1').status_code, 401)
        self.assertEqual(self.login('newpassword2').status_code, 200)

    def test_a_reset_code_works_only_once(self):
        self.signup()
        self.browser.post('/api/auth/password/forgot', json={'email': 'student@example.com'})
        code = self.code_from(self.sent[-1])
        self.assertEqual(self.reset(code).status_code, 200)
        self.assertEqual(self.reset(code, password='hijacked99').status_code, 400)
        self.assertEqual(self.login('newpassword2').status_code, 200)

    def test_five_wrong_guesses_kill_the_code(self):
        self.signup()
        self.browser.post('/api/auth/password/forgot', json={'email': 'student@example.com'})
        code = self.code_from(self.sent[-1])
        for _ in range(app_module.EMAIL_CODE_MAX_ATTEMPTS):
            self.assertEqual(self.reset(self.wrong(code)).status_code, 400)
        self.assertEqual(self.reset(code).status_code, 400)  # even the right one, now
        self.assertEqual(self.login('oldpassword1').status_code, 200)

    def test_an_expired_code_is_refused(self):
        self.signup()
        self.browser.post('/api/auth/password/forgot', json={'email': 'student@example.com'})
        code = self.code_from(self.sent[-1])
        with app_module.app.app_context():
            user = User.query.filter_by(email='student@example.com').first()
            user.email_code_expires_at = app_module.utcnow() - app_module.timedelta(seconds=1)
            db.session.commit()
        self.assertEqual(self.reset(code).status_code, 400)

    def test_a_confirmation_code_cannot_reset_a_password(self):
        self.signup()
        self.assertEqual(self.reset(self.code_from(self.sent[0])).status_code, 400)
        self.assertEqual(self.login('oldpassword1').status_code, 200)

    def test_a_code_only_works_for_its_own_account(self):
        self.signup()
        other = app_module.app.test_client()
        self.signup(browser=other, email='other@example.com', username='otherstudent')
        self.browser.post('/api/auth/password/forgot', json={'email': 'student@example.com'})
        code = self.code_from(self.sent[-1])
        self.assertEqual(self.reset(code, email='other@example.com').status_code, 400)

    def test_forgot_password_does_not_reveal_whether_an_account_exists(self):
        response = self.browser.post('/api/auth/password/forgot', json={'email': 'nobody@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.sent, [])
        unknown = self.reset('123456', email='nobody@example.com')
        self.assertEqual(unknown.status_code, 400)

    def test_a_short_new_password_is_refused(self):
        self.signup()
        self.browser.post('/api/auth/password/forgot', json={'email': 'student@example.com'})
        self.assertEqual(self.reset(self.code_from(self.sent[-1]), password='short').status_code, 400)
        self.assertEqual(self.login('oldpassword1').status_code, 200)

    # --- community posting ---

    def test_posting_in_the_community_needs_a_confirmed_email(self):
        self.signup()
        post = {'title': 'Hello', 'body': 'First post'}
        blocked = self.browser.post('/api/community/posts', json=post)
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.get_json()['code'], 'email_unverified')

        self.browser.post('/api/auth/verify-email', json={'code': self.code_from(self.sent[0])})
        self.assertEqual(self.browser.post('/api/community/posts', json=post).status_code, 201)

    # --- roles ---

    def test_nobody_can_give_themselves_the_teacher_badge(self):
        self.assertEqual(self.signup().get_json()['user']['role'], 'Student')
        updated = self.browser.put('/api/auth/profile', json={'name': 'Student One', 'role': 'Teacher'})
        self.assertEqual(updated.get_json()['user']['role'], 'Student')


class EmailTurnedOffTests(unittest.TestCase):
    """Before RESEND_API_KEY is set, nothing pretends to send."""

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()
        self.browser = app_module.app.test_client()
        patch = mock.patch.dict(os.environ, {'RESEND_API_KEY': ''})
        patch.start()
        self.addCleanup(patch.stop)

    def tearDown(self):
        with app_module.app.app_context():
            db.session.remove()

    def test_features_say_email_is_off_and_posting_stays_open(self):
        signup = self.browser.post('/api/auth/signup', json={
            'email': 'off@example.com', 'password': 'oldpassword1',
            'profile': {'name': 'Off Student', 'username': 'offstudent'}})
        self.assertFalse(signup.get_json()['verificationSent'])
        self.assertFalse(self.browser.get('/api/auth/me').get_json()['emailEnabled'])
        self.assertEqual(self.browser.post('/api/auth/password/forgot', json={'email': 'off@example.com'}).status_code, 503)
        self.assertEqual(self.browser.post('/api/auth/verify-email/request').status_code, 503)
        self.assertEqual(self.browser.post('/api/community/posts', json={'title': 'Hi', 'body': 'Still open'}).status_code, 201)

    def test_production_never_prints_a_link_it_could_not_send(self):
        output = StringIO()
        with mock.patch.dict(os.environ, {'PRODUCTION': 'true'}), redirect_stdout(output):
            self.assertFalse(email_service.send_email('a@example.com', 'Reset', 'Your code: 482913'))
        self.assertNotIn('482913', output.getvalue())


class ResendRequestTests(unittest.TestCase):
    def test_send_email_posts_to_resend_with_the_key_and_sender(self):
        response = mock.Mock(status_code=200, text='{"id":"1"}')
        env = {'RESEND_API_KEY': 're_test_key', 'EMAIL_FROM': 'necs. <no-reply@necspeaking.com>'}
        with mock.patch.dict(os.environ, env), mock.patch.object(email_service.httpx, 'post', return_value=response) as post:
            self.assertTrue(email_service.send_email('a@example.com', 'Subject', 'Body'))
        url = post.call_args.args[0]
        self.assertEqual(url, 'https://api.resend.com/emails')
        self.assertEqual(post.call_args.kwargs['headers']['Authorization'], 'Bearer re_test_key')
        self.assertEqual(post.call_args.kwargs['json']['to'], ['a@example.com'])
        self.assertEqual(post.call_args.kwargs['json']['from'], 'necs. <no-reply@necspeaking.com>')
        self.assertEqual(post.call_args.kwargs['json']['reply_to'], 'necspeaking@gmail.com')

    def test_a_rejected_send_reports_failure(self):
        with mock.patch.dict(os.environ, {'RESEND_API_KEY': 're_test_key'}), \
                mock.patch.object(email_service.httpx, 'post', return_value=mock.Mock(status_code=403, text='domain not verified')), \
                redirect_stdout(StringIO()):
            self.assertFalse(email_service.send_email('a@example.com', 'Subject', 'Body'))


if __name__ == '__main__':
    unittest.main()
