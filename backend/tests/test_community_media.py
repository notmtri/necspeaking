"""Post reactions, post images and profile cover photos."""
import base64
import os
import sys
import unittest
from pathlib import Path

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ.setdefault('ALLOWED_ORIGINS', 'http://localhost:3001')
os.environ.setdefault('DATABASE_URL', f"sqlite:///{(BACKEND_DIR / 'test_community_media.db').as_posix()}")
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

import app as app_module  # noqa: E402
from database import db  # noqa: E402

# A real 1x1 PNG, so the served bytes can be checked.
PNG_BYTES = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
PNG_URI = 'data:image/png;base64,' + base64.b64encode(PNG_BYTES).decode()


class CommunityMediaTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with app_module.app.app_context():
            db.session.remove()

    def account(self, username):
        browser = app_module.app.test_client()
        response = browser.post('/api/auth/signup', json={
            'email': f'{username}@example.com', 'password': 'strongpass123',
            'profile': {'name': username.title(), 'username': username}})
        self.assertEqual(response.status_code, 201)
        return browser

    def post(self, browser, **extra):
        response = browser.post('/api/community/posts', json={'title': 'Hello', 'body': 'A post', **extra})
        return response

    # --- reactions ---

    def test_reactions_toggle_and_count_once_per_account(self):
        author = self.account('author')
        post_id = self.post(author).get_json()['post']['id']
        fan, other = self.account('fan'), self.account('other')

        first = fan.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '👍'}).get_json()
        self.assertEqual(first['reactions']['👍'], 1)
        self.assertEqual(first['myReactions'], ['👍'])
        other.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '👍'})
        fan.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '😆'})

        feed = fan.get('/api/community/posts').get_json()['posts'][0]
        self.assertEqual(feed['reactions'], {'👍': 2, '🩷': 0, '😆': 1, '🥲': 0, '😮': 0})
        self.assertEqual(sorted(feed['myReactions']), sorted(['👍', '😆']))

        undone = fan.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '👍'}).get_json()
        self.assertEqual(undone['reactions']['👍'], 1)
        self.assertEqual(undone['myReactions'], ['😆'])

    def test_only_the_five_reactions_are_accepted(self):
        author = self.account('author')
        post_id = self.post(author).get_json()['post']['id']
        self.assertEqual(author.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '💩'}).status_code, 400)

    def test_guests_cannot_react_but_see_counts(self):
        author = self.account('author')
        post_id = self.post(author).get_json()['post']['id']
        guest = app_module.app.test_client()
        self.assertEqual(guest.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '🩷'}).status_code, 401)
        self.assertEqual(guest.get('/api/community/posts').get_json()['posts'][0]['myReactions'], [])

    # --- post images ---

    def test_a_post_can_carry_an_image_served_from_its_own_url(self):
        author = self.account('author')
        created = self.post(author, image=PNG_URI).get_json()['post']
        self.assertEqual(created['imageUrl'], f"/api/community/posts/{created['id']}/image")

        image = app_module.app.test_client().get(created['imageUrl'])
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.mimetype, 'image/png')
        self.assertEqual(image.data, PNG_BYTES)
        self.assertIn('immutable', image.headers['Cache-Control'])

        feed = author.get('/api/community/posts').get_json()['posts'][0]
        self.assertNotIn(PNG_URI, str(feed))  # the feed carries the URL, not the picture

    def test_posts_without_images_say_so(self):
        author = self.account('author')
        post = self.post(author).get_json()['post']
        self.assertIsNone(post['imageUrl'])
        self.assertEqual(author.get(f"/api/community/posts/{post['id']}/image").status_code, 404)

    def test_non_images_and_huge_images_are_refused(self):
        author = self.account('author')
        self.assertEqual(self.post(author, image='data:text/html;base64,PGgxPg==').status_code, 400)
        huge = 'data:image/png;base64,' + 'A' * (app_module.MAX_POST_IMAGE_CHARS + 10)
        self.assertEqual(self.post(author, image=huge).status_code, 400)

    # --- covers ---

    def test_a_cover_photo_can_be_set_served_and_removed(self):
        student = self.account('student')
        saved = student.put('/api/auth/profile', json={'cover': PNG_URI}).get_json()['user']
        self.assertTrue(saved['coverUrl'].startswith(f"/api/users/{saved['id'].split('-')[1]}/cover?v="))

        cover = app_module.app.test_client().get(saved['coverUrl'])
        self.assertEqual(cover.status_code, 200)
        self.assertEqual(cover.data, PNG_BYTES)

        public = app_module.app.test_client().get('/api/auth/community').get_json()['profiles'][0]
        self.assertEqual(public['coverUrl'], saved['coverUrl'])

        removed = student.put('/api/auth/profile', json={'cover': ''}).get_json()['user']
        self.assertIsNone(removed['coverUrl'])

    # --- profile photos in lists ---

    def test_post_authors_link_to_their_photo_instead_of_carrying_it(self):
        author = self.account('author')
        author.put('/api/auth/profile', json={'avatar': PNG_URI})
        self.post(author)
        plain = self.account('plain')
        self.post(plain)

        posts = app_module.app.test_client().get('/api/community/posts').get_json()['posts']
        by_name = {p['author']['username']: p['author'] for p in posts}
        self.assertEqual(by_name['author']['avatar'], '')
        self.assertIsNone(by_name['plain']['avatarUrl'])  # generated initials: the placeholder

        photo = app_module.app.test_client().get(by_name['author']['avatarUrl'])
        self.assertEqual(photo.status_code, 200)
        self.assertEqual(photo.mimetype, 'image/png')
        self.assertEqual(photo.data, PNG_BYTES)

    def test_posts_load_their_authors_without_one_query_each(self):
        from sqlalchemy import event
        for name in ('ana', 'bao', 'chi', 'dan'):
            self.post(self.account(name))
        statements = []
        with app_module.app.app_context():
            engine = db.engine
        capture = lambda conn, cursor, statement, *args: statements.append(statement)  # noqa: E731
        event.listen(engine, 'before_cursor_execute', capture)
        try:
            response = app_module.app.test_client().get('/api/community/posts')
        finally:
            event.remove(engine, 'before_cursor_execute', capture)
        self.assertEqual(len(response.get_json()['posts']), 4)
        user_queries = [s for s in statements if 'FROM users' in s or 'JOIN users' in s]
        self.assertLessEqual(len(user_queries), 2, 'posts with their authors, then who has a photo')
        for statement in user_queries:
            self.assertNotIn('users.avatar AS', statement)

    def test_a_new_photo_gets_a_new_link(self):
        browser = self.account('mover')
        browser.put('/api/auth/profile', json={'avatar': PNG_URI})
        self.post(browser)
        first = app_module.app.test_client().get('/api/auth/community').get_json()['profiles'][0]['avatarUrl']
        import time
        time.sleep(1.1)  # the link's version is the save time, to the second
        other = 'data:image/png;base64,' + base64.b64encode(PNG_BYTES + bytes(1)).decode()
        browser.put('/api/auth/profile', json={'avatar': other})
        second = app_module.app.test_client().get('/api/auth/community').get_json()['profiles'][0]['avatarUrl']
        self.assertNotEqual(first, second)

    def test_saving_only_a_cover_keeps_the_profile_photo(self):
        student = self.account('student')
        with_photo = student.put('/api/auth/profile', json={'avatar': PNG_URI}).get_json()['user']
        after_cover = student.put('/api/auth/profile', json={'cover': PNG_URI}).get_json()['user']
        self.assertEqual(after_cover['avatar'], with_photo['avatar'])


if __name__ == '__main__':
    unittest.main()
