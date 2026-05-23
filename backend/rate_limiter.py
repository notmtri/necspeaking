import os
import time
from datetime import datetime, timedelta
from functools import wraps

from flask import jsonify, request

from database import RateLimitEntry, db

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None


class PersistentRateLimiter:
    def __init__(self):
        self.redis_client = None
        self.using_redis = False
        self._warned_fallback = False

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

        expires_at = datetime.utcnow() + timedelta(seconds=retry_after)
        entry = RateLimitEntry.query.filter_by(
            scope=scope,
            identifier=identifier,
            window_key=window_key,
        ).first()

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

        self._cleanup_expired_entries()
        db.session.commit()
        return entry.count <= max_requests, retry_after

    def _cleanup_expired_entries(self):
        RateLimitEntry.query.filter(RateLimitEntry.expires_at < datetime.utcnow()).delete(synchronize_session=False)


rate_limiter = PersistentRateLimiter()


def build_identifier():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown-client'


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
