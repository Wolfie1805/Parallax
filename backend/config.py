import os
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_db_url() -> str:
    """
    Use the environment variable DATABASE_URL if set.
    Fallback:
      - On Vercel (VERCEL=1), /var/task is read-only so use /tmp which IS writable.
      - Locally, use the repo-relative parallax.db (same as before).
    Note: /tmp data on Vercel is ephemeral per-instance. For persistence across
    cold starts, set DATABASE_URL to a PostgreSQL connection string in Vercel env vars.
    """
    if os.environ.get("VERCEL"):
        return "sqlite:////tmp/parallax.db"
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
