"""The 15 achievement badges: thresholds, tiers and the endpoints."""
import base64
import os
import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ.setdefault('ALLOWED_ORIGINS', 'http://localhost:3001')
os.environ.setdefault('DATABASE_URL', f"sqlite:///{(BACKEND_DIR / 'test_achievements.db').as_posix()}")
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

import app as app_module  # noqa: E402
from achievements import BADGES, compute_achievements  # noqa: E402
from database import User, db  # noqa: E402
from user_progress import create_practice_session  # noqa: E402

START = datetime(2026, 10, 1, 9, 0)


def attempt(day=0, total=1.5, content=0.7, accuracy=0.45, delivery=0.35, prompt='q1', spoken=200, fillers=5, source=None):
    return SimpleNamespace(
        created_at=START + timedelta(days=day),
        scores={'total': total, 'content': content, 'accuracy': accuracy, 'delivery': delivery},
        prompt_key=prompt,
        metrics={'available': True, 'paceSeries': [{'start': 0, 'end': spoken, 'wpm': 120}], 'fillers': {'total': fillers}},
        source=source,
    )


def badge(result, key):
    return next(item for item in result if item['key'] == key)


class AchievementRulesTests(unittest.TestCase):
    def test_there_are_fifteen_badges_with_three_rising_tiers(self):
        self.assertEqual(len(BADGES), 15)
        for item in BADGES:
            low, mid, high = item['thresholds']
            self.assertLess(low, mid, item['name'])
            self.assertLess(mid, high, item['name'])

    def test_nothing_is_earned_with_no_activity(self):
        self.assertTrue(all(item['tier'] == 0 for item in compute_achievements([])))

    def test_the_first_practice_earns_bronze(self):
        result = badge(compute_achievements([attempt()]), 'practices')
        self.assertEqual((result['tier'], result['tierName'], result['nextTarget']), (1, 'bronze', 10))

    def test_best_streak_counts_even_after_it_ends(self):
        days = [0, 1, 2, 3, 4, 5, 6, 20]  # a 7-day run, then a gap
        self.assertEqual(badge(compute_achievements([attempt(day=d) for d in days]), 'streak')['tier'], 2)

    def test_score_badges_use_the_best_single_attempt(self):
        practices = [attempt(total=1.2), attempt(day=1, total=1.86, content=0.86, accuracy=0.56, delivery=0.46)]
        result = compute_achievements(practices)
        for key in ('best_score', 'content', 'accuracy', 'delivery'):
            self.assertEqual(badge(result, key)['tier'], 3, key)

    def test_average_needs_five_practices(self):
        four = [attempt(day=d, total=1.8) for d in range(4)]
        self.assertEqual(badge(compute_achievements(four), 'average')['tier'], 0)
        self.assertEqual(badge(compute_achievements(four + [attempt(day=5, total=1.8)]), 'average')['tier'], 3)

    def test_all_rounder_is_held_back_by_the_weakest_criterion(self):
        # content 0.81/0.9 = 90%, accuracy 0.54/0.6 = 90%, delivery 0.36/0.5 = 72%
        result = badge(compute_achievements([attempt(content=0.81, accuracy=0.54, delivery=0.36)]), 'balanced')
        self.assertEqual(result['tier'], 1)

    def test_comeback_measures_the_rise_on_one_question(self):
        practices = [attempt(day=0, total=1.3, prompt='a'), attempt(day=1, total=1.55, prompt='a'), attempt(day=2, total=1.9, prompt='b')]
        result = badge(compute_achievements(practices), 'comeback')
        self.assertAlmostEqual(result['value'], 0.25)
        self.assertEqual(result['tier'], 2)

    def test_a_drop_on_a_retry_is_not_a_comeback(self):
        practices = [attempt(day=0, total=1.6, prompt='a'), attempt(day=1, total=1.4, prompt='a')]
        self.assertEqual(badge(compute_achievements(practices), 'comeback')['value'], 0)

    def test_explorer_counts_different_questions(self):
        practices = [attempt(day=d, prompt=f'q{d % 12}') for d in range(30)]
        self.assertEqual(badge(compute_achievements(practices), 'explorer')['value'], 12)

    def test_full_answers_count_speaking_time_not_recording_length(self):
        practices = [attempt(spoken=295), attempt(spoken=240)]  # the second may be a 5:00 recording with silence
        self.assertEqual(badge(compute_achievements(practices), 'full_answers')['value'], 1)

    def test_last_word_time_is_used_when_stored(self):
        practice = attempt(spoken=100)
        practice.metrics['lastWordSeconds'] = 292
        self.assertEqual(badge(compute_achievements([practice]), 'full_answers')['value'], 1)

    def test_clean_answers_need_three_minutes_and_two_fillers_at_most(self):
        practices = [attempt(spoken=200, fillers=2), attempt(spoken=200, fillers=3), attempt(spoken=120, fillers=0)]
        self.assertEqual(badge(compute_achievements(practices), 'clean_answers')['value'], 1)

    def test_attempts_without_timings_never_count_for_timing_badges(self):
        practice = attempt()
        practice.metrics = None
        result = compute_achievements([practice])
        self.assertEqual(badge(result, 'full_answers')['value'], 0)
        self.assertEqual(badge(result, 'clean_answers')['value'], 0)

    def test_only_simulation_attempts_are_mock_tests(self):
        practices = [attempt(source='simulation'), attempt(source='analyze'), attempt(source=None)]
        self.assertEqual(badge(compute_achievements(practices), 'mock_tests')['value'], 1)

    def test_community_badges_use_the_counts_given(self):
        result = compute_achievements([], posts_count=5, reactions_received=31)
        self.assertEqual(badge(result, 'posts')['tier'], 2)
        self.assertEqual(badge(result, 'reactions')['tier'], 3)


