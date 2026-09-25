import os
import time
from datetime import timedelta
from functools import wraps

from flask import jsonify, request
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from database import RateLimitEntry, db, utcnow

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None


class PersistentRateLimiter:
    def __init__(self):
        self.redis_client = None
        self.using_redis = False
        self._warned_fallback = False
        self._last_cleanup_at = None

    def init_app(self, app):
        redis_url = os.getenv('REDIS_URL', '').strip()
        if redis_url and redis is not None:
            try:
                client = redis.Redis.from_url(redis_url, decode_responses=True)
                client.ping()
                self.redis_client = client
                self.using_redis = True
                print("[RATE LIMIT] Using Redis-backed rate limiting.")
                return
            except Exception as error:
                print(f"[RATE LIMIT] Redis unavailable, falling back to database storage: {error}")

        if not self._warned_fallback:
            print("[RATE LIMIT] REDIS_URL not configured or redis package unavailable. Using database-backed fallback.")
            self._warned_fallback = True

    def hit(self, scope, identifier, max_requests, window_seconds):
        now_ts = int(time.time())
        window_key = now_ts // window_seconds
        retry_after = ((window_key + 1) * window_seconds) - now_ts

        if self.using_redis and self.redis_client is not None:
            key = f"rate-limit:{scope}:{identifier}:{window_key}"
            count = self.redis_client.incr(key)
            if count == 1:
                self.redis_client.expire(key, window_seconds)
            return count <= max_requests, retry_after

        count = self._increment_database_counter(scope, identifier, window_key, retry_after)
        self._cleanup_expired_entries()
        return count <= max_requests, retry_after

    def _increment_database_counter(self, scope, identifier, window_key, retry_after):
        """Atomically bump the counter for this window and return the new value.

        A read-then-write would race: two concurrent requests in the same window
        both see no row, both insert, and the loser hits the
        (scope, identifier, window_key) unique constraint. That surfaced to the
        caller as a 500 instead of a 429 -- the limiter failing open on exactly
        the burst it exists to catch. A single INSERT .. ON CONFLICT DO UPDATE
        collapses it into one statement the database serialises for us.
        """
        expires_at = utcnow() + timedelta(seconds=retry_after)
        dialect = db.engine.dialect.name
        values = {
            'scope': scope,
            'identifier': identifier,
            'window_key': window_key,
            'count': 1,
            'expires_at': expires_at,
        }

        if dialect in ('postgresql', 'sqlite'):
            build_insert = postgresql_insert if dialect == 'postgresql' else sqlite_insert
            statement = build_insert(RateLimitEntry).values(**values)
            statement = statement.on_conflict_do_update(
                index_elements=['scope', 'identifier', 'window_key'],
                set_={
                    'count': RateLimitEntry.count + 1,
                    'expires_at': expires_at,
                },
            ).returning(RateLimitEntry.count)
            count = db.session.execute(statement).scalar_one()
            db.session.commit()
            return count

        # Any other backend: retry once on the losing insert rather than 500.
        return self._increment_with_retry(scope, identifier, window_key, expires_at)

    def _increment_with_retry(self, scope, identifier, window_key, expires_at):
        for attempt in range(2):
            try:
                entry = RateLimitEntry.query.filter_by(
                    scope=scope, identifier=identifier, window_key=window_key,
                ).with_for_update(nowait=False).first()

                if entry is None:
                    entry = RateLimitEntry(
                        scope=scope,
                        identifier=identifier,
                        window_key=window_key,
                        count=1,
                        expires_at=expires_at,
                    )
                    db.session.add(entry)
                else:
                    entry.count += 1
                    entry.expires_at = expires_at

                db.session.commit()
                return entry.count
            except Exception:
                db.session.rollback()
                if attempt == 1:
                    raise
        raise RuntimeError('unreachable')

    def _cleanup_expired_entries(self):
        """Sweep stale rows, but not on every single request."""
        now = utcnow()
        if self._last_cleanup_at and (now - self._last_cleanup_at) < timedelta(minutes=5):
            return
        self._last_cleanup_at = now
        try:
            RateLimitEntry.query.filter(RateLimitEntry.expires_at < now).delete(synchronize_session=False)
            db.session.commit()
        except Exception as error:
            db.session.rollback()
            print(f"[RATE LIMIT] Cleanup skipped: {error}")

    def current_count(self, scope, identifier, window_seconds):
        """Counter for the active window. Used by tests."""
        window_key = int(time.time()) // window_seconds
        return db.session.execute(
            select(func.coalesce(func.sum(RateLimitEntry.count), 0)).where(
                RateLimitEntry.scope == scope,
                RateLimitEntry.identifier == identifier,
                RateLimitEntry.window_key == window_key,
            )
        ).scalar_one()


rate_limiter = PersistentRateLimiter()


def trusted_proxy_hops():
    """How many proxies in front of the app append to X-Forwarded-For.

    On Render every request arrives as "client, cloudflare, render-internal":
    three hops appended after whatever the client itself sent. Defaults to 3
    in production and 0 (trust nothing, use the socket address) locally.
    """
    configured = os.getenv('TRUSTED_PROXY_HOPS', '').strip()
    if configured:
        try:
            return max(0, int(configured))
        except ValueError:
            pass
    return 3 if os.getenv('PRODUCTION', '').strip().lower() == 'true' else 0


def client_ip():
    """The caller's address, read so that the caller cannot choose it.

    The previous version took the *first* X-Forwarded-For entry. That entry is
    whatever the client sent -- proxies append, they do not replace -- so a
    random header per request gave an attacker unlimited login attempts,
    signups and paid AI analyses. Counting the trusted hops from the right
    yields the address the first trusted proxy actually saw.
    """
    hops = trusted_proxy_hops()
    if hops <= 0:
        return request.remote_addr or 'unknown-client'

    chain = [part.strip() for part in request.headers.get('X-Forwarded-For', '').split(',') if part.strip()]
    if len(chain) >= hops:
        return chain[-hops]
    if chain:
        # Fewer hops than configured: the topology changed. Best effort rather
        # than lumping every client into one bucket.
        return chain[0]
    return request.remote_addr or 'unknown-client'


def build_identifier():
    return client_ip()


def rate_limit(scope, max_requests=10, window_seconds=60):
    def decorator(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            allowed, retry_after = rate_limiter.hit(scope, build_identifier(), max_requests, window_seconds)
            if not allowed:
                response = jsonify({"error": "Rate limit exceeded. Try again later."})
                response.status_code = 429
                response.headers['Retry-After'] = str(retry_after)
                return response
            return func(*args, **kwargs)
        return wrapped

    return decorator
