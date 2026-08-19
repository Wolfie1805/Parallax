import { useEffect, useRef } from 'react'
import { useUniverseStore } from '../state/universeStore'

// ── API base URL ─────────────────────────────────────────────────────────────
// In production (Vercel): set VITE_API_BASE_URL to the backend Vercel URL,
// e.g. https://parallax-backend.vercel.app
// In development: leave unset — relative /api/* paths are proxied by Vite
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function getApiUrl(path: string): string {
  return `${API_BASE}${path}`
}

function getWsUrl(): string {
  // Allow explicit override via env var (required for Vercel split deployments)
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL

  // If API_BASE is set, derive wss:// from it
  if (API_BASE) {
    const wsBase = API_BASE.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const protocol = API_BASE.startsWith('https') ? 'wss:' : 'ws:'
    return `${protocol}//${wsBase}/ws`
  }

  // Dev fallback: proxy via Vite or direct to port 8000
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (window.location.port === '5173' || window.location.port === '5174') {
    return `${protocol}//${window.location.hostname}:8000/ws`
  }
  return `${protocol}//${window.location.host}/ws`
}

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

const DEFAULT_FALLBACK_SATELLITES = [
  { norad_id: '25544', name: 'ISS (ZARYA)', lat: 41.5, lng: -74.0, altitude_km: 418.5 },
  { norad_id: '20580', name: 'HST (HUBBLE)', lat: 28.5, lng: -80.6, altitude_km: 538.2 },
  { norad_id: '44713', name: 'STARLINK-1007', lat: 51.6, lng: 0.1, altitude_km: 550.0 },
  { norad_id: '48274', name: 'TIANGONG (CSS)', lat: 38.9, lng: 116.4, altitude_km: 389.1 },
  { norad_id: '43013', name: 'NOAA 20', lat: 70.1, lng: -140.2, altitude_km: 824.0 },
  { norad_id: '25994', name: 'TERRA', lat: -22.9, lng: -43.2, altitude_km: 705.0 },
  { norad_id: '27424', name: 'AQUA', lat: 34.0, lng: -118.2, altitude_km: 705.0 },
  { norad_id: '33591', name: 'NOAA 19', lat: 45.5, lng: 9.2, altitude_km: 850.0 },
  { norad_id: '40059', name: 'SENTINEL 1A', lat: 52.5, lng: 13.4, altitude_km: 693.0 },
  { norad_id: '41588', name: 'SENTINEL 2A', lat: -33.8, lng: 151.2, altitude_km: 786.0 },
  { norad_id: '43226', name: 'GOES 17', lat: 0.0, lng: -137.2, altitude_km: 35786.0 },
  { norad_id: '41866', name: 'GOES 16', lat: 0.0, lng: -75.2, altitude_km: 35786.0 },
]

const DEFAULT_FALLBACK_AIRCRAFT = [
  { icao24: 'a00001', callsign: 'BAW117', lat: 51.47, lng: -0.45, altitude: 10668.0, velocity: 240.0, heading: 270.0, origin_country: 'United Kingdom' },
  { icao24: 'a00002', callsign: 'AAL100', lat: 40.64, lng: -73.78, altitude: 9500.0, velocity: 220.0, heading: 90.0, origin_country: 'United States' },
  { icao24: 'a00003', callsign: 'AFR006', lat: 48.85, lng: 2.35, altitude: 11000.0, velocity: 250.0, heading: 180.0, origin_country: 'France' },
  { icao24: 'a00004', callsign: 'DLH400', lat: 50.03, lng: 8.57, altitude: 10500.0, velocity: 235.0, heading: 310.0, origin_country: 'Germany' },
  { icao24: 'a00005', callsign: 'JAL005', lat: 35.55, lng: 139.78, altitude: 12000.0, velocity: 260.0, heading: 45.0, origin_country: 'Japan' },
  { icao24: 'a00006', callsign: 'QFA001', lat: -33.86, lng: 151.20, altitude: 11500.0, velocity: 245.0, heading: 120.0, origin_country: 'Australia' },
  { icao24: 'a00007', callsign: 'UAE201', lat: 25.25, lng: 55.36, altitude: 10800.0, velocity: 250.0, heading: 300.0, origin_country: 'United Arab Emirates' },
  { icao24: 'a00008', callsign: 'SIA022', lat: 1.35, lng: 103.98, altitude: 11200.0, velocity: 255.0, heading: 15.0, origin_country: 'Singapore' },
  { icao24: 'a00009', callsign: 'AIC101', lat: 28.55, lng: 77.10, altitude: 10000.0, velocity: 230.0, heading: 220.0, origin_country: 'India' },
  { icao24: 'a00010', callsign: 'LAT800', lat: -33.39, lng: -70.79, altitude: 9800.0, velocity: 225.0, heading: 190.0, origin_country: 'Chile' },
]

