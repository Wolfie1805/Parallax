"""
backend/scheduler.py

APScheduler configuration — satellite TLE fetch every 4h,
aircraft state fetch every 12 seconds.

The scheduler is started/stopped by the FastAPI lifespan in main.py.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.ingestion.satellites import fetch_and_store_tles
from backend.ingestion.flights import fetch_and_store_states

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


import asyncio

async def _run_satellites_job():
    await asyncio.to_thread(fetch_and_store_tles)

async def _run_flights_job():
    await asyncio.to_thread(fetch_and_store_states)

def setup_jobs() -> None:
    """Register all scheduled jobs. Call once during app startup."""
    scheduler.add_job(
        _run_satellites_job,
        trigger="interval",
        hours=4,
        id="satellite_tle_fetch",
        replace_existing=True,
        misfire_grace_time=60,
    )

    scheduler.add_job(
        _run_flights_job,
        trigger="interval",
        seconds=15,
        id="aircraft_state_fetch",
        replace_existing=True,
        misfire_grace_time=10,
    )

    logger.info("Scheduler jobs registered.")
