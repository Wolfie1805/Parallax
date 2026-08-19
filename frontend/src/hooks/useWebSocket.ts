import { useEffect, useRef } from 'react'
import { useUniverseStore } from '../state/universeStore'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'
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

    function connect() {
      if (!mountedRef.current) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        retryDelayRef.current = RECONNECT_BASE_MS
        setWsConnected(true)
      }

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.universe === 'satellite') setSatellites(msg.data)
          else if (msg.universe === 'aircraft') setAircraft(msg.data)
        } catch {
          // malformed message — ignore
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        if (!mountedRef.current) return
        // Exponential backoff reconnect
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
  }, [])
}
