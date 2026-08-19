"""
backend/routers/satellites.py

REST endpoints for satellite data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.events import Satellite

router = APIRouter(prefix="/api/satellites", tags=["satellites"])


@router.get("/")
def list_satellites(db: Session = Depends(get_db)):
    """Return all stored satellite TLE records."""
    sats = db.query(Satellite).all()
    return [
        {
            "norad_id": s.norad_id,
            "name": s.name,
            "fetched_at": s.fetched_at.isoformat(),
        }
        for s in sats
    ]


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
