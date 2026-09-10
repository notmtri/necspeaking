# SpeakUp / necs.

React + Flask app for NEC speaking practice, speech analysis, sample speeches, simulations, profiles, and community posts.

## Project Layout

- `frontend/` - React app built with Vite
- `backend/` - Flask API, SQLAlchemy models, Groq transcription, Gemini/Groq grading, Cloudinary sample uploads
- `.env.example` - required local and production environment variables

## Local Setup

1. Install frontend dependencies:

```powershell
cd frontend
npm install
```

2. Install backend dependencies:

```powershell
python -m venv venv
.\venv\Scripts\pip install -r backend\requirements.txt
```

On Python 3.13+, `pydub` needs `audioop-lts` because PEP 594 removed the stdlib
`audioop` module; it is pinned in `requirements.txt` behind a version marker.
`pydub` also shells out to **ffmpeg** for audio conversion, so install ffmpeg and
put it on `PATH` before running an analysis locally.

3. Copy `.env.example` to `backend/.env` and set the values you actually use.
   If your frontend runs on `http://localhost:3001` or `http://127.0.0.1:3001`, keep those origins in `ALLOWED_ORIGINS`.

4. Create `frontend/.env` when you want the React dev server to point at a non-default backend:

```powershell
VITE_API_URL=http://127.0.0.1:5000
```

5. Start Redis if you want production-style rate limiting locally.
   If you skip this, the backend falls back to a database-backed limiter.

6. Run database migrations after dependencies are installed:

```powershell
.\venv\Scripts\python -m flask --app manage.py db upgrade
```

The migration history builds a database from nothing, so this works on a brand
new database as well as on one previously created with `db.create_all()` and
never stamped. Do not run `db init` — the `migrations/` directory is already
committed.

While a `flask db ...` command runs, the app deliberately skips its own startup
table creation so that Alembic owns the schema.

7. Run the backend API:

```powershell
.\venv\Scripts\python backend\app.py
```

8. Run the analysis worker in a second terminal if you disable the embedded worker or want a production-like setup:

```powershell
.\venv\Scripts\python backend\worker.py
```

If `ENABLE_EMBEDDED_WORKER` is left unset, the backend defaults to:
- local development: embedded worker enabled
- production: embedded worker disabled

9. Run the frontend:

```powershell
cd frontend
npm start
```

From the repo root, `npm run start` forwards to the frontend dev server.

## Backend Notes

- State-changing API routes now require a CSRF token header. The React app sends it automatically from the `csrf_token` cookie.
- Analysis reports are uploaded to Cloudinary when Cloudinary credentials are configured. Without Cloudinary, reports fall back to local disk.
- The backend is API-only. The React app is built and served separately (see `vercel.json`).
- Speech analysis transcribes with Groq `GROQ_TRANSCRIPTION_MODEL` and grades with Gemini `GEMINI_GRADING_MODEL`, falling back to Groq `GROQ_GRADING_FALLBACK_MODEL` when Gemini is unavailable.
- **Only the Gemini path sends the audio.** The Groq fallback sees the transcript
  alone, so Delivery is scored without ever hearing the recording. Each finished
  job records which grader ran under `result.grader` (`gemini` or
  `groq-fallback`) and whether audio was reviewed, and a fallback is logged with
  the Gemini error. If you see `groq-fallback` on every job, the Gemini call is
  failing -- check `GEMINI_API_KEY` and confirm `GEMINI_GRADING_MODEL` names a
  model your key can actually reach.
- Completed and failed analysis jobs are cleaned up automatically after `ANALYSIS_JOB_RETENTION_HOURS` hours.
- Community posts can be reported publicly and moderated from the admin panel.
- Runtime visibility is available at:
  - `GET /api/health`
  - `GET /api/admin/runtime` (admin only)

## Verification

Frontend (from `frontend/`):

```powershell
npm test          # vitest run
npm run build
npm run check:mobile-overflow
```

`check:mobile-overflow` loads every route at 390px wide and fails on any
horizontal overflow. It needs a build present, so run `npm run build` first (or
use `npm run validate:mobile`, which does both).

Backend:

```powershell
.\venv\Scripts\python -m unittest discover -s backend\tests
.\venv\Scripts\python -m py_compile backend\app.py backend\database.py backend\worker.py backend\analysis_service.py backend\job_worker.py backend\rate_limiter.py backend\user_progress.py
```

Migrations, against a scratch database rather than your real one:

```powershell
$env:DATABASE_URL="sqlite:///scratch-verify.db"
.\venv\Scripts\python -m flask --app manage.py db upgrade
```

The file lands in `backend/instance/`, because Flask resolves relative SQLite
paths against the instance folder. Delete it when you are done.

## Production Notes

- Set `PRODUCTION=true`.
- Set a stable, long `SECRET_KEY`; do not let it change between deploys.
- Set `ADMIN_PASSWORD_HASH`; the backend refuses to start in production without it.
- Set `ALLOWED_ORIGINS` to the deployed frontend origin.
- Use a managed PostgreSQL `DATABASE_URL` for persistent data.
- Set `REDIS_URL` so rate limiting is shared across web instances.
- Run the analysis worker separately with `ENABLE_EMBEDDED_WORKER=false` on the web process.
- If you deploy only one backend web service and no separate worker, set `ENABLE_EMBEDDED_WORKER=true`; otherwise analysis jobs will stay queued.
- Move off `CREATE_TABLES_ON_START` and use `flask db upgrade` for schema changes.
- Check `/api/health` or `/api/admin/runtime` to confirm whether Redis-backed limiting and embedded workers are active.
- After pulling backend changes that affect schema, run `flask db upgrade`.
