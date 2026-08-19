"""
backend/routers/weather.py

On-demand weather endpoint — only called when a user clicks a city dot.
"""

from fastapi import APIRouter, HTTPException

from backend.ingestion.weather import fetch_weather, get_all_cities

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/cities")
def list_cities():
    """Return all city definitions so the frontend can place dots."""
    return get_all_cities()


@router.get("/{city_id}")
async def get_weather(city_id: int):
    """Fetch live weather for a specific city (on-demand, not cached)."""
    try:
        return await fetch_weather(city_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather fetch failed: {e}")
