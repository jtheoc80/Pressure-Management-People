import os
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "orgchart.db"

# Load environment variables from common .env locations for local/dev usage
# Production platforms (e.g., Render) inject env vars directly and do not need this.
_dotenv_candidates = [
    BASE_DIR.parent / ".env.local",
    BASE_DIR.parent / ".env",
    BASE_DIR / ".env",
]
for _env_path in _dotenv_candidates:
    try:
        if _env_path.exists():
            load_dotenv(dotenv_path=_env_path, override=False)
    except Exception:
        # Best-effort; ignore if python-dotenv is unavailable or file unreadable
        pass


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{DB_PATH}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get("SQLALCHEMY_ECHO", "0") == "1"

    # Optional enrichment provider API keys
    CLEARBIT_API_KEY = os.environ.get("CLEARBIT_API_KEY")

    # Support multiple common env var names for People Data Labs API key
    # This helps when the secret name differs between local, GitHub, or Render.
    _PDL_ENV_CANDIDATES = [
        "PDL_API_KEY",
        "PEOPLE_DATA_LABS_API_KEY",
        "PEOPLE_DATA_LAB_API_KEY",
        "PEOPLEDATALABS_API_KEY",
        "PEOPLE_DATALABS_API_KEY",
        "PDL_KEY",
        "PDLAPIKEY",
    ]

    _pdl_key_value = None
    _pdl_key_source = None
    for _name in _PDL_ENV_CANDIDATES:
        _val = os.environ.get(_name)
        if _val:
            _pdl_key_value = _val
            _pdl_key_source = _name
            break

    PDL_API_KEY = _pdl_key_value
    # Non-secret indicator for debugging which env var name was used
    PDL_API_KEY_SOURCE = _pdl_key_source

    CRUNCHBASE_API_KEY = os.environ.get("CRUNCHBASE_API_KEY")
