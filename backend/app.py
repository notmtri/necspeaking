from flask import Flask, g, jsonify, redirect, request, send_file, session
from flask_cors import CORS
from dotenv import load_dotenv
import json
import logging
import os
import sys
import warnings
import secrets
from functools import wraps
from datetime import datetime, timedelta

warnings.filterwarnings("ignore", message="Core Pydantic V1 functionality")

from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge
from groq import Groq
import re
import random
from sqlalchemy import inspect
from sqlalchemy.engine import make_url

from analysis_service import allowed_file, build_job_storage_path, cleanup_old_files, get_audio_duration
from database import MAX_AVATAR_CHARS, AnalysisJob, AppAnnouncement, CommunityPost, Question, RateLimitEntry, Sample, User, UserPracticeSession, avatar_from_name, build_prompt_key, db, utcnow
from job_worker import AnalysisWorker, should_start_embedded_worker
from rate_limiter import client_ip, rate_limit, rate_limiter
import cloudinary
import cloudinary.uploader

load_dotenv()

# The React app is deployed separately (see vercel.json); this process is API-only.
app = Flask(__name__)

# REMOVED REDIS LIMITER - Use custom rate limiting instead
# If you need Redis later, add it back with proper configuration

IS_PRODUCTION = os.getenv('PRODUCTION', '').strip().lower() == 'true'


def sanitize_broken_proxy_env():
    for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']:
        value = os.getenv(key, '').strip().lower()
        if value in {
            'http://127.0.0.1:9',
            'http://localhost:9',
            'https://127.0.0.1:9',
            'https://localhost:9',
        }:
            os.environ.pop(key, None)
            print(f"[NET] Ignoring broken proxy setting from {key}.")


sanitize_broken_proxy_env()


def require_env(name):
    value = os.getenv(name)
    if IS_PRODUCTION and not value:
        raise RuntimeError(f"{name} must be set when PRODUCTION=true.")
    return value


# Security Configuration
secret_key = require_env('SECRET_KEY')
if not secret_key:
    secret_key = secrets.token_hex(32)
    print("[WARN] SECRET_KEY is not set. Generated a temporary development key.")

app.config['SECRET_KEY'] = secret_key
app.config['SESSION_COOKIE_NAME'] = os.getenv('SESSION_COOKIE_NAME', 'necs_session')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_PATH'] = '/'
session_cookie_domain = os.getenv('SESSION_COOKIE_DOMAIN', '').strip()
if session_cookie_domain:
    app.config['SESSION_COOKIE_DOMAIN'] = session_cookie_domain

# Environment-specific cookie settings
if IS_PRODUCTION:
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'  # Required for cross-origin
else:
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# 'None' is only needed while the API lives on a different site from the app.
# Serve it from a subdomain of the app's own domain and this can be 'Lax'.
samesite_override = os.getenv('SESSION_COOKIE_SAMESITE', '').strip().capitalize()
if samesite_override in {'Lax', 'Strict', 'None'}:
    app.config['SESSION_COOKIE_SAMESITE'] = samesite_override

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)

# Database Configuration
database_url = os.getenv('DATABASE_URL', 'sqlite:///necs.db')

def normalize_database_url(url):
    """Pin PostgreSQL URLs to the psycopg2 driver that requirements.txt installs.

    SQLAlchemy 2.1 changed the default driver for a bare postgresql:// URL
    from psycopg2 to psycopg (v3). A fresh install on Render resolved 2.1 and
    the app died at boot with "No module named 'psycopg'". Naming the driver
    makes the URL mean the same thing on every SQLAlchemy version. The legacy
    postgres:// scheme some hosts hand out is handled the same way.
    """
    for scheme in ('postgres://', 'postgresql://'):
        if url.startswith(scheme):
            return 'postgresql+psycopg2://' + url[len(scheme):]
    return url


database_url = normalize_database_url(database_url)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Use SSL only for real PostgreSQL, not SQLite
if 'postgresql' in database_url:
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {
            "sslmode": "require",
            "connect_timeout": 30,
        }
    }

def redact_database_url(url):
    """The URL minus its password. The old boot log printed the first 50
    characters of DATABASE_URL, which put the user name and the start of the
    password into the hosting provider's logs on every restart."""
    try:
        parsed = make_url(url)
        return parsed.render_as_string(hide_password=True)
    except Exception:
        return url.split('://', 1)[0] + '://***'


print(f"[DB] Connecting to: {redact_database_url(database_url)}")

db.init_app(app)


ALEMBIC_CLI_COMMANDS = {
    'upgrade', 'downgrade', 'migrate', 'revision', 'stamp',
    'current', 'history', 'heads', 'branches', 'show', 'merge', 'init', 'edit',
}


