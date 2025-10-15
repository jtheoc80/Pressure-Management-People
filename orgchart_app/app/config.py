import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "orgchart.db"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{DB_PATH}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get("SQLALCHEMY_ECHO", "0") == "1"

    # Optional enrichment provider API keys
    CLEARBIT_API_KEY = os.environ.get("CLEARBIT_API_KEY")
    PDL_API_KEY = os.environ.get("PDL_API_KEY")
    CRUNCHBASE_API_KEY = os.environ.get("CRUNCHBASE_API_KEY")
