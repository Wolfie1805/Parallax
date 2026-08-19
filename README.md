<div align="center">

# PARALLAX

**3D Planetary Telemetry Network**

*Real-time satellite tracking · Live aircraft radar · Interactive weather globe*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/3D-Three.js%20%2B%20R3F-black?style=flat-square&logo=threedotjs)](https://threejs.org/)
[![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-00b0ff?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite)](https://sqlite.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org/)

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Live Features](#-live-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Data Pipeline](#-data-pipeline)
- [Project Structure](#-project-structure)
- [Frontend Architecture](#-frontend-architecture)
- [Backend Architecture](#-backend-architecture)
- [API Reference](#-api-reference)
- [WebSocket Protocol](#-websocket-protocol)
- [3D Rendering Engine](#-3d-rendering-engine)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Performance](#-performance)
- [Satellite Categories](#-satellite-categories)
- [Aircraft Data Enrichment](#-aircraft-data-enrichment)

---

## Overview

**PARALLAX** is a real-time, full-stack 3D planetary telemetry platform that visualizes live satellite orbits, global aircraft traffic, and worldwide weather conditions on an interactive particle-rendered Earth globe.

Every data point is accurate and live:
- **Satellites** — TLE orbital elements from CelesTrak, propagated in real-time with SGP4 via Skyfield
- **Aircraft** — Live ADS-B state vectors from the OpenSky Network, refreshed every 15 seconds
- **Weather** — On-demand atmospheric data from Open-Meteo, triggered by clicking anywhere on Earth

```
+-------------------------------------------------------------+
|                     PARALLAX  v1.0.0                        |
|        Real-time 3D Planetary Telemetry Platform            |
|                                                             |
|  [SAT]  2,000+ satellites tracked in real-time             |
|  [FLT]  500+ live aircraft state vectors every 15s         |
|  [WTH]  Click anywhere on Earth for instant weather         |
|  [GFX]  Custom GLSL particle-rendered Earth globe          |
+-------------------------------------------------------------+
```

---

## Live Features

| Feature | Description |
|---------|-------------|
| **Satellite Tracking** | 2,000+ active satellites rendered with SGP4-propagated positions. 40+ categories including ISS, Starlink, GPS, Galileo, weather sats, military comms, space debris |
| **Aircraft Radar** | Live ADS-B data from OpenSky Network — callsign, airline name, altitude, airspeed (km/h & knots), heading with compass direction, flight phase |
| **Weather Globe** | Click any point on Earth for real-time temperature, wind speed, and sky condition from Open-Meteo. Search any city, state, or country worldwide |
| **Particle Earth** | Custom GLSL vertex/fragment shader rendering Earth's landmasses as a dynamic particle cloud — zero texture maps |
| **Smart Search** | Context-aware search: satellite name/NORAD ID, aircraft callsign/country, global geocoding via Open-Meteo API (3M+ locations) |
| **Live Dashboard** | Real-time count of satellites, aircraft, and weather stations with animated connection status indicator |
| **Cinematic Intro** | Holographic splash screen with PARALLAX typewriter effect, followed by warp-speed transition to the globe in under 1 second |
| **Live WebSocket** | Server pushes satellite and aircraft positions every 1.5 seconds to all connected clients simultaneously |

---

## Architecture

```
+--------------------------------------------------------------------------+
|                      PARALLAX  SYSTEM OVERVIEW                           |
+----------------------------+---------------------------------------------+
|    FRONTEND (Vite)         |         BACKEND (FastAPI)                   |
|    localhost:5173          |         localhost:8000                      |
|                            |                                             |
|  +---------------------+  |  +----------------------------------+        |
|  |    App.tsx          |  |  |  APScheduler (Background Jobs)  |        |
|  |  +-------------+   |  |  |  +--------------------------+    |        |
|  |  | SplashIntro |   |  |  |  | TLE Fetch  (every 4h)   |    |        |
|  |  | LandingScene|   |  |  |  | ADS-B Fetch (every 15s) |    |        |
|  |  | GlobeApp    |   |  |  |  +-----------+--------------+    |        |
|  |  +-------------+   |  |  +-------------+------------------  |        |
|  +--------+-----------+  |                |                             |
|           |              |  +-------------v------------------+          |
|  +--------v-----------+  |  |      SQLite Database          |          |
|  |   GlobeScene.tsx   |  |  |  satellites (TLE + NORAD ID)  |          |
|  |  +-------------+   |  |  |  aircraft   (ICAO24 + state)  |          |
|  |  |Particle Earth|  |  |  +-----------+-------------------+          |
|  |  |GLSL Shaders  |  |  |              |                              |
|  |  |OrbitControls |  |  |  +-----------v-------------------+          |
|  |  +-------------+   |  |  |  WebSocket Broadcast Loop    |          |
|  +--------+-----------+  |  |  SGP4 propagation (Skyfield) |          |
|           |              |  |  1.5s tick to all clients    |          |
|  +--------v-----------+  |  +-----------+-------------------+          |
|  |  Universe Layers   |  |              | WS /ws                       |
|  | SatelliteUniverse  |<-+----------------------------+                 |
|  | AircraftUniverse   |  |                                             |
|  | WeatherUniverse    |  |  REST API:                                  |
|  +--------+-----------+  |  GET /api/satellites                        |
|           |              |  GET /api/flights                            |
|  +--------v-----------+  |  GET /api/weather/cities                    |
|  |   UI Overlays      |  |  GET /health                                |
|  | SearchBar          |  |                                             |
|  | DetailCard         |  |  EXTERNAL DATA SOURCES:                     |
|  | Dashboard          |  |  CelesTrak      — TLE orbital data          |
|  | UniverseSwitch     |  |  OpenSky Network — ADS-B state vectors      |
|  +--------------------+  |  Open-Meteo     — Weather + geocoding       |
+----------------------------+---------------------------------------------+
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | Component framework |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 5.x | Build tool and dev server |
| **Three.js** | r167 | WebGL 3D rendering |
| **@react-three/fiber** | 8.x | React renderer for Three.js |
| **@react-three/drei** | 9.x | Three.js helpers (OrbitControls, Html, Line) |
| **Framer Motion** | 11.x | UI animations and transitions |
| **Zustand** | 4.x | Global state management |
| **GLSL** | — | Custom vertex and fragment shaders |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **FastAPI** | 0.111+ | Async HTTP and WebSocket server |
| **Uvicorn** | 0.29+ | ASGI server |
| **SQLAlchemy** | 2.x | ORM and database abstraction |
| **SQLite** | 3.x | Local data store |
| **APScheduler** | 3.x | Background job scheduling |
| **Skyfield** | 1.48+ | SGP4 orbital propagation |
| **httpx** | 0.27+ | Async HTTP client |
| **Pydantic Settings** | 2.x | Typed environment config |

### External APIs (all free, no billing required)

| API | Usage | Refresh Rate |
|-----|-------|------|
| [CelesTrak](https://celestrak.org/) | TLE orbital elements for all active satellites | Every 4 hours |
| [OpenSky Network](https://opensky-network.org/) | Live ADS-B aircraft state vectors | Every 15 seconds |
| [Open-Meteo](https://open-meteo.com/) | Real-time weather and global geocoding | On-demand |
| [BigDataCloud](https://www.bigdatacloud.com/) | Reverse geocoding for weather clicks | On-demand |

---

## Data Pipeline

```
CelesTrak API
     |
     |  HTTPS (every 4h)
     v
+------------------------+
|  ingestion/satellites.py|
|  Parse 3-line TLE      |
|  Upsert to SQLite      |
+----------+-------------+
           |
           v
+------------------------+     Every 1.5s tick
|  SQLite (satellites)   +----------------------------->
|  norad_id, name,       |                            |
|  tle_line1, tle_line2  |   SGP4 Propagation         |
+------------------------+   (Skyfield)               |
                                                      |
                            +-------------------------v-----------+
                            |   WebSocket Broadcast Loop         |
                            |   {universe: "satellite",          |
                            |    data: [{norad_id, name,         |
                            |           lat, lng, altitude_km}]} |
                            +-------------------------+-----------+
                                                      | WS /ws
OpenSky Network API                    React Frontend (Zustand)
     |                                 useWebSocket hook
     |  HTTPS (every 15s)              setSatellites() / setAircraft()
     v                                        |
+------------------------+                   v
|  ingestion/flights.py  |          SatelliteUniverse.tsx
|  OAuth2 token refresh  |          AircraftUniverse.tsx
|  Parse state vectors   |          InstancedMesh rendering
|  Upsert to SQLite      |
+------------------------+

Open-Meteo API (Weather)
     |
     |  HTTPS (on globe click or search select)
     v
  WeatherUniverse.tsx / SearchBar.tsx
  Live temperature, wind, condition
  DetailCard display
```

### Satellite Position Propagation

Each server tick, Skyfield propagates all stored TLEs to the current UTC moment using the SGP4 algorithm:

```
TLE (line1, line2)
  --> EarthSatellite(tle_line1, tle_line2, name)
  --> satellite.at(timescale.now())
  --> wgs84.subpoint_of(geometric_position)
  --> { latitude deg, longitude deg, elevation km }
```

---

## Project Structure

```
parallax/
|-- README.md
|-- parallax.db                        # SQLite database (auto-created on startup)
|
|-- backend/                           # FastAPI Python backend
|   |-- main.py                        # App entry point, lifespan, CORS, routers
|   |-- config.py                      # Pydantic settings (DATABASE_URL, CORS)
|   |-- database.py                    # SQLAlchemy engine and session factory
|   |-- scheduler.py                   # APScheduler setup (TLE: 4h, ADS-B: 15s)
|   |-- requirements.txt
|   |-- .env                           # Local environment variables (gitignored)
|   |
|   |-- ingestion/
|   |   |-- satellites.py              # CelesTrak TLE fetch + Skyfield SGP4 propagation
|   |   |-- flights.py                 # OpenSky OAuth2 + ADS-B state ingestion
|   |   `-- weather.py                 # Weather utilities (on-demand)
|   |
|   |-- models/
|   |   `-- events.py                  # SQLAlchemy ORM models: Satellite, Aircraft
|   |
|   `-- routers/
|       |-- satellites.py              # GET /api/satellites
|       |-- flights.py                 # GET /api/flights
|       |-- weather.py                 # GET /api/weather/cities
|       `-- websocket.py               # WS /ws — broadcast loop (1.5s tick)
|
`-- frontend/                          # React + Vite + Three.js frontend
    |-- index.html
    |-- package.json
    |-- vite.config.ts
    |-- tsconfig.json
    |
    `-- src/
        |-- main.tsx                   # React root mount
        |-- App.tsx                    # Stage router: splash -> landing -> globe
        |
        |-- scenes/
        |   |-- GlobeScene.tsx         # Core 3D scene, particle globe, entry animation,
        |   |                          #   FocusController, OrbitControls
        |   `-- LandingScene.tsx       # Hero landing page with warp transition
        |
        |-- universes/
        |   |-- SatelliteUniverse.tsx  # 40+ category satellite rendering
        |   |-- AircraftUniverse.tsx   # Altitude-colored aircraft rendering
        |   `-- WeatherUniverse.tsx    # Click-to-weather with ripple animation
        |
        |-- components/
        |   |-- SearchBar.tsx          # Smart contextual search + live geocoding
        |   |-- DetailCard.tsx         # Holographic entity detail popup
        |   |-- Dashboard.tsx          # Live telemetry stats overlay
        |   `-- UniverseSwitchButton.tsx  # Satellite / Aircraft / Weather toggle
        |
        |-- hooks/
        |   `-- useWebSocket.ts        # WebSocket client with auto-reconnect
        |
        |-- state/
        |   `-- universeStore.ts       # Zustand store: satellites, aircraft, selection
        |
        |-- shaders/
        |   |-- particleGlobe.vert.glsl  # Vertex shader: particle positions, density
        |   |-- particleGlobe.frag.glsl  # Fragment shader: glow, color, alpha
        |   |-- reweave.vert.glsl        # Transition effect vertex shader
        |   `-- reweave.frag.glsl        # Transition effect fragment shader
        |
        `-- geo/
            `-- earthParticlesData.json  # Pre-baked Earth particle positions & colors
```

---

## Frontend Architecture

### Application Stage Flow

```
Browser Load
     |
     v
+-------------+   ~1.5s   +-----------------+  click "Start"   +--------------+
| SplashIntro |---------->|  LandingScene   |----------------->|   GlobeApp   |
|  (splash)   |           |  (landing)      |  Warp animation  |   (globe)    |
|             |           |  Hero text      |  < 0.85s total   |              |
| PARALLAX    |           |  Social links   |                  | 3D Globe     |
| typewriter  |           |  Start button   |                  | + Universes  |
+-------------+           +-----------------+                  +--------------+
```

### 3D Scene Composition

```
<GlobeScene>                       Canvas, lighting, OrbitControls
  <EarthOcclusionBody />            Solid dark sphere for depth occlusion
  <ParticleLandmass />              GLSL particle globe (landmasses)
  <StarField />                     3,000 randomized background stars
  <GlobeMesh>                       Invisible rotation group
    <group ref={globeGroupRef}>     Rotates at 0.004 rad/s idle
      {children}                    Universe layers injected here
    </group>
  </GlobeMesh>
  <FocusController />               Camera lerp to selected entity
</GlobeScene>

Active Universe (one at a time):
  SatelliteUniverse   InstancedMesh (visual) + InstancedMesh (hitbox)
  AircraftUniverse    InstancedMesh (visual) + InstancedMesh (hitbox)
  WeatherUniverse     Invisible sphere raycast target + ripple animations
```

### State Management (Zustand)

```typescript
UniverseStore {
  activeUniverse:  'satellite' | 'aircraft' | 'weather'
  satellites:      SatelliteData[]      // Live from WebSocket
  aircraft:        AircraftData[]       // Live from WebSocket
  cities:          CityData[]           // Seed from REST API
  selectedEntity:  SelectedEntity | null
  wsConnected:     boolean

  setActiveUniverse()    // Switch between the three data layers
  setSatellites()        // Called by useWebSocket on each tick
  setAircraft()          // Called by useWebSocket on each tick
  setSelectedEntity()    // Called on marker click -> opens DetailCard
}
```

### WebSocket Client Flow

```
useWebSocket hook
  |
  +-- Connect to ws://localhost:8000/ws
  +-- Auto-reconnect on disconnect (1s delay)
  |
  `-- onmessage:
        { universe: "satellite", data: [...] }  -->  setSatellites()
        { universe: "aircraft",  data: [...] }  -->  setAircraft()
```

---

## Backend Architecture

### Request Lifecycle

```
HTTP Request
     |
     v
FastAPI (uvicorn ASGI)
     |
     +-- CORSMiddleware
     |
     +-- /api/satellites   --> routers/satellites.py  --> propagate_all()
     +-- /api/flights      --> routers/flights.py     --> get_cached_aircraft()
     +-- /api/weather/*    --> routers/weather.py     --> city list
     `-- /ws               --> routers/websocket.py   --> ConnectionManager
```

### Scheduler Jobs

```
APScheduler (AsyncIOScheduler)
  |
  +-- satellite_tle_fetch
  |     trigger:  interval, every 4 hours
  |     action:   fetch_and_store_tles()
  |               GET celestrak.org/NORAD/elements/gp.php?GROUP=active
  |               Parse 3-line TLE text
  |               Upsert Satellite rows in SQLite
  |
  `-- aircraft_state_fetch
        trigger:  interval, every 15 seconds
        action:   fetch_and_store_states()
                  GET opensky-network.org/api/states/all (OAuth2)
                  Parse state vector arrays (index-mapped fields)
                  Upsert Aircraft rows in SQLite (up to 2,000)
```

### Database Schema

```sql
-- Satellites table
CREATE TABLE satellites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    norad_id    TEXT UNIQUE NOT NULL,
    name        TEXT,
    tle_line1   TEXT,
    tle_line2   TEXT,
    fetched_at  DATETIME
);

-- Aircraft table
CREATE TABLE aircraft (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    icao24          TEXT UNIQUE NOT NULL,
    callsign        TEXT,
    lat             REAL,
    lng             REAL,
    altitude        REAL,       -- meters above WGS-84 ellipsoid
    velocity        REAL,       -- m/s ground speed
    heading         REAL,       -- degrees true track
    origin_country  TEXT,
    updated_at      DATETIME
);
```

---

## API Reference

### REST Endpoints

#### `GET /health`
Returns server health status.
```json
{ "status": "ok", "service": "parallax-backend" }
```

#### `GET /api/satellites`
Returns satellite snapshot (static list).
```json
[
  { "norad_id": "25544", "name": "ISS (ZARYA)", "lat": 48.2, "lng": -12.7, "altitude_km": 418.3 },
  { "norad_id": "44713", "name": "STARLINK-1007", "lat": -33.1, "lng": 151.2, "altitude_km": 550.8 }
]
```

#### `GET /api/flights`
Returns latest aircraft state snapshot (up to 500).
```json
[
  {
    "icao24": "a1b2c3", "callsign": "DAL123",
    "lat": 40.7, "lng": -74.0, "altitude": 10500,
    "velocity": 247.3, "heading": 273.0, "origin_country": "United States"
  }
]
```

#### `GET /api/weather/cities`
Returns seed city list for initial weather display.
```json
[
  { "id": 1, "name": "New Delhi", "country": "India", "lat": 28.63, "lng": 77.22 }
]
```

---

## WebSocket Protocol

**Endpoint:** `ws://localhost:8000/ws`

### Server to Client (push, every 1.5 seconds)

**Satellite frame:**
```json
{
  "universe": "satellite",
  "data": [
    { "norad_id": "25544", "name": "ISS (ZARYA)", "lat": 48.2, "lng": -12.7, "altitude_km": 418.3 },
    { "norad_id": "44713", "name": "STARLINK-1007", "lat": -33.1, "lng": 151.2, "altitude_km": 550.8 }
  ]
}
```

**Aircraft frame** (100ms after satellite frame):
```json
{
  "universe": "aircraft",
  "data": [
    {
      "icao24": "a1b2c3", "callsign": "DAL123",
      "lat": 40.7, "lng": -74.0, "altitude": 10500,
      "velocity": 247.3, "heading": 273.0, "origin_country": "United States"
    }
  ]
}
```

### Timing Diagram

```
Server                              Client
  |                                   |
  |---- satellite frame ------------->|   t = 0.0s   setSatellites([...])
  |                                   |
  |         (100ms gap)               |
  |                                   |
  |---- aircraft frame  ------------->|   t = 0.1s   setAircraft([...])
  |                                   |
  |         (wait 1.5s)               |
  |                                   |
  |---- satellite frame ------------->|   t = 1.6s
  |---- aircraft frame  ------------->|   t = 1.7s
  |                                   |
  |         (repeat forever)          |
```

---

## 3D Rendering Engine

### Particle Globe (Custom GLSL)

The Earth landmasses are rendered entirely with a custom GLSL shader — no texture maps.

**Vertex Shader (simplified):**
```glsl
attribute float density;
uniform float uTime;
uniform float uSize;

void main() {
  vec3 pos = position;
  // Breathing animation pulse
  float pulse = sin(uTime * 1.5 + density * 3.14) * 0.004;
  pos += normal * pulse;
  // Particle size driven by land density
  gl_PointSize = uSize * (density + 0.4);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Fragment Shader (simplified):**
```glsl
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;               // Circular particles
  float alpha = 1.0 - smoothstep(0.3, 0.5, d);
  gl_FragColor = vec4(vColor * alpha, alpha);
}
```

### InstancedMesh Strategy

All satellite and aircraft markers use **InstancedMesh** for GPU-instanced rendering — thousands of objects in a single draw call:

```
Visual Mesh  (small geometry, 0.010-0.012 units)
  Satellite:  BoxGeometry (bus) + solar wing panels
  Aircraft:   Extruded chevron shape

Hitbox Mesh  (SphereGeometry 0.032 units, visible=false)
  Handles all pointer events (onClick, onPointerMove)
  Larger than visual for easy clicking on small markers
  Shares the same instance matrix as the visual mesh
```

### Entry Animation Sequence

```
User clicks "Start Visualization"
  |
  +-- [0ms]     Warp flash overlay (cyan radial gradient burst)
  +-- [180ms]   Flash fades, globe begins rapid spin
  +-- [450ms]   Globe slows (sine ease-out curve)
  +-- [600ms]   360 degree spin complete, normal idle speed resumes (0.004 rad/s)
  +-- [700ms]   Globe fades in from dark (opacity 0 -> 1)
  `-- [850ms]   Data points fade in         <-- Total under 1 second
```

---

## Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- **npm** 9+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/parallax.git
cd parallax
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./parallax.db
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
OPENSKY_CLIENT_ID=your_opensky_client_id
OPENSKY_CLIENT_SECRET=your_opensky_client_secret
```

> **Note:** OpenSky credentials are optional. The app falls back to unauthenticated requests (lower rate limit). Get free credentials at [opensky-network.org](https://opensky-network.org/).

### 4. Start the backend

```bash
# From the project root
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

On startup the backend will:
1. Auto-create `parallax.db`
2. Immediately fetch TLE data from CelesTrak (~5,000 satellites)
3. Start APScheduler background jobs
4. Begin the WebSocket broadcast loop

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 6. Production Build

```bash
cd frontend
npm run build
# Static output in frontend/dist/
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./parallax.db` | SQLAlchemy database connection string |
| `OPENSKY_CLIENT_ID` | `""` | OpenSky OAuth2 client ID (optional) |
| `OPENSKY_CLIENT_SECRET` | `""` | OpenSky OAuth2 client secret (optional) |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed frontend origins |

---

## Performance

PARALLAX is optimized to run at 60fps on mid-range hardware.

### Rendering Optimizations

| Technique | Details |
|-----------|---------|
| **InstancedMesh** | All satellites and aircraft rendered in 2 draw calls each (visual + hitbox) |
| **DPR Cap** | WebGL device pixel ratio capped at [1, 1.5] — prevents 4K overdraw |
| **Zero per-frame allocation** | Shared `DUMMY` Object3D and `COLOR_TMP` Color reused every frame |
| **Delta-time interpolation** | All animations use `delta` from `useFrame` — frame-rate independent |
| **Invisible hitbox pattern** | Click targets are separate invisible spheres — decouples visual complexity from interaction |
| **Selective rendering** | Only the active universe layer is mounted in the R3F scene tree |

### Data Optimizations

| Technique | Details |
|-----------|---------|
| **SQLite upsert** | Aircraft rows updated in place — no row accumulation over time |
| **WebSocket push** | Server pushes data rather than clients polling — one connection per session |
| **Debounced search** | Geocoding API called 300ms after typing stops — no keystroke flooding |
| **Skyfield thread offload** | SGP4 propagation runs in `asyncio.to_thread` — never blocks the event loop |
| **TLE in-memory cache** | Module-level TLE list prevents DB re-reads every broadcast tick |

---

## Satellite Categories

PARALLAX classifies satellites into 40+ precise categories:

| Category | Examples |
|----------|---------|
| Space Station | ISS, Tiangong |
| Starlink (SpaceX) | STARLINK-xxxx |
| OneWeb | ONEWEB-xxxx |
| GPS (USA) | GPS BIIF-x, NAVSTAR |
| GLONASS (Russia) | GLONASS-M |
| Galileo (ESA) | GALILEO-xx |
| BeiDou (China) | BEIDOU-xx |
| QZSS (Japan) | MICHIBIKI |
| GOES (NOAA) | GOES-16, GOES-18 |
| Meteosat (EUMETSAT) | METEOSAT-xx |
| NOAA Weather | NOAA-xx, TIROS-xx |
| JPSS (NOAA/NASA) | SUOMI NPP, JPSS-2 |
| Earth Science (NASA) | TERRA, AQUA, AURA |
| Sentinel (ESA) | SENTINEL-1A, SENTINEL-2B |
| Landsat (USGS/NASA) | LANDSAT-8, LANDSAT-9 |
| Intelsat | INTELSAT-xx |
| SES | SES-xx |
| Inmarsat | INMARSAT-xx |
| Eutelsat | EUTELSAT-xx |
| Viasat | VIASAT-3 |
| Iridium | IRIDIUM NEXT |
| Globalstar | GLOBALSTAR-xx |
| ORBCOMM (IoT) | ORBCOMM-xx |
| Military Comms (USA) | AEHF, WGS, MUOS, MILSTAR |
| Reconnaissance | COSMO-SKYMED, PLEIADES |
| Space Telescope (NASA) | HST (Hubble) |
| X-Ray Observatory | CHANDRA |
| High-Energy Astronomy | FERMI, SWIFT, INTEGRAL |
| Amateur Radio (AMSAT) | OSCAR-xx, AO-xx |
| CubeSat | -3U, -6U, -12U formats |
| Space Debris / Rocket Body | DEB, R/B, FRAG |
| Recent Launch Object | NORAD ID > 70,000 |
| Orbital Satellite | (catch-all, active orbit) |

---

## Aircraft Data Enrichment

The detail card resolves ICAO callsign prefixes to full airline names:

| Callsign Prefix | Airline | Type |
|-----------------|---------|------|
| `AAL` | American Airlines | Commercial Airline |
| `UAL` | United Airlines | Commercial Airline |
| `DAL` | Delta Air Lines | Commercial Airline |
| `BAW` | British Airways | Commercial Airline |
| `DLH` | Lufthansa | Commercial Airline |
| `AFR` | Air France | Commercial Airline |
| `UAE` | Emirates | Commercial Airline |
| `QTR` | Qatar Airways | Commercial Airline |
| `ETD` | Etihad Airways | Commercial Airline |
| `SIA` | Singapore Airlines | Commercial Airline |
| `RYR` | Ryanair | Low-Cost Carrier |
| `EZY` | easyJet | Low-Cost Carrier |
| `IGO` | IndiGo | Low-Cost Carrier |
| `AIC` | Air India | Commercial Airline |
| `THY` | Turkish Airlines | Commercial Airline |
| `FDX` | FedEx Express | Cargo / Freighter |
| `UPS` | UPS Airlines | Cargo / Freighter |
| `CLX` | Cargolux | Cargo / Freighter |
| `RCH` | U.S. Military / Government | Military / State |
| *(120+ airlines covered total)* | | |

**Flight phase** is inferred from altitude and velocity:

```
altitude < 300m   AND  speed < 50 m/s   -->  On Ground / Taxiing
altitude < 1,500m                        -->  Departing / Approach
altitude < 5,000m                        -->  Climbing
altitude >= 9,000m  AND  speed > 180     -->  Cruising at Altitude
altitude < 9,000m   AND  speed < 150     -->  Descending
otherwise                                -->  En Route
```

**Altitude** shown in both km and ft. **Airspeed** shown in both km/h and knots. **Heading** shown in degrees with 16-point compass direction.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with React, Three.js, FastAPI, and Skyfield

*Track the world in real-time — from orbit to your doorstep.*

</div>