def running_migration_command():
    """True when this process is a `flask db ...` invocation.

    Importing this module normally creates any missing tables, which is handy
    for a plain app boot but wrong during migrations: Alembic would then run
    against tables that already exist in their newest shape, and its
    ALTER steps would fail. Migrations own the schema, so stand aside.
    """
    argv = set(sys.argv[1:])
    return 'db' in argv and bool(argv & ALEMBIC_CLI_COMMANDS)


def ensure_runtime_tables():
    if running_migration_command():
        print("[DB] Migration command detected; leaving schema to Alembic.")
        return
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            table_names = inspector.get_table_names()
            managed_tables = [
                ('users', User.__table__),
                ('user_practice_sessions', UserPracticeSession.__table__),
                ('community_posts', CommunityPost.__table__),
                ('app_announcements', AppAnnouncement.__table__),
                ('analysis_jobs', AnalysisJob.__table__),
                ('rate_limit_entries', RateLimitEntry.__table__),
                ('questions', Question.__table__),
                ('samples', Sample.__table__),
            ]
            for table_name, table in managed_tables:
                if table_name not in table_names:
                    table.create(bind=db.engine, checkfirst=True)
                    print(f"[DB] Created missing {table_name} table.")
        except Exception as e:
            print(f"[WARN] Could not ensure runtime tables: {e}")

def should_run_startup_db_sync():
    """Avoid expensive create_all() on cloud cold starts unless explicitly enabled."""
    create_tables_on_start = os.getenv('CREATE_TABLES_ON_START', '').strip().lower()
    if create_tables_on_start in ['1', 'true', 'yes']:
        return True
    if create_tables_on_start in ['0', 'false', 'no']:
        return False
    # Default behavior: run on local SQLite only.
    return database_url.startswith('sqlite')

if should_run_startup_db_sync() and not running_migration_command():
    with app.app_context():
        try:
            db.create_all()
            print("[DB] Database tables created successfully.")
        except Exception as e:
            print(f"[WARN] DB init warning: {e}")
            print("[WARN] App will start anyway - tables may already exist.")
else:
    print("[DB] Skipping db.create_all() on startup.")

ensure_runtime_tables()

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

# SECURE CORS
default_allowed_origins = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'
allowed_origins_raw = require_env('ALLOWED_ORIGINS') or default_allowed_origins
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_raw.split(',') if origin.strip()]

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Added OPTIONS
        "allow_headers": ["Content-Type", "X-CSRF-Token", "X-Request-ID"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "X-Request-ID", "X-CSRF-Token"]  # Added this
    }
})


def wants_json_response():
    return request.path.startswith('/api/')


logger = logging.getLogger('necs.backend')
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

CSRF_EXEMPT_PATHS = {
    '/api/auth/login',
    '/api/auth/signup',
    '/api/admin/login',
}


def ensure_csrf_token():
    token = session.get('csrf_token')
    if not token:
        token = secrets.token_urlsafe(32)
        session['csrf_token'] = token
    return token


def csrf_protection_enabled():
    return not app.config.get('TESTING', False) and not app.config.get('CSRF_DISABLED', False)


def session_carries_authority():
    """True when the session cookie would let a forged request act as someone.

    CSRF abuses the credentials a browser attaches automatically. A request
    with no logged-in user or admin behind it has nothing to abuse -- an
    attacker could send the same request directly. Demanding a token anyway is
    what broke guest analysis in every browser that blocks third-party cookies
    (Safari/iOS, Brave, Chrome incognito): the API is on a different site from
    the app, so the session cookie holding the token never arrives and every
    upload was rejected with 403.
    """
    return bool(session.get('admin_authenticated') or get_current_user())


@app.before_request
def attach_request_context():
    g.request_id = request.headers.get('X-Request-ID') or secrets.token_hex(8)
    g.request_started_at = utcnow()
    if wants_json_response():
        ensure_csrf_token()

    if not csrf_protection_enabled():
        return None
    if request.method in {'GET', 'HEAD', 'OPTIONS'}:
        return None
    if not wants_json_response():
        return None
    if request.path in CSRF_EXEMPT_PATHS:
        return None
    if not session_carries_authority():
        return None

    expected_token = session.get('csrf_token')
    supplied_token = request.headers.get('X-CSRF-Token', '')
    if not expected_token or not supplied_token or supplied_token != expected_token:
        return jsonify({"error": "CSRF validation failed."}), 403
    return None


