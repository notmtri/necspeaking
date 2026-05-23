import os

os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

from app import app, get_groq_client  # noqa: E402
from job_worker import AnalysisWorker  # noqa: E402


if __name__ == '__main__':
    worker = AnalysisWorker(app, lambda: get_groq_client(), app.config['UPLOAD_FOLDER'])
    worker.run_loop()