class AchievementEndpointTests(unittest.TestCase):
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
        return browser, int(response.get_json()['user']['id'].split('-')[1])

    def test_own_profile_gets_every_badge_with_progress(self):
        browser, user_id = self.account('student')
        with app_module.app.app_context():
            create_practice_session(db.session.get(User, user_id), 'Question 1', 'text', 300,
                                    {'content': 0.8, 'accuracy': 0.5, 'delivery': 0.4, 'total': 1.7}, source='simulation')
            db.session.commit()
        result = browser.get('/api/auth/achievements').get_json()['achievements']
        self.assertEqual(len(result), 15)
        self.assertEqual(badge(result, 'practices')['tier'], 1)
        self.assertEqual(badge(result, 'mock_tests')['tier'], 1)
        self.assertEqual(badge(result, 'best_score')['tier'], 2)

    def test_reactions_count_only_from_other_people(self):
        author, author_id = self.account('author')
        post_id = author.post('/api/community/posts', json={'title': 'Hi', 'body': 'Post'}).get_json()['post']['id']
        author.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '👍'})
        fan, _ = self.account('fan')
        fan.post(f'/api/community/posts/{post_id}/reactions', json={'emoji': '🩷'})
        result = author.get('/api/auth/achievements').get_json()['achievements']
        self.assertEqual(badge(result, 'reactions')['value'], 1)
        self.assertEqual(badge(result, 'posts')['value'], 1)

    def test_public_profiles_show_only_earned_badges(self):
        author, author_id = self.account('author')
        author.post('/api/community/posts', json={'title': 'Hi', 'body': 'Post'})
        public = app_module.app.test_client().get(f'/api/users/{author_id}/achievements').get_json()['achievements']
        self.assertEqual(public, [{'key': 'posts', 'name': "Now You're Speaking", 'tier': 1, 'tierName': 'bronze'}])

    def test_own_achievements_need_a_login(self):
        self.assertEqual(app_module.app.test_client().get('/api/auth/achievements').status_code, 401)


if __name__ == '__main__':
    unittest.main()
