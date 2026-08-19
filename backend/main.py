"""
backend/main.py

FastAPI application entry point.
- CORS configured for dev (localhost:5173) and production domain (via CORS_ORIGINS env var)
- All routers mounted under /api or /ws
- APScheduler started in lifespan (startup) and stopped on shutdown
- Broadcast loop started as a background asyncio task
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import engine
from backend.models.events import Base  # noqa: F401 — ensures tables are created
from backend.routers import satellites, flights, weather
from backend.routers.websocket import router as ws_router, _broadcast_loop
from backend.scheduler import scheduler, setup_jobs
from backend.ingestion.satellites import fetch_and_store_tles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    logger.info("Running initial TLE fetch...")
    fetch_and_store_tles()  # Populate satellite data immediately on startup

    logger.info("Starting scheduler...")
    setup_jobs()
    scheduler.start()

    logger.info("Starting WebSocket broadcast loop...")
    broadcast_task = asyncio.create_task(_broadcast_loop())

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down...")
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="PARALLAX",
    description="Real-time satellite, aircraft, and weather visualization backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(satellites.router)
app.include_router(flights.router)
app.include_router(weather.router)
app.include_router(ws_router)


@app.get("/health", tags=["meta"])
def health_check():
    return {"status": "ok", "service": "parallax-backend"}