@app.after_request
def finalize_response(response):
    request_id = getattr(g, 'request_id', '')
    if request_id:
        response.headers['X-Request-ID'] = request_id

    if wants_json_response():
        csrf_token = session.get('csrf_token')
        if csrf_token:
            response.headers['X-CSRF-Token'] = csrf_token
            response.set_cookie(
                'csrf_token',
                csrf_token,
                secure=app.config['SESSION_COOKIE_SECURE'],
                httponly=False,
                samesite=app.config['SESSION_COOKIE_SAMESITE'],
                path='/',
            )

    started_at = getattr(g, 'request_started_at', None)
    duration_ms = int((utcnow() - started_at).total_seconds() * 1000) if started_at else None
    log_payload = {
        'requestId': request_id,
        'method': request.method,
        'path': request.path,
        'status': response.status_code,
        'durationMs': duration_ms,
        'clientIp': client_ip(),
    }
    logger.info(json.dumps(log_payload))
    return response


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({"error": "Uploaded file is too large."}), 413


@app.errorhandler(HTTPException)
def handle_http_exception(e):
    if wants_json_response():
        return jsonify({"error": e.description or e.name}), e.code
    return e


@app.errorhandler(Exception)
def handle_unexpected_exception(e):
    if isinstance(e, HTTPException):
        return handle_http_exception(e)
    logger.error(json.dumps({
        "requestId": getattr(g, 'request_id', ''),
        "event": "unhandled_exception",
        "error": str(e),
        "path": request.path,
        "method": request.method,
    }))
    if wants_json_response():
        return jsonify({"error": "Internal server error."}), 500
    raise e

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'uploads')

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

