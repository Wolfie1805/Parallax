"""
backend/ingestion/flights.py

OpenSky Network aircraft state ingestion using OAuth2 client-credentials flow.
Polls /states/all every 10–15 seconds (controlled by APScheduler).
Token is refreshed automatically at the 25-minute mark (lifetime is ~30 min).
"""

import logging
import time
from datetime import datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import SessionLocal
from backend.models.events import Aircraft

logger = logging.getLogger(__name__)

OPENSKY_TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
OPENSKY_API_BASE = "https://opensky-network.org/api"

# Refresh token 5 minutes before it expires (lifetime ≈ 30 min)
TOKEN_LIFETIME_SECONDS = 1800
TOKEN_REFRESH_BUFFER_SECONDS = 300


class OpenSkyClient:
    """Handles OAuth2 token lifecycle and API calls for OpenSky."""

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0
        self._client_id = settings.OPENSKY_CLIENT_ID
        self._client_secret = settings.OPENSKY_CLIENT_SECRET

    def _needs_refresh(self) -> bool:
        return time.monotonic() >= (self._token_expires_at - TOKEN_REFRESH_BUFFER_SECONDS)

    def _fetch_token(self) -> None:
        logger.info("Fetching OpenSky OAuth2 token...")
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                OPENSKY_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
        data = resp.json()
        self._access_token = data["access_token"]
        # Use actual expires_in if provided, otherwise assume TOKEN_LIFETIME_SECONDS
        expires_in = data.get("expires_in", TOKEN_LIFETIME_SECONDS)
        self._token_expires_at = time.monotonic() + expires_in
        logger.info("OpenSky token acquired, expires in %ds.", expires_in)

    def ensure_token(self) -> str:
        """Return a valid access token, refreshing if necessary."""
        if self._needs_refresh():
            self._fetch_token()
        return self._access_token  # type: ignore[return-value]

    def get_states(self) -> list[dict]:
        """
        Fetch all current aircraft state vectors.
        Returns a list of dicts with icao24, callsign, lat, lng, etc.
        """
        headers = {}
        if self._client_id and self._client_secret:
            try:
                token = self.ensure_token()
                headers["Authorization"] = f"Bearer {token}"
            except Exception as exc:
                logger.warning("OAuth token error: %s — falling back to unauthenticated OpenSky query.", exc)

        with httpx.Client(timeout=20) as client:
            resp = client.get(
                f"{OPENSKY_API_BASE}/states/all",
                headers=headers,
            )
            resp.raise_for_status()

        data = resp.json()
        states = data.get("states") or []
        results = []
        for s in states:
            # OpenSky state vector fields (index-based):
            # 0=icao24, 1=callsign, 2=origin_country, 3=time_position,
            # 4=last_contact, 5=longitude, 6=latitude, 7=baro_altitude,
            # 8=on_ground, 9=velocity, 10=true_track (heading), ...
            if len(s) < 11:
                continue
            lat = s[6]
            lng = s[5]
            if lat is None or lng is None:
                continue
            results.append(
                {
                    "icao24": s[0],
                    "callsign": (s[1] or "").strip() or None,
                    "origin_country": s[2],
                    "lat": lat,
                    "lng": lng,
                    "altitude": s[7],
                    "velocity": s[9],
                    "heading": s[10],
                }
            )
        return results


# Singleton client reused across scheduler ticks
_client = OpenSkyClient()


def fetch_and_store_states() -> None:
    """Scheduled job: fetch all aircraft states and upsert into the database."""
    logger.info("Fetching OpenSky aircraft states...")
    try:
        states = _client.get_states()
        if not states:
            logger.warning("OpenSky returned 0 states.")
            return
        states = states[:2000]

        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()
            for s in states:
                existing = (
                    db.query(Aircraft)
                    .filter(Aircraft.icao24 == s["icao24"])
                    .first()
                )
                if existing:
                    existing.callsign = s["callsign"]
                    existing.lat = s["lat"]
                    existing.lng = s["lng"]
                    existing.altitude = s["altitude"]
                    existing.velocity = s["velocity"]
                    existing.heading = s["heading"]
                    existing.origin_country = s["origin_country"]
                    existing.updated_at = now
                else:
                    db.add(
                        Aircraft(
                            icao24=s["icao24"],
                            callsign=s["callsign"],
                            lat=s["lat"],
                            lng=s["lng"],
                            altitude=s["altitude"],
                            velocity=s["velocity"],
                            heading=s["heading"],
                            origin_country=s["origin_country"],
                            updated_at=now,
                        )
                    )
            db.commit()
            logger.info("Stored/updated %d aircraft states.", len(states))
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Aircraft fetch failed: %s", exc)


