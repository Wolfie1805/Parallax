import { useEffect, useRef } from 'react'
import { useUniverseStore } from '../state/universeStore'

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // Use relative WS route proxied by Vite, falling back to direct port 8000
  if (window.location.port === '5173' || window.location.port === '5174') {
    return `${protocol}//${window.location.hostname}:8000/ws`
  }
  return `${protocol}//${window.location.host}/ws`
}

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000

export function useWebSocket() {
  const setSatellites = useUniverseStore((s) => s.setSatellites)
  const setAircraft = useUniverseStore((s) => s.setAircraft)
  const setWsConnected = useUniverseStore((s) => s.setWsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const retryDelayRef = useRef(RECONNECT_BASE_MS)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    // ── 1. Immediate Initial REST Fetch (Instant 0ms Data Population) ────────
    fetch('/api/satellites')
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current && Array.isArray(data) && data.length > 0) {
          setSatellites(data)
        }
      })
      .catch((err) => console.warn('Initial satellite REST fetch warning:', err))

    fetch('/api/flights')
      .then((res) => res.json())
      .then((data) => {
        if (mountedRef.current && Array.isArray(data) && data.length > 0) {
          setAircraft(data)
        }
      })
      .catch((err) => console.warn('Initial aircraft REST fetch warning:', err))

    // ── 2. Live WebSocket Connection Loop ────────────────────────────────────
    function connect() {
      if (!mountedRef.current) return
      const wsUrl = getWsUrl()
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        retryDelayRef.current = RECONNECT_BASE_MS
        setWsConnected(true)
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
      wsRef.current?.close()
      setWsConnected(false)
    }
  }, [setSatellites, setAircraft, setWsConnected])
}
