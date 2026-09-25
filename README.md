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

- State-changing API routes require a CSRF token header whenever the session
  belongs to a logged-in user or admin. The React app sends it automatically.
  Anonymous requests are exempt: they carry no authority to forge, and
  browsers that block third-party cookies (Safari/iOS, Brave, incognito Chrome)
  never return the session cookie that holds the token, so requiring it
  rejected every guest upload from those browsers.
- **Known limitation: login does not persist in browsers that block
  third-party cookies**, because the API (`onrender.com`) is a different site
  from the app (`necspeaking.com`). The fix is infrastructure, not code: serve
  the API as `api.necspeaking.com` (Render custom domain + a CNAME), point
  `VITE_API_URL` at it, and set `SESSION_COOKIE_SAMESITE=Lax`.
- Rate limits key on the client address read `TRUSTED_PROXY_HOPS` entries from
  the right of `X-Forwarded-For` (3 on Render: Cloudflare edge, Cloudflare to
  Render, Render internal). The leftmost entry is client-supplied and must
  never be trusted.
- Postgres tables have row level security enabled with no policies
  (`c3d4e5f6a7b8`). That shuts Supabase's public REST API out of every table
  while the backend, which connects as the table owner, is unaffected. Never
  add `FORCE ROW LEVEL SECURITY`.
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
- `gemini-3.5-flash` is confirmed working with the corrected request shape
  (`responseMimeType` + `responseSchema`). It does return HTTP 503 under load
  fairly often, so transient failures (429/5xx) are retried with exponential
  backoff; tune with `GEMINI_MAX_ATTEMPTS` and `GEMINI_RETRY_BACKOFF_SECONDS`.
  A 400 is never retried, since that means the request itself is malformed.
- When the primary model stays overloaded, grading moves through
  `GEMINI_FALLBACK_MODELS` (default `gemini-3.6-flash,gemini-3.5-flash-lite`)
  before dropping to transcript-only Groq. A timeout skips straight to the next
  model. `result.grader_model` records which model actually graded the job.
  On 2026-09-26 3.5/3.7/3.8-flash were all returning 503 while 3.6-flash and
  3.5-flash-lite answered; 3.6-flash scored a known 1.8 sample at exactly 1.80.
- Grader replies are validated before use: scores are clamped to the rubric
  (0.9 / 0.6 / 0.5) and the total is recomputed from the parts.
- A failed job shows the student an actionable message; the raw error is only
  in the logs (`[JOBS] Failed job ...`).
- Completed and failed analysis jobs are cleaned up automatically after `ANALYSIS_JOB_RETENTION_HOURS` hours.
- Community posts can be reported publicly and moderated from the admin panel.
- Delivery metrics are derived from word-level transcription timings
  (`backend/speech_metrics.py`): filler rate, pace per 15s window, long pauses
  and articulation rate. They are shown to the student and handed to the grader
  as evidence to cite. If the provider will not return timings the analysis
  still succeeds, with `metrics.available` false.
- `GET /api/auth/practice-attempts?topic=...` returns a logged-in student's
  attempts at one prompt, oldest first, for the retry/compare loop.
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

## Deploying this upgrade

Two changes in this branch break a running deployment if you only merge the code.

**1. Vercel: rename the frontend environment variable.**

Vite only exposes variables prefixed `VITE_`, so `REACT_APP_API_URL` is now
ignored. If you deploy without renaming it, the build silently falls back to
`http://127.0.0.1:5000` and every API call from production fails.

| Before | After |
|---|---|
| `REACT_APP_API_URL=https://your-api.onrender.com` | `VITE_API_URL=https://your-api.onrender.com` |

Set it in Vercel → Project → Settings → Environment Variables, then redeploy.
`vercel.json` already points at `frontend/build`, which is unchanged.

**2. Supabase: run the new migration.**

`b2c3d4e5f6a7` adds `prompt_key` and `metrics` to `user_practice_sessions` and
backfills `prompt_key` for existing rows. Take a backup first, then from a
machine with `DATABASE_URL` pointing at Supabase:

```powershell
.\venv\Scripts\python -m flask --app manage.py db upgrade
```

The backfill rewrites one row at a time and is safe to re-run: rows that
already have a key are skipped. Deploy the backend only after it completes,
since the new code selects those columns.

`c3d4e5f6a7b8` then enables row level security. Both revisions are additive,
so the currently deployed backend keeps working against the migrated schema.

**3. Render: deploy manually, in this order.**

The `necspeaking-backend` service has auto-deploy **off**, so merging does not
deploy. After the Supabase migration finishes, trigger a deploy from the Render
dashboard (or the Render MCP). Render picks up `backend/requirements.txt`
automatically; note it now pins `flask-cors` 6.x for the CVE fixes.

Two Render settings worth fixing while you are there:

- **Health check path is empty.** Set it to `/api/health`. Render then waits for
  the new instance to answer before routing traffic to it, instead of cutting
  over blind.
- The service runs a single free instance with `ENABLE_EMBEDDED_WORKER` needed
  for analysis to run at all. Free instances spin down when idle; when that
  happens mid-analysis the job used to hang forever. The worker now marks such
  jobs failed after `ANALYSIS_JOB_STALE_MINUTES` so the student is told to
  resubmit.

**Deploy order:** Vercel env var → Supabase migration → Render deploy → Vercel
redeploy. The frontend and backend are independent, but the backend must not
run new code against the old schema.

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