groq_api_key = require_env("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
if not groq_client:
    print("[WARN] GROQ_API_KEY is not set. Speech analysis endpoints will fail until it is configured.")
if not os.getenv('GEMINI_API_KEY', '').strip():
    print("[WARN] GEMINI_API_KEY is not set. Speech grading will use the Groq fallback model.")

rate_limiter.init_app(app)
analysis_worker = AnalysisWorker(app, lambda: get_groq_client(), app.config['UPLOAD_FOLDER']) if should_start_embedded_worker() else None

# Admin password configuration
ADMIN_PASSWORD_HASH = require_env('ADMIN_PASSWORD_HASH')
if not ADMIN_PASSWORD_HASH:
    dev_admin_password = os.getenv('ADMIN_DEV_PASSWORD', 'admin-dev-password')
    ADMIN_PASSWORD_HASH = generate_password_hash(dev_admin_password)
    print("[WARN] ADMIN_PASSWORD_HASH is not set. Using ADMIN_DEV_PASSWORD for local development only.")

DEFAULT_USER_STATS = {
    "practices": 0,
    "avgScore": 0,
    "streak": 0,
    "bestScore": 0
}
DEFAULT_USER_PROGRESS = []
DEFAULT_USER_COMMIT_WEEKS = []

def require_admin():
    """Decorator to require admin authentication"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not session.get('admin_authenticated'):
                return jsonify({"error": "Unauthorized. Admin login required."}), 401
            return f(*args, **kwargs)
        return wrapped
    return decorator


def normalize_email(email):
    return (email or '').strip().lower()


def normalize_username(username):
    cleaned = re.sub(r'[^a-z0-9._]', '', (username or '').strip().lower())
    return cleaned[:50]


def validate_account_payload(data, is_signup=False):
    email = normalize_email(data.get('email'))
    password = data.get('password', '')
    profile = data.get('profile') or {}

    if not email:
        return None, "Email is required."
    if not re.fullmatch(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return None, "Enter a valid email address."
    if not password or len(password) < 8:
        return None, "Password must be at least 8 characters."

    payload = {
        "email": email,
        "password": password,
        "name": (profile.get('name') or '').strip(),
        "username": normalize_username(profile.get('username')),
        "class_name": (profile.get('className') or '').strip(),
        "school": (profile.get('school') or '').strip(),
        "cohort": (profile.get('cohort') or '').strip(),
        "role": (profile.get('role') or 'Student').strip(),
        "bio": (profile.get('bio') or '').strip()
    }

    if payload["role"] not in ["Student", "Teacher"]:
        payload["role"] = "Student"

    if is_signup:
        if not payload["name"]:
            return None, "Full name is required."
        if not payload["username"] or len(payload["username"]) < 3:
            return None, "Username must be at least 3 characters."

    return payload, None


def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)


def require_login():
    """Decorator to require user authentication"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not get_current_user():
                return jsonify({"error": "Authentication required."}), 401
            return f(*args, **kwargs)
        return wrapped
    return decorator


# The community listing is a public, unauthenticated endpoint returning whole
# profiles. Without a ceiling its payload grows with the user base.
#
# The default must cover every user for now: the client computes the
# leaderboards and the username search from whatever this returns, so a page
# of the 60 most recently *updated* users silently dropped top scorers who had
# not practised lately. Avatars are bounded (see database.py), which keeps a
# full page small.
COMMUNITY_PAGE_SIZE = 200
COMMUNITY_MAX_PAGE_SIZE = 200

DEFAULT_ANNOUNCEMENT_MESSAGE = 'IMPORTANT NOTICE: Authentication system is still under development, please continue as guest.'


def get_or_create_announcement():
    announcement = AppAnnouncement.query.order_by(AppAnnouncement.id.asc()).first()
    if announcement:
        return announcement

    announcement = AppAnnouncement(enabled=True, message=DEFAULT_ANNOUNCEMENT_MESSAGE)
    db.session.add(announcement)
    db.session.commit()
    return announcement


# ============= AUTHENTICATION ROUTES =============

@app.route('/api/auth/signup', methods=['POST'])
@rate_limit('auth-signup', max_requests=5, window_seconds=300)
def signup():
    try:
        data = request.get_json(silent=True) or {}
        payload, error = validate_account_payload(data, is_signup=True)
        if error:
            return jsonify({"error": error}), 400

        existing_email = User.query.filter_by(email=payload["email"]).first()
        if existing_email:
            return jsonify({"error": "An account with this email already exists."}), 409

        existing_username = User.query.filter_by(username=payload["username"]).first()
        if existing_username:
            return jsonify({"error": "That username is already taken."}), 409

        user = User(
            email=payload["email"],
            username=payload["username"],
            password_hash=generate_password_hash(payload["password"]),
            name=payload["name"],
            class_name=payload["class_name"],
            school=payload["school"],
            cohort=payload["cohort"],
            role=payload["role"],
            bio=payload["bio"] or 'Practicing consistently and tracking progress on necs.',
            avatar=avatar_from_name(payload["name"]),
            stats=dict(DEFAULT_USER_STATS),
            progress=list(DEFAULT_USER_PROGRESS),
            commit_weeks=[list(week) for week in DEFAULT_USER_COMMIT_WEEKS]
        )

        db.session.add(user)
        db.session.commit()

        session['user_id'] = user.id
        session.permanent = False

        return jsonify({"success": True, "user": user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        print(f"[AUTH] Signup error: {str(e)}")
        return jsonify({"error": "Signup failed."}), 500


@app.route('/api/auth/login', methods=['POST'])
@rate_limit('auth-login', max_requests=8, window_seconds=300)
def login():
    try:
        data = request.get_json(silent=True) or {}
        payload, error = validate_account_payload(data, is_signup=False)
        if error:
            return jsonify({"error": error}), 400

        user = User.query.filter_by(email=payload["email"]).first()
        if not user or not check_password_hash(user.password_hash, payload["password"]):
            return jsonify({"error": "Invalid email or password."}), 401

        session['user_id'] = user.id
        session.permanent = False

        return jsonify({"success": True, "user": user.to_dict()})
    except Exception as e:
        print(f"[AUTH] Login error: {str(e)}")
        return jsonify({"error": "Login failed."}), 500


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    user = get_current_user()
    return jsonify({"authenticated": bool(user), "user": user.to_dict() if user else None})


@app.route('/api/auth/community', methods=['GET'])
def auth_community():
    try:
        limit = int(request.args.get('limit', COMMUNITY_PAGE_SIZE))
    except (TypeError, ValueError):
        limit = COMMUNITY_PAGE_SIZE
    try:
        offset = int(request.args.get('offset', 0))
    except (TypeError, ValueError):
        offset = 0

    limit = max(1, min(limit, COMMUNITY_MAX_PAGE_SIZE))
    offset = max(0, offset)

    query = User.query.order_by(User.updated_at.desc(), User.created_at.desc())
    total = query.order_by(None).count()
    users = query.offset(offset).limit(limit).all()

    return jsonify({
        "profiles": [user.to_public_dict() for user in users],
        "total": total,
        "limit": limit,
        "offset": offset,
        "hasMore": offset + len(users) < total,
    })


@app.route('/api/site/announcement', methods=['GET'])
def get_site_announcement():
    announcement = get_or_create_announcement()
    return jsonify({"announcement": announcement.to_dict()})


@app.route('/api/community/posts', methods=['GET'])
def get_community_posts():
    posts = CommunityPost.query.filter_by(hidden=False).order_by(CommunityPost.created_at.desc()).limit(50).all()
    return jsonify({"posts": [post.to_dict() for post in posts]})


@app.route('/api/community/posts', methods=['POST'])
@require_login()
@rate_limit('community-post-create', max_requests=10, window_seconds=300)
def create_community_post():
    try:
        user = get_current_user()
        data = request.get_json(silent=True) or {}
        title = (data.get('title') or '').strip()
        body = (data.get('body') or '').strip()

        if not title:
            return jsonify({"error": "Post title is required."}), 400
        if not body:
            return jsonify({"error": "Post body is required."}), 400
        if len(title) > 180:
            return jsonify({"error": "Post title is too long."}), 400
        if len(body) > 4000:
            return jsonify({"error": "Post body is too long."}), 400

        post = CommunityPost(
            user_id=user.id,
            title=title,
            body=body,
        )
        db.session.add(post)
        db.session.commit()
        db.session.refresh(post)

        return jsonify({"success": True, "post": post.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        print(f"[COMMUNITY] Create post error: {str(e)}")
        return jsonify({"error": "Could not publish post."}), 500


@app.route('/api/community/posts/<int:post_id>/report', methods=['POST'])
@rate_limit('community-post-report', max_requests=20, window_seconds=3600)
def report_community_post(post_id):
    post = db.session.get(CommunityPost, post_id)
    if not post or post.hidden:
        return jsonify({"error": "Post not found."}), 404

    try:
        post.reported_count = int(post.reported_count or 0) + 1
        post.last_reported_at = utcnow()
        db.session.commit()
        return jsonify({"success": True, "reportedCount": post.reported_count})
    except Exception as error:
        db.session.rollback()
        print(f"[COMMUNITY] Report post error: {error}")
        return jsonify({"error": "Could not report post."}), 500


@app.route('/api/auth/practice-history', methods=['GET'])
@require_login()
def auth_practice_history():
    user = get_current_user()
    sessions = UserPracticeSession.query.filter_by(user_id=user.id).order_by(UserPracticeSession.created_at.desc()).limit(12).all()
    return jsonify({"sessions": [session_item.to_dict() for session_item in sessions]})


@app.route('/api/auth/practice-attempts', methods=['GET'])
@require_login()
def auth_practice_attempts():
    """Every attempt this student has made at one prompt, oldest first.

    Accepts either an explicit promptKey or the raw topic text, so the client
    can ask about a result it just received without having to hash it.
    """
    user = get_current_user()
    prompt_key = (request.args.get('promptKey') or '').strip()
    if not prompt_key:
        prompt_key = build_prompt_key(request.args.get('topic') or '')
    if not prompt_key:
        return jsonify({"error": "A promptKey or topic is required."}), 400

    attempts = (
        UserPracticeSession.query
        .filter_by(user_id=user.id, prompt_key=prompt_key)
        .order_by(UserPracticeSession.created_at.asc())
        .limit(50)
        .all()
    )

    return jsonify({
        "promptKey": prompt_key,
        "attempts": [attempt.to_dict() for attempt in attempts],
    })


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.pop('user_id', None)
    return jsonify({"success": True})


@app.route('/api/auth/profile', methods=['PUT'])
@require_login()
def update_profile():
    try:
        user = get_current_user()
        data = request.get_json(silent=True) or {}

        name = (data.get('name') or user.name).strip()
        username = normalize_username(data.get('username', user.username))
        role = (data.get('role') or user.role or 'Student').strip()

        if not name:
            return jsonify({"error": "Name is required."}), 400
        if not username or len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters."}), 400
        if role not in ["Student", "Teacher"]:
            role = "Student"

        username_owner = User.query.filter(User.username == username, User.id != user.id).first()
        if username_owner:
            return jsonify({"error": "That username is already taken."}), 409

        def optional_field(key, current):
            # An absent key keeps the stored value; an explicit empty string clears it.
            if key not in data:
                return current or ''
            return (data.get(key) or '').strip()

        user.name = name
        user.username = username
        user.class_name = optional_field('className', user.class_name)
        user.school = optional_field('school', user.school)
        user.cohort = optional_field('cohort', user.cohort)
        user.role = role
        user.bio = optional_field('bio', user.bio)

        avatar = (data.get('avatar') or '').strip()
        if len(avatar) > MAX_AVATAR_CHARS:
            return jsonify({
                "error": "Profile photo is too large. Choose a smaller image."
            }), 413
        user.avatar = avatar or avatar_from_name(name)

        db.session.commit()
        return jsonify({"success": True, "user": user.to_dict()})
    except Exception as e:
        db.session.rollback()
        print(f"[AUTH] Profile update error: {str(e)}")
        return jsonify({"error": "Profile update failed."}), 500


@app.route('/api/auth/password', methods=['PUT'])
@require_login()
def update_password():
    try:
        user = get_current_user()
        data = request.get_json(silent=True) or {}
        current_password = data.get('currentPassword', '')
        new_password = data.get('newPassword', '')

        if not check_password_hash(user.password_hash, current_password):
            return jsonify({"error": "Current password is incorrect."}), 401
        if len(new_password) < 8:
            return jsonify({"error": "New password must be at least 8 characters."}), 400

        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[AUTH] Password update error: {str(e)}")
        return jsonify({"error": "Password update failed."}), 500


@app.route('/api/auth/account', methods=['DELETE'])
@require_login()
def delete_account():
    try:
        user = get_current_user()
        session.pop('user_id', None)
        db.session.delete(user)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[AUTH] Delete account error: {str(e)}")
        return jsonify({"error": "Account deletion failed."}), 500

@app.route('/api/admin/login', methods=['POST'])
@rate_limit('admin-login', max_requests=5, window_seconds=300)
def admin_login():
    """Secure admin login endpoint"""
    try:
        data = request.get_json(silent=True) or {}
        password = data.get('password', '')

        if check_password_hash(ADMIN_PASSWORD_HASH, password):
            session['admin_authenticated'] = True
            session.permanent = False
            return jsonify({
                "success": True,
                "message": "Login successful"
            })
        else:
            return jsonify({"error": "Invalid password"}), 401
            
    except Exception as e:
        print(f"[AUTH] Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    """Admin logout endpoint"""
    session.pop('admin_authenticated', None)
    return jsonify({"success": True, "message": "Logged out"})

@app.route('/api/admin/check', methods=['GET'])
def check_admin():
    """Check if user is authenticated"""
    return jsonify({
        "authenticated": session.get('admin_authenticated', False)
    })


@app.route('/api/admin/announcement', methods=['PUT'])
@require_admin()
def update_announcement():
    try:
        data = request.get_json(silent=True) or {}
        enabled = bool(data.get('enabled'))
        message = (data.get('message') or '').strip()

        if enabled and not message:
            return jsonify({"error": "Announcement text is required when the banner is enabled."}), 400
        if len(message) > 500:
            return jsonify({"error": "Announcement text is too long."}), 400

        announcement = get_or_create_announcement()
        announcement.enabled = enabled
        announcement.message = message
        db.session.commit()

        return jsonify({"success": True, "announcement": announcement.to_dict()})
    except Exception as e:
        db.session.rollback()
        print(f"[ADMIN] Announcement update error: {str(e)}")
        return jsonify({"error": "Could not update announcement."}), 500

# ============= EXISTING ROUTES =============

def clean_metadata_file():
    path = 'uploads/samples/metadata.json'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            raw = f.read()
        cleaned = re.sub(r'[\x00-\x09\x0B\x0C\x0E-\x1F]', '', raw)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(cleaned)

clean_metadata_file()

def get_groq_client():
    if not groq_client:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    return groq_client


def resolve_storage_path(path):
    if not path:
        return ''
    if os.path.isabs(path):
        return path

    candidates = [
        os.path.join(app.root_path, path),
        os.path.join(os.getcwd(), path),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return candidates[0]


if analysis_worker:
    analysis_worker.start()

@app.route('/')
@app.route('/api', methods=['GET'])
def api_home():
    return jsonify({
        "message": "necs. API is running.",
        "version": "2.0",
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found."}), 404

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "rateLimiter": "redis" if rate_limiter.using_redis else "database",
        "embeddedWorker": bool(analysis_worker),
    })


@app.route('/api/admin/runtime', methods=['GET'])
@require_admin()
def admin_runtime_status():
    queued_jobs = AnalysisJob.query.filter_by(status='pending').count()
    processing_jobs = AnalysisJob.query.filter_by(status='processing').count()
    return jsonify({
        "success": True,
        "runtime": {
            "rateLimiter": "redis" if rate_limiter.using_redis else "database",
            "embeddedWorker": bool(analysis_worker),
            "redisConfigured": bool(os.getenv('REDIS_URL', '').strip()),
            "production": IS_PRODUCTION,
            "queuedJobs": queued_jobs,
            "processingJobs": processing_jobs,
        }
    })


@app.route('/api/admin/community/posts', methods=['GET'])
@require_admin()
def admin_community_posts():
    posts = CommunityPost.query.order_by(CommunityPost.created_at.desc()).limit(100).all()
    return jsonify({"posts": [post.to_dict(include_moderation=True) for post in posts]})


@app.route('/api/admin/community/posts/<int:post_id>/visibility', methods=['PUT'])
@require_admin()
def admin_update_community_post_visibility(post_id):
    post = db.session.get(CommunityPost, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    try:
        data = request.get_json(silent=True) or {}
        hidden = bool(data.get('hidden'))
        reason = (data.get('reason') or '').strip()
        post.hidden = hidden
        post.hidden_reason = reason
        post.moderated_at = utcnow()
        db.session.commit()
        return jsonify({"success": True, "post": post.to_dict(include_moderation=True)})
    except Exception as error:
        db.session.rollback()
        print(f"[ADMIN] Community visibility update error: {error}")
        return jsonify({"error": "Could not update post visibility."}), 500


@app.route('/api/admin/community/posts/<int:post_id>', methods=['DELETE'])
@require_admin()
def admin_delete_community_post(post_id):
    post = db.session.get(CommunityPost, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    try:
        db.session.delete(post)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as error:
        db.session.rollback()
        print(f"[ADMIN] Community delete error: {error}")
        return jsonify({"error": "Could not delete post."}), 500

@app.route('/api/analyze', methods=['POST'])
@rate_limit('analysis-create', max_requests=10, window_seconds=3600)
def analyze_speech():
    try:
        cleanup_old_files(app.config['UPLOAD_FOLDER'])

        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided."}), 400

        if 'topic' not in request.form:
            return jsonify({"error": "No topic provided."}), 400

        audio_file = request.files['audio']
        topic = (request.form.get('topic') or '').strip()
        source = (request.form.get('source') or 'analyze').strip().lower()

        if audio_file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        if not allowed_file(audio_file.filename):
            return jsonify({"error": "Invalid file format."}), 400
        if not topic:
            return jsonify({"error": "Topic is required."}), 400

        filepath = build_job_storage_path(app.config['UPLOAD_FOLDER'], audio_file.filename)
        audio_file.save(filepath)

        current_user = get_current_user()
        job = AnalysisJob(
            user_id=current_user.id if current_user else None,
            topic=topic,
            source=source if source in {'analyze', 'simulation'} else 'analyze',
            original_filename=secure_filename(audio_file.filename),
            stored_audio_path=filepath,
            status='pending',
            progress_message='Queued for processing.',
        )
        db.session.add(job)
        db.session.commit()

        return jsonify({
            "success": True,
            "job": job.to_dict(),
        }), 202

    except Exception as e:
        db.session.rollback()
        print(f"[ANALYZE] Queueing error: {str(e)}")
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "Could not queue analysis job."}), 500


@app.route('/api/analyze/jobs/<job_id>', methods=['GET'])
def get_analysis_job(job_id):
    job = db.session.get(AnalysisJob, job_id)
    if not job:
        return jsonify({"error": "Analysis job not found."}), 404

    current_user = get_current_user()
    if job.user_id and (not current_user or job.user_id != current_user.id) and not session.get('admin_authenticated'):
        return jsonify({"error": "Unauthorized."}), 403

    return jsonify({"job": job.to_dict()})


@app.route('/api/analyze/jobs/<job_id>/document', methods=['GET'])
def download_analysis_job_document(job_id):
    job = db.session.get(AnalysisJob, job_id)
    external_url = (job.result_payload or {}).get('document_external_url') if job else ''
    local_path = resolve_storage_path(job.document_path) if job else ''
    if not job or job.status != 'completed' or (not external_url and (not local_path or not os.path.exists(local_path))):
        return jsonify({"error": "Document is not available for this job."}), 404

    current_user = get_current_user()
    if job.user_id and (not current_user or job.user_id != current_user.id) and not session.get('admin_authenticated'):
        return jsonify({"error": "Unauthorized."}), 403

    if external_url:
        return redirect(external_url)

    return send_file(
        local_path,
        as_attachment=True,
        download_name=(job.result_payload or {}).get('document_filename') or f"necs_feedback_{job.id}.docx",
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )

# ============= SECURED ADMIN ROUTES =============

@app.route('/api/samples', methods=['GET'])
def get_samples():
    samples = Sample.query.order_by(Sample.created_at.desc()).all()
    return jsonify({"samples": [s.to_dict() for s in samples]})


def parse_score(raw, default=None):
    """A sample score from form input, or None when it is not a valid score."""
    if raw is None or str(raw).strip() == '':
        return default
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value != value or value < 0 or value > 2:
        return None
    return value

@app.route('/api/samples/upload', methods=['POST'])
@require_admin()
@rate_limit('sample-upload', max_requests=20, window_seconds=3600)
def upload_sample():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file"}), 400
        
        audio_file = request.files['audio']
        topic = request.form.get('topic')
        question = request.form.get('question', '')
        speaker = request.form.get('speaker')
        score = parse_score(request.form.get('score'), default=2.0)
        transcript = request.form.get('transcript', '')
        feedback = request.form.get('feedback', '')

        if not all([topic, speaker, transcript, feedback]):
            return jsonify({"error": "Missing required fields"}), 400
        if score is None:
            return jsonify({"error": "Score must be a number between 0 and 2."}), 400

        if not audio_file.filename or not allowed_file(audio_file.filename):
            return jsonify({"error": "Invalid file format."}), 400

        filename = secure_filename(audio_file.filename)
        if not filename:
            return jsonify({"error": "Invalid file name."}), 400

        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        audio_file.save(temp_path)

        try:
            duration = int(get_audio_duration(temp_path))
        except Exception as error:
            print(f"[SAMPLES] Could not read audio duration: {error}")
            duration = 0
        
        upload_result = cloudinary.uploader.upload(
            temp_path,
            resource_type="video",
            folder="necs_samples",
            public_id=f"sample_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            overwrite=True
        )
        
        os.remove(temp_path)
        
        new_sample = Sample(
            filename=filename,
            topic=topic,
            question=question,
            speaker=speaker,
            score=score,
            duration=duration,
            transcript=transcript,
            feedback=feedback,
            audio_url=upload_result['secure_url']
        )
        
        db.session.add(new_sample)
        db.session.commit()
        
        return jsonify({"success": True, "id": new_sample.id})
        
    except Exception as e:
        db.session.rollback()
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"[SAMPLES] Upload error: {e}")
        return jsonify({"error": "Sample upload failed."}), 500

@app.route('/api/samples/<int:sample_id>', methods=['PUT'])
@require_admin()
def update_sample(sample_id):
    sample = db.session.get(Sample, sample_id)
    if not sample:
        return jsonify({"error": "Not found"}), 404

    if 'score' in request.form:
        score = parse_score(request.form['score'])
        if score is None:
            return jsonify({"error": "Score must be a number between 0 and 2."}), 400
        sample.score = score
    for field in ('topic', 'question', 'speaker', 'transcript', 'feedback'):
        if field in request.form:
            setattr(sample, field, request.form[field])

    try:
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[SAMPLES] Update error: {e}")
        return jsonify({"error": "Sample update failed."}), 500

@app.route('/api/samples/<int:sample_id>', methods=['DELETE'])
@require_admin()
def delete_sample(sample_id):
    sample = db.session.get(Sample, sample_id)
    if not sample:
        return jsonify({"error": "Not found"}), 404

    try:
        db.session.delete(sample)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[SAMPLES] Delete error: {e}")
        return jsonify({"error": "Sample deletion failed."}), 500

@app.route('/api/questions', methods=['GET'])
def get_questions():
    questions = Question.query.all()
    return jsonify({"questions": [q.to_dict() for q in questions]})


def read_question_payload(partial=False):
    """Validated question fields from the JSON body, or (None, error).

    A missing body or key used to raise inside the handler and come back as a
    500 carrying the raw exception text (e.g. "'topic'").
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object."

    fields = {}
    for key in ('topic', 'question', 'category'):
        if key not in data:
            continue
        value = (data.get(key) or '').strip() if isinstance(data.get(key), str) else ''
        if key in ('topic', 'question') and not value:
            return None, f"{key.capitalize()} cannot be empty."
        fields[key] = value or 'General'

    if not partial:
        for key in ('topic', 'question'):
            if key not in fields:
                return None, f"{key.capitalize()} is required."
    if len(fields.get('topic', '')) > 500:
        return None, "Topic is too long."
    if len(fields.get('category', '')) > 200:
        return None, "Category is too long."
    return fields, None


@app.route('/api/questions', methods=['POST'])
@require_admin()
def add_question():
    fields, error = read_question_payload()
    if error:
        return jsonify({"error": error}), 400
    try:
        new_question = Question(**{'category': 'General', **fields})
        db.session.add(new_question)
        db.session.commit()
        return jsonify({"success": True, "id": new_question.id})
    except Exception as e:
        db.session.rollback()
        print(f"[QUESTIONS] Create error: {e}")
        return jsonify({"error": "Could not add question."}), 500

@app.route('/api/questions/<int:question_id>', methods=['PUT'])
@require_admin()
def update_question(question_id):
    question = db.session.get(Question, question_id)
    if not question:
        return jsonify({"error": "Not found"}), 404
    fields, error = read_question_payload(partial=True)
    if error:
        return jsonify({"error": error}), 400
    try:
        for key, value in fields.items():
            setattr(question, key, value)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[QUESTIONS] Update error: {e}")
        return jsonify({"error": "Could not update question."}), 500

@app.route('/api/questions/<int:question_id>', methods=['DELETE'])
@require_admin()
def delete_question(question_id):
    question = db.session.get(Question, question_id)
    if not question:
        return jsonify({"error": "Not found"}), 404
    try:
        db.session.delete(question)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        print(f"[QUESTIONS] Delete error: {e}")
        return jsonify({"error": "Could not delete question."}), 500

@app.route('/api/questions/random', methods=['GET'])
def get_random_question():
    questions = Question.query.all()
    if not questions:
        return jsonify({"error": "No questions"}), 404
    return jsonify({"question": random.choice(questions).to_dict()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)


