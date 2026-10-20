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
import sys

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

# The app must not start its analysis-worker thread when it is imported:
# with preload (gunicorn --preload, which a host can set through
# GUNICORN_CMD_ARGS) the import happens in the master process, and the
# thread would be left behind in the master when the worker is forked.
# post_fork below starts it in the process that actually serves requests.
os.environ.setdefault('NECS_START_WORKER_AFTER_FORK', '1')


def post_fork(server, worker):
    """Runs in the new worker process right after the fork."""
    preloaded = 'app' in sys.modules
    import app as application  # already loaded if preloaded; loads it otherwise

    if preloaded:
        # Pooled database connections opened in the master were copied by the
        # fork; two processes sharing one Postgres socket corrupts both.
        # Drop the child's references without closing the master's sockets.
        with application.app.app_context():
            application.db.engine.dispose(close=False)

    application.start_embedded_worker()
    server.log.info(
        "post_fork: worker pid=%s app_preloaded=%s embedded_worker_running=%s",
        worker.pid, preloaded, application.embedded_worker_running(),
    )
