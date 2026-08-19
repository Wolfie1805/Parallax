"""
backend/routers/satellites.py

REST endpoints for satellite data.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.events import Satellite
from backend.ingestion.satellites import propagate_all, fetch_and_store_tles

router = APIRouter(prefix="/api/satellites", tags=["satellites"])
root_router = APIRouter(prefix="/satellites", tags=["satellites"])

# Pre-computed snapshot bundled at build time — used as instant response
_SNAPSHOT_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "data" / "initial_telemetry.json"
_snapshot_satellites: list[dict] | None = None


def _load_snapshot_satellites() -> list[dict]:
    global _snapshot_satellites
    if _snapshot_satellites is None:
        try:
            data = json.loads(_SNAPSHOT_PATH.read_text(encoding="utf-8"))
            _snapshot_satellites = data.get("satellites", [])
        except Exception:
            _snapshot_satellites = []
    return _snapshot_satellites


@router.get("/")
@root_router.get("/")
def list_satellites(db: Session = Depends(get_db)):
    """Return all stored satellite records with computed lat/lng/altitude."""
    # On Vercel, propagating 2000+ TLEs with skyfield can exceed the 10s timeout.
    # Use the pre-computed snapshot bundled at build time for instant response.
    if os.environ.get("VERCEL"):
        snapshot = _load_snapshot_satellites()
        if snapshot:
            return snapshot
    return propagate_all(db)


@router.get("/{norad_id}")
def get_satellite(norad_id: str, db: Session = Depends(get_db)):
    """Return a single satellite by NORAD catalog ID."""
    sat = db.query(Satellite).filter(Satellite.norad_id == norad_id).first()
    if not sat:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Satellite not found")
    return {
        "norad_id": sat.norad_id,
        "name": sat.name,
        "tle_line1": sat.tle_line1,
        "tle_line2": sat.tle_line2,
        "fetched_at": sat.fetched_at.isoformat(),
    }
