import os
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from werkzeug.security import generate_password_hash


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = BACKEND_DIR / 'test_rate_limit.db'

os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('PRODUCTION', 'false')
os.environ['DATABASE_URL'] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ.setdefault('ADMIN_PASSWORD_HASH', generate_password_hash('admin-pass-123'))
os.environ['ENABLE_EMBEDDED_WORKER'] = 'false'

import app as app_module  # noqa: E402
from database import RateLimitEntry, db  # noqa: E402
from rate_limiter import rate_limiter  # noqa: E402


class RateLimiterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)

    def setUp(self):
        with app_module.app.app_context():
            db.drop_all()
            db.create_all()
        rate_limiter._last_cleanup_at = None

    @classmethod
    def tearDownClass(cls):
        with app_module.app.app_context():
            db.session.remove()
            db.engine.dispose()
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()

    def test_counts_increment_and_then_block(self):
        with app_module.app.app_context():
            results = [rate_limiter.hit('unit-scope', 'client-a', max_requests=3, window_seconds=60) for _ in range(5)]

        allowed = [ok for ok, _ in results]
        self.assertEqual(allowed, [True, True, True, False, False])

    def test_retry_after_is_positive(self):
        with app_module.app.app_context():
            _, retry_after = rate_limiter.hit('unit-scope', 'client-b', max_requests=1, window_seconds=60)
        self.assertGreater(retry_after, 0)
        self.assertLessEqual(retry_after, 60)

    def test_identifiers_are_counted_separately(self):
        with app_module.app.app_context():
            for _ in range(3):
                rate_limiter.hit('unit-scope', 'client-c', max_requests=3, window_seconds=60)
            allowed, _ = rate_limiter.hit('unit-scope', 'client-d', max_requests=3, window_seconds=60)
        self.assertTrue(allowed, 'a different client must not inherit another client\'s count')

    def test_concurrent_hits_do_not_raise_and_do_not_lose_counts(self):
        """The regression this rewrite exists for.

        The old read-then-write let two requests in the same window both see no
        row and both INSERT; the loser hit the unique constraint and the caller
        got a 500 instead of a 429.
        """
        attempts = 24

        def hit_once(_):
            with app_module.app.app_context():
                try:
                    allowed, _retry = rate_limiter.hit(
                        'concurrent-scope', 'client-burst', max_requests=5, window_seconds=60,
                    )
                    return allowed
                except Exception as error:  # surfaced as a 500 in production
                    return error
                finally:
                    db.session.remove()

        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(hit_once, range(attempts)))

        errors = [r for r in results if isinstance(r, Exception)]
        self.assertEqual(errors, [], f'concurrent hits raised instead of rate limiting: {errors}')

        # Every attempt must be counted exactly once -- no lost updates.
        with app_module.app.app_context():
            entry = RateLimitEntry.query.filter_by(
                scope='concurrent-scope', identifier='client-burst',
            ).one()
            self.assertEqual(entry.count, attempts)

        self.assertEqual(sum(1 for r in results if r is True), 5, 'exactly max_requests should be allowed')
        self.assertEqual(sum(1 for r in results if r is False), attempts - 5)


if __name__ == '__main__':
    unittest.main()