FALLBACK_AIRCRAFT = [
    {"icao24": "a00001", "callsign": "BAW117", "lat": 51.47, "lng": -0.45, "altitude": 10668.0, "velocity": 240.0, "heading": 270.0, "origin_country": "United Kingdom"},
    {"icao24": "a00002", "callsign": "AAL100", "lat": 40.64, "lng": -73.78, "altitude": 9500.0, "velocity": 220.0, "heading": 90.0, "origin_country": "United States"},
    {"icao24": "a00003", "callsign": "AFR006", "lat": 48.85, "lng": 2.35, "altitude": 11000.0, "velocity": 250.0, "heading": 180.0, "origin_country": "France"},
    {"icao24": "a00004", "callsign": "DLH400", "lat": 50.03, "lng": 8.57, "altitude": 10500.0, "velocity": 235.0, "heading": 310.0, "origin_country": "Germany"},
    {"icao24": "a00005", "callsign": "JAL005", "lat": 35.55, "lng": 139.78, "altitude": 12000.0, "velocity": 260.0, "heading": 45.0, "origin_country": "Japan"},
    {"icao24": "a00006", "callsign": "QFA001", "lat": -33.86, "lng": 151.20, "altitude": 11500.0, "velocity": 245.0, "heading": 120.0, "origin_country": "Australia"},
    {"icao24": "a00007", "callsign": "UAE201", "lat": 25.25, "lng": 55.36, "altitude": 10800.0, "velocity": 250.0, "heading": 300.0, "origin_country": "United Arab Emirates"},
    {"icao24": "a00008", "callsign": "SIA022", "lat": 1.35, "lng": 103.98, "altitude": 11200.0, "velocity": 255.0, "heading": 15.0, "origin_country": "Singapore"},
    {"icao24": "a00009", "callsign": "AIC101", "lat": 28.55, "lng": 77.10, "altitude": 10000.0, "velocity": 230.0, "heading": 220.0, "origin_country": "India"},
    {"icao24": "a00010", "callsign": "LAT800", "lat": -33.39, "lng": -70.79, "altitude": 9800.0, "velocity": 225.0, "heading": 190.0, "origin_country": "Chile"},
]


def get_cached_aircraft(limit: int = 500) -> list[dict]:
    """Read the latest aircraft snapshot from the database for broadcasting."""
    db: Session = SessionLocal()
    try:
        aircraft = (
            db.query(Aircraft)
            .filter(Aircraft.lat.isnot(None), Aircraft.lng.isnot(None))
            .limit(limit)
            .all()
        )
        if not aircraft:
            logger.info("No aircraft in DB on get_cached_aircraft call; running fetch_and_store_states()...")
            try:
                fetch_and_store_states()
                aircraft = (
                    db.query(Aircraft)
                    .filter(Aircraft.lat.isnot(None), Aircraft.lng.isnot(None))
                    .limit(limit)
                    .all()
                )
            except Exception as exc:
                logger.warning("Failed to auto-fetch aircraft: %s", exc)

        if not aircraft:
            logger.info("Using fallback aircraft states...")
            return FALLBACK_AIRCRAFT

        return [
            {
                "icao24": a.icao24,
                "callsign": a.callsign,
                "lat": round(a.lat, 2),
                "lng": round(a.lng, 2),
                "altitude": round(a.altitude, 1) if a.altitude is not None else None,
                "velocity": round(a.velocity, 1) if a.velocity is not None else None,
                "heading": round(a.heading, 1) if a.heading is not None else None,
                "origin_country": a.origin_country,
            }
            for a in aircraft
        ]
    finally:
        db.close()


# ── CLI test helper ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    from backend.database import engine
    from backend.models.events import Base
    Base.metadata.create_all(bind=engine)

    logging.basicConfig(level=logging.INFO)
    print("Fetching aircraft states...")
    fetch_and_store_states()
    cached = get_cached_aircraft()
    print(f"Total aircraft stored: {len(cached)}")
    print("Sample (first 3):")
    print(json.dumps(cached[:3], indent=2))
