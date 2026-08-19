"""
backend/routers/flights.py

REST endpoints for aircraft data.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.events import Aircraft
from backend.ingestion.flights import get_cached_aircraft

router = APIRouter(prefix="/api/flights", tags=["flights"])
root_router = APIRouter(prefix="/flights", tags=["flights"])

# Pre-computed snapshot bundled at build time — used as instant response on Vercel
_SNAPSHOT_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "data" / "initial_telemetry.json"
_snapshot_aircraft: list[dict] | None = None


def _load_snapshot_aircraft() -> list[dict]:
    global _snapshot_aircraft
    if _snapshot_aircraft is None:
        try:
            data = json.loads(_SNAPSHOT_PATH.read_text(encoding="utf-8"))
            _snapshot_aircraft = data.get("aircraft", [])
        except Exception:
            _snapshot_aircraft = []
    return _snapshot_aircraft


@router.get("/")
@root_router.get("/")
def list_aircraft(db: Session = Depends(get_db)):
    """Return all currently tracked aircraft."""
    # On Vercel, use the pre-computed snapshot for instant response
    if os.environ.get("VERCEL"):
        snapshot = _load_snapshot_aircraft()
        if snapshot:
            return snapshot
    return get_cached_aircraft(limit=500)
