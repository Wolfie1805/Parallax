"""
backend/ingestion/weather.py

On-demand weather fetches from Open-Meteo (no API key required).
Weather is NEVER pre-fetched on a timer — only called when a user clicks a city dot.
"""

import logging

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Fixed list of ~25 major world cities — integer city_id is the dict key
CITIES: dict[int, dict] = {
    1:  {"name": "New York",      "lat": 40.7128,  "lng": -74.0060},
    2:  {"name": "London",        "lat": 51.5074,  "lng": -0.1278},
    3:  {"name": "Tokyo",         "lat": 35.6762,  "lng": 139.6503},
    4:  {"name": "Sydney",        "lat": -33.8688, "lng": 151.2093},
    5:  {"name": "Paris",         "lat": 48.8566,  "lng": 2.3522},
    6:  {"name": "Dubai",         "lat": 25.2048,  "lng": 55.2708},
    7:  {"name": "Singapore",     "lat": 1.3521,   "lng": 103.8198},
    8:  {"name": "Los Angeles",   "lat": 34.0522,  "lng": -118.2437},
    9:  {"name": "Cairo",         "lat": 30.0444,  "lng": 31.2357},
    10: {"name": "Mumbai",        "lat": 19.0760,  "lng": 72.8777},
    11: {"name": "São Paulo",     "lat": -23.5505, "lng": -46.6333},
    12: {"name": "Moscow",        "lat": 55.7558,  "lng": 37.6173},
    13: {"name": "Beijing",       "lat": 39.9042,  "lng": 116.4074},
    14: {"name": "Lagos",         "lat": 6.5244,   "lng": 3.3792},
    15: {"name": "Mexico City",   "lat": 19.4326,  "lng": -99.1332},
    16: {"name": "Istanbul",      "lat": 41.0082,  "lng": 28.9784},
    17: {"name": "Toronto",       "lat": 43.6532,  "lng": -79.3832},
    18: {"name": "Buenos Aires",  "lat": -34.6037, "lng": -58.3816},
    19: {"name": "Nairobi",       "lat": -1.2921,  "lng": 36.8219},
    20: {"name": "Seoul",         "lat": 37.5665,  "lng": 126.9780},
    21: {"name": "Johannesburg",  "lat": -26.2041, "lng": 28.0473},
    22: {"name": "Chicago",       "lat": 41.8781,  "lng": -87.6298},
    23: {"name": "Berlin",        "lat": 52.5200,  "lng": 13.4050},
    24: {"name": "Jakarta",       "lat": -6.2088,  "lng": 106.8456},
    25: {"name": "Riyadh",        "lat": 24.7136,  "lng": 46.6753},
}

# WMO weather condition codes → human-readable strings
WMO_CONDITIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Icy fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight showers", 81: "Moderate showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Heavy thunderstorm",
}


def get_all_cities() -> list[dict]:
    """Return all city definitions (used by the frontend to place dots)."""
    return [{"id": cid, **info} for cid, info in CITIES.items()]


async def fetch_weather(city_id: int) -> dict:
    """
    On-demand Open-Meteo fetch for a single city.
    Raises ValueError if city_id is unknown.
    Raises httpx.HTTPError on network failure.
    """
    if city_id not in CITIES:
        raise ValueError(f"Unknown city_id: {city_id}")

    city = CITIES[city_id]
    params = {
        "latitude": city["lat"],
        "longitude": city["lng"],
        "current_weather": "true",
        "wind_speed_unit": "kmh",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()

    data = resp.json()
    cw = data.get("current_weather", {})
    wmo_code = cw.get("weathercode", -1)
    return {
        "city_id": city_id,
        "city_name": city["name"],
        "lat": city["lat"],
        "lng": city["lng"],
        "temperature_c": cw.get("temperature"),
        "wind_speed_kmh": cw.get("windspeed"),
        "condition": WMO_CONDITIONS.get(wmo_code, f"Code {wmo_code}"),
        "is_day": cw.get("is_day"),
    }
