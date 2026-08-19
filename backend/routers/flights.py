"""
backend/routers/flights.py

REST endpoints for aircraft data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.events import Aircraft

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.get("/")
def list_aircraft(db: Session = Depends(get_db)):
    """Return all currently tracked aircraft."""
    aircraft = db.query(Aircraft).filter(
        Aircraft.lat.isnot(None), Aircraft.lng.isnot(None)
    ).all()
    return [
        {
            "icao24": a.icao24,
            "callsign": a.callsign,
            "lat": a.lat,
            "lng": a.lng,
            "altitude": a.altitude,
            "velocity": a.velocity,
            "heading": a.heading,
            "origin_country": a.origin_country,
        }
        for a in aircraft
    ]
