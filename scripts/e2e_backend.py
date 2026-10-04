"""Start an isolated migrated database for Playwright. Does not touch normal data."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

backend = Path(__file__).resolve().parents[1] / "backend"
database = backend / "data" / f"e2e-{uuid4()}.db"
os.environ["PCC_DATABASE_URL"] = f"sqlite:///{database.as_posix()}"
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend, check=True)
try:
    subprocess.run([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8010"], cwd=backend, check=True)
finally:
    database.unlink(missing_ok=True)
