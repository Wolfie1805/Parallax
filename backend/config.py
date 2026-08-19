import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_db_url() -> str:
    """
    Use the environment variable DATABASE_URL if set.
    Fallback:
      - On Vercel (VERCEL=1), copy pre-populated parallax.db to /tmp/parallax.db
        so all 16,000+ real satellites and aircraft are instantly available.
      - Locally, use repo-relative parallax.db.
    """
    if os.environ.get("VERCEL"):
        tmp_db = Path("/tmp/parallax.db")
        if not tmp_db.exists():
            root_db = Path(__file__).resolve().parent.parent / "parallax.db"
            if root_db.exists():
                try:
                    shutil.copyfile(root_db, tmp_db)
                except Exception:
                    pass
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./parallax.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = _default_db_url()
    OPENSKY_CLIENT_ID: str = ""
    OPENSKY_CLIENT_SECRET: str = ""

    # Frontend origin(s) allowed for CORS — comma-separated
    # On Vercel set this to your Vercel frontend URL, e.g.:
    #   https://parallax.vercel.app,https://parallax-git-main.vercel.app
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
