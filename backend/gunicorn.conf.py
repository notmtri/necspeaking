"""Gunicorn settings, picked up automatically by `gunicorn app:app`.

Gunicorn loads ./gunicorn.conf.py from its working directory, which on Render
is backend/ (the service's root directory), so this needs no dashboard change.

The previous setup was gunicorn's default: one synchronous worker, one request
at a time. Measured in production, four requests fired together finished at
1.5 / 2.5 / 3.6 / 4.4 s -- each waiting for the one before it -- so every page
load, which makes five API calls at once, took 5-6 s. A single slow upload from
a phone blocked every other student for its whole duration.

Requests here spend nearly all their time waiting (on the database across
regions, on uploads), so threads fix this without more memory.
"""
import os

# One process only: the embedded analysis worker is a thread inside the web
# process (ENABLE_EMBEDDED_WORKER), so each extra process would start another.
workers = 1

# Setting threads switches gunicorn to the gthread worker. app.py sizes the
# database pool from the same GUNICORN_THREADS value (threads + 2), so every
# thread keeps a warm connection; mind the Supabase pooler's client limit if
# you raise it.
threads = int(os.getenv('GUNICORN_THREADS', '8'))

# Worker liveness timeout. The analysis runs on its own thread, not a request
# thread, so requests themselves stay short; this only needs to cover slow
# uploads on mobile connections.
timeout = int(os.getenv('GUNICORN_TIMEOUT', '120'))

# No bind setting: gunicorn binds to $PORT on its own, which is how Render
# routes traffic to it.
