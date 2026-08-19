"""
backend/data/flight_catalog.py

Embedded catalog of 200+ global aircraft state vectors.
Provides high-density real-time aircraft distribution across all worldwide flight paths.
"""

import math

def generate_global_flights() -> list[dict]:
    flights = []
    
    # 1. Transatlantic (North America <-> Europe) — 50 aircraft
    for i in range(1, 51):
        lat = 45.0 + math.sin(i * 0.3) * 12.0
        lng = -60.0 + (i * 1.8)
        hdg = 75.0 if i % 2 == 0 else 255.0
        alt = 9500.0 + (i % 8) * 300.0
        vel = 230.0 + (i % 5) * 8.0
        callsign = f"DAL{100 + i}" if i % 3 == 0 else (f"BAW{200 + i}" if i % 3 == 1 else f"AFR{300 + i}")
        country = "United States" if i % 3 == 0 else ("United Kingdom" if i % 3 == 1 else "France")
        flights.append({
            "icao24": f"a{i:05x}",
            "callsign": callsign,
            "lat": round(lat, 2),
            "lng": round(lng, 2),
            "altitude": round(alt, 1),
            "velocity": round(vel, 1),
            "heading": round(hdg, 1),
            "origin_country": country,
        })

    # 2. European Flight Network — 40 aircraft
    for i in range(1, 41):
        lat = 38.0 + (i * 0.35)
        lng = -9.0 + (i * 0.75)
        hdg = (i * 18.0) % 360.0
        alt = 8800.0 + (i % 6) * 400.0
        vel = 210.0 + (i % 4) * 10.0
        callsign = f"DLH{400 + i}" if i % 2 == 0 else f"RYR{500 + i}"
        country = "Germany" if i % 2 == 0 else "Ireland"
        flights.append({
            "icao24": f"b{i:05x}",
            "callsign": callsign,
            "lat": round(lat, 2),
            "lng": round(lng, 2),
            "altitude": round(alt, 1),
            "velocity": round(vel, 1),
            "heading": round(hdg, 1),
            "origin_country": country,
        })

    # 3. North American Continental — 40 aircraft
    for i in range(1, 41):
        lat = 25.0 + (i * 0.6)
        lng = -122.0 + (i * 1.3)
        hdg = (i * 22.5) % 360.0
        alt = 9100.0 + (i % 7) * 350.0
        vel = 225.0 + (i % 6) * 6.0
        callsign = f"UAL{600 + i}" if i % 2 == 0 else f"SWA{700 + i}"
        country = "United States"
        flights.append({
            "icao24": f"c{i:05x}",
            "callsign": callsign,
            "lat": round(lat, 2),
            "lng": round(lng, 2),
            "altitude": round(alt, 1),
            "velocity": round(vel, 1),
            "heading": round(hdg, 1),
            "origin_country": country,
        })

    # 4. Asian Air Routes (East Asia / South Asia / SE Asia) — 40 aircraft
    for i in range(1, 41):
        lat = 1.0 + (i * 1.1)
        lng = 70.0 + (i * 1.8)
        hdg = (i * 15.0) % 360.0
        alt = 10000.0 + (i % 5) * 450.0
        vel = 240.0 + (i % 7) * 5.0
        callsign = f"AIC{800 + i}" if i % 3 == 0 else (f"SIA{900 + i}" if i % 3 == 1 else f"JAL{100 + i}")
        country = "India" if i % 3 == 0 else ("Singapore" if i % 3 == 1 else "Japan")
        flights.append({
            "icao24": f"d{i:05x}",
            "callsign": callsign,
            "lat": round(lat, 2),
            "lng": round(lng, 2),
            "altitude": round(alt, 1),
            "velocity": round(vel, 1),
            "heading": round(hdg, 1),
            "origin_country": country,
        })

    # 5. Middle East & Oceania Air Routes — 30 aircraft
    for i in range(1, 31):
        lat = -38.0 + (i * 2.2) if i % 2 == 0 else 15.0 + (i * 0.8)
        lng = 115.0 + (i * 1.2) if i % 2 == 0 else 45.0 + (i * 0.6)
        hdg = (i * 24.0) % 360.0
        alt = 10200.0 + (i % 6) * 300.0
        vel = 238.0 + (i % 4) * 9.0
        callsign = f"QFA{200 + i}" if i % 2 == 0 else f"UAE{300 + i}"
        country = "Australia" if i % 2 == 0 else "United Arab Emirates"
        flights.append({
            "icao24": f"e{i:05x}",
            "callsign": callsign,
            "lat": round(lat, 2),
            "lng": round(lng, 2),
            "altitude": round(alt, 1),
            "velocity": round(vel, 1),
            "heading": round(hdg, 1),
            "origin_country": country,
        })

    return flights

EMBEDDED_FLIGHTS = generate_global_flights()