export function useWebSocket() {
  const setSatellites = useUniverseStore((s) => s.setSatellites)
  const setAircraft = useUniverseStore((s) => s.setAircraft)
  const setWsConnected = useUniverseStore((s) => s.setWsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const retryDelayRef = useRef(RECONNECT_BASE_MS)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    mountedRef.current = true

    // ── 0. Seed Instant Telemetry Data (0ms Instant Visibility) ─────────────
    setSatellites(DEFAULT_FALLBACK_SATELLITES)
    setAircraft(DEFAULT_FALLBACK_AIRCRAFT)

    // ── 1. Immediate Initial REST Fetch ──────────────────────────────────────
    fetch(getApiUrl('/api/satellites/'))
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current && Array.isArray(data) && data.length > 0) {
          setSatellites(data)
        }
      })
      .catch((err) => console.warn('Initial satellite REST fetch warning:', err))

    fetch(getApiUrl('/api/flights/'))
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current && Array.isArray(data) && data.length > 0) {
          setAircraft(data)
        }
      })
      .catch((err) => console.warn('Initial aircraft REST fetch warning:', err))

    // ── 2. REST Polling Fallback (used in production if WS is unavailable) ───
    // On Vercel serverless, WebSockets may be unavailable. We poll REST every
    // 15 seconds as a fallback so data stays live. WS takes priority if it works.
    const startPolling = () => {
      if (pollTimerRef.current) return
      pollTimerRef.current = setInterval(() => {
        if (!mountedRef.current) return
        fetch(getApiUrl('/api/satellites/'))
          .then((r) => r.json())
          .then((data) => {
            if (mountedRef.current && Array.isArray(data) && data.length > 0) setSatellites(data)
          })
          .catch(() => {})

        fetch(getApiUrl('/api/flights/'))
          .then((r) => r.json())
          .then((data) => {
            if (mountedRef.current && Array.isArray(data) && data.length > 0) setAircraft(data)
          })
          .catch(() => {})
      }, 15000)
    }

    // ── 3. Live WebSocket Connection Loop ────────────────────────────────────
    function connect() {
      if (!mountedRef.current) return
      const wsUrl = getWsUrl()
      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl)
      } catch {
        // WS construction failed (e.g. blocked env) — use polling only
        startPolling()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        retryDelayRef.current = RECONNECT_BASE_MS
        setWsConnected(true)
        // Stop REST polling while WebSocket is active
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.universe === 'satellite' && Array.isArray(msg.data)) {
            setSatellites(msg.data)
          } else if (msg.universe === 'aircraft' && Array.isArray(msg.data)) {
            setAircraft(msg.data)
          }
        } catch {
          // malformed message — ignore
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        // Start REST polling when WS drops
        startPolling()
        if (!mountedRef.current) return
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, RECONNECT_MAX_MS)
          connect()
        }, retryDelayRef.current)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      wsRef.current?.close()
      setWsConnected(false)
    }
  }, [setSatellites, setAircraft, setWsConnected])
}
