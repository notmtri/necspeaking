# SpeakUp / necs.

React + Flask app for NEC speaking practice, speech analysis, sample speeches, simulations, profiles, and community posts.

## Project Layout

- `frontend/` - React app built with `react-scripts`
- `backend/` - Flask API, SQLAlchemy models, Groq transcription/grading, Cloudinary sample uploads
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

3. Copy `.env.example` to `backend/.env` and set the values you actually use.
   If your frontend runs on `http://localhost:3001` or `http://127.0.0.1:3001`, keep those origins in `ALLOWED_ORIGINS`.

4. Create `frontend/.env` when you want the React dev server to point at a non-default backend:

```powershell
REACT_APP_API_URL=http://127.0.0.1:5000
```

5. Start Redis if you want production-style rate limiting locally.
   If you skip this, the backend falls back to a database-backed limiter.

6. Run database migrations after dependencies are installed:

```powershell
.\venv\Scripts\python -m flask --app manage.py db init
.\venv\Scripts\python -m flask --app manage.py db migrate -m "initial schema"
.\venv\Scripts\python -m flask --app manage.py db upgrade
```

If the repo already has a populated local SQLite file and you are not changing schema yet, you can continue with `CREATE_TABLES_ON_START=true` for local development until the first migration history is created.

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
- Completed and failed analysis jobs are cleaned up automatically after `ANALYSIS_JOB_RETENTION_HOURS` hours.
- Community posts can be reported publicly and moderated from the admin panel.
- Runtime visibility is available at:
  - `GET /api/health`
  - `GET /api/admin/runtime` (admin only)

## Verification

Frontend:

```powershell
npm test -- --watchAll=false
npm run build
```

Backend:

```powershell
python -m unittest discover -s backend\tests
python -m py_compile backend\app.py backend\database.py
python -m py_compile backend\worker.py backend\analysis_service.py backend\job_worker.py backend\rate_limiter.py
```

## Production Notes

- Set `PRODUCTION=true`.
- Set a stable, long `SECRET_KEY`; do not let it change between deploys.
- Set `ADMIN_PASSWORD_HASH`; the backend refuses to start in production without it.
- Set `ALLOWED_ORIGINS` to the deployed frontend origin.
- Use a managed PostgreSQL `DATABASE_URL` for persistent data.
- Set `REDIS_URL` so rate limiting is shared across web instances.
- Run the analysis worker separately with `ENABLE_EMBEDDED_WORKER=false` on the web process.
- Move off `CREATE_TABLES_ON_START` and use `flask db upgrade` for schema changes.
- Check `/api/health` or `/api/admin/runtime` to confirm whether Redis-backed limiting and embedded workers are active.
- After pulling backend changes that affect schema, run `flask db upgrade`.
