"""
backend/routers/flights.py

REST endpoints for aircraft data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.events import Aircraft

from backend.ingestion.flights import get_cached_aircraft

router = APIRouter(prefix="/api/flights", tags=["flights"])
root_router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/")
@root_router.get("/")
def list_aircraft(db: Session = Depends(get_db)):
    """Return all currently tracked aircraft."""
    return get_cached_aircraft(limit=500)
