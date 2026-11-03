
from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Store the database inside the backend folder.
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "retailai.db"
load_dotenv(BASE_DIR / ".env")

def _database_url() -> str:
    """Prefer a hosted Postgres URL, while keeping SQLite as a local fallback."""
    configured = os.environ.get("DATABASE_URL") or os.environ.get("NEON_DATABASE_URL")
    if not configured:
        return f"sqlite:///{DATABASE_PATH.as_posix()}"
    if configured.startswith("postgres://"):
        configured = "postgresql://" + configured[len("postgres://"):]
    if configured.startswith("postgresql://"):
        configured = "postgresql+psycopg://" + configured[len("postgresql://"):]
    return configured


DATABASE_URL = _database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite:")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300 if not IS_SQLITE else -1,
    **({"connect_args": {"check_same_thread": False}} if IS_SQLITE else {}),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
