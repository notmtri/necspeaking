import os
import sys
from pathlib import Path

os.environ.setdefault('ENABLE_EMBEDDED_WORKER', 'false')

BACKEND_DIR = Path(__file__).resolve().parent / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app, db

try:
    from flask_migrate import Migrate
except ImportError as error:  # pragma: no cover
    raise RuntimeError("flask-migrate is not installed. Run `pip install -r backend/requirements.txt`.") from error


migrate = Migrate(app, db)
