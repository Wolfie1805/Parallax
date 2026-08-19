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

function generateFallbackSatellites() {
  const sats = [
    { norad_id: '25544', name: 'ISS (ZARYA)', lat: 41.5, lng: -74.0, altitude_km: 418.5 },
    { norad_id: '20580', name: 'HST (HUBBLE)', lat: 28.5, lng: -80.6, altitude_km: 538.2 },
    { norad_id: '48274', name: 'TIANGONG (CSS)', lat: 38.9, lng: 116.4, altitude_km: 389.1 },
    { norad_id: '43013', name: 'NOAA 20', lat: 70.1, lng: -140.2, altitude_km: 824.0 },
    { norad_id: '25994', name: 'TERRA', lat: -22.9, lng: -43.2, altitude_km: 705.0 },
    { norad_id: '27424', name: 'AQUA', lat: 34.0, lng: -118.2, altitude_km: 705.0 },
  ]
  for (let i = 1; i <= 180; i++) {
    const lat = Math.sin(i * 0.2) * 53.0
    const lng = -180.0 + ((i * 2.0) % 360.0)
    sats.push({
      norad_id: `${44000 + i}`,
      name: `STARLINK-${1000 + i}`,
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      altitude_km: 550.0 + (i % 4) * 5.0,
    })
  }
  for (let i = 1; i <= 80; i++) {
    const lat = Math.cos(i * 0.3) * 87.0
    const lng = -180.0 + ((i * 4.5) % 360.0)
    sats.push({
      norad_id: `${45000 + i}`,
      name: `ONEWEB-${2000 + i}`,
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      altitude_km: 1200.0 + (i % 3) * 10.0,
    })
  }
  return sats
}

function generateFallbackAircraft() {
  const ac: any[] = []
  for (let i = 1; i <= 150; i++) {
    const lat = Math.sin(i * 0.25) * 55.0
    const lng = -170.0 + ((i * 2.4) % 340.0)
    const hdg = (i * 17.0) % 360.0
    const alt = 8500.0 + (i % 8) * 400.0
    ac.push({
      icao24: `a${String(i).padStart(5, '0')}`,
      callsign: `FLT${100 + i}`,
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      altitude: alt,
      velocity: 220.0 + (i % 6) * 7.0,
      heading: hdg,
      origin_country: i % 3 === 0 ? 'United States' : i % 3 === 1 ? 'United Kingdom' : 'Germany',
    })
  }
  return ac
}

const DEFAULT_FALLBACK_SATELLITES = generateFallbackSatellites()
const DEFAULT_FALLBACK_AIRCRAFT = generateFallbackAircraft()

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
