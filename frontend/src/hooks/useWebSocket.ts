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

import initialTelemetry from '../data/initial_telemetry.json'

const DEFAULT_FALLBACK_SATELLITES = initialTelemetry.satellites
const DEFAULT_FALLBACK_AIRCRAFT = initialTelemetry.aircraft

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
