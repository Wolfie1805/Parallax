import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useUniverseStore } from '../state/universeStore'
import type { UniverseType } from '../state/universeStore'

const PLACEHOLDERS: Record<UniverseType, string> = {
  satellite: 'Search satellite name or NORAD ID...',
  aircraft: 'Search callsign or country...',
  weather: 'Search any city, state or country worldwide...',
}

// ── Open-Meteo Geocoding Result Type ────────────────────────────────────────
interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  country_code: string
  admin1?: string   // state / province
  admin2?: string   // district
  population?: number
}

export function SearchBar() {
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)
  const satellites = useUniverseStore((s) => s.satellites)
  const aircraft = useUniverseStore((s) => s.aircraft)
  const cities = useUniverseStore((s) => s.cities)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null!)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset query on universe change
  useEffect(() => {
    setQuery('')
    setIsOpen(false)
    setGeoResults([])
  }, [activeUniverse])

  // Live Open-Meteo geocoding search for weather universe
  const fetchGeoResults = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setGeoResults([])
      setGeoLoading(false)
      return
    }
    setGeoLoading(true)
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=10&language=en&format=json`
      const res = await fetch(url)
      const data = await res.json()
      setGeoResults(data.results ?? [])
    } catch {
      setGeoResults([])
    } finally {
      setGeoLoading(false)
    }
  }, [])

  // Debounced input handler
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setIsOpen(true)
    if (activeUniverse === 'weather') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchGeoResults(value), 300)
    }
  }, [activeUniverse, fetchGeoResults])

  // Contextual search results matching query
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    if (activeUniverse === 'satellite') {
      return satellites
        .filter((s) => (s.name || '').toLowerCase().includes(q) || (s.norad_id || '').includes(q))
        .slice(0, 8)
        .map((s) => ({
          id: s.norad_id,
          title: s.name || `SAT-${s.norad_id}`,
          subtitle: `${s.altitude_km?.toFixed(0) ?? '—'} km altitude`,
          raw: s,
          type: 'satellite' as UniverseType,
        }))
    }

    if (activeUniverse === 'aircraft') {
      return aircraft
        .filter((a) => (a.callsign || '').toLowerCase().includes(q) || (a.icao24 || '').toLowerCase().includes(q) || (a.origin_country || '').toLowerCase().includes(q))
        .slice(0, 8)
        .map((a) => ({
          id: a.icao24,
          title: a.callsign || a.icao24,
          subtitle: a.origin_country || 'Commercial Aircraft',
          raw: a,
          type: 'aircraft' as UniverseType,
        }))
    }

    if (activeUniverse === 'weather') {
      // Weather results come from live geocoding API (geoResults), not local cities list
      return geoResults.map((g) => ({
        id: String(g.id),
        title: g.name,
        subtitle: [g.admin1, g.country].filter(Boolean).join(', '),
        lat: g.latitude,
        lng: g.longitude,
        population: g.population,
        country: g.country,
        admin1: g.admin1,
        type: 'weather' as UniverseType,
      }))
    }

    return []
  }, [query, activeUniverse, satellites, aircraft, geoResults])

  // When a weather geo result is selected, fetch live weather from Open-Meteo
  const handleSelectGeoWeather = useCallback(async (item: any) => {
    setQuery(item.title)
    setIsOpen(false)
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${item.lat}&longitude=${item.lng}&current=temperature_2m,wind_speed_10m,weather_code`
      const res = await fetch(weatherUrl)
      const data = await res.json()
      const current = data.current || {}

      const mapWmoCode = (code: number) => {
        if (code === 0) return 'Clear sky'
        if (code <= 3) return 'Partly cloudy'
        if (code <= 48) return 'Foggy'
        if (code <= 57) return 'Drizzle'
        if (code <= 67) return 'Rain'
        if (code <= 77) return 'Snow fall'
        if (code <= 82) return 'Rain showers'
        if (code <= 86) return 'Snow showers'
        return 'Thunderstorm'
      }

      const locationLabel = item.admin1
        ? `${item.title}, ${item.admin1}, ${item.country}`
        : `${item.title}, ${item.country}`

      setSelectedEntity({
        type: 'weather',
        data: {
          name: locationLabel,
          city_name: locationLabel,
          state: item.admin1 || undefined,
          country: item.country || undefined,
          temperature_c: current.temperature_2m ?? '—',
          wind_speed_kmh: current.wind_speed_10m ?? '—',
          condition: mapWmoCode(current.weather_code ?? 0),
          lat: item.lat,
          lng: item.lng,
        },
      })
    } catch (err) {
      console.error('Weather fetch error:', err)
    }
  }, [setSelectedEntity])

  const handleSelect = (item: any) => {
    if (activeUniverse === 'weather') {
      handleSelectGeoWeather(item)
    } else {
      setSelectedEntity({ type: item.type, data: item.raw })
      setQuery(item.title)
      setIsOpen(false)
    }
  }

  // Visible results: for weather show geoResults-derived, for others show local filter
  const visibleResults = activeUniverse === 'weather' ? results : results

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 'clamp(12px, 2.5vh, 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'clamp(180px, 45vw, 360px)',
        maxWidth: 'calc(100vw - 120px)',
        zIndex: 1000,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {/* Search Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(8, 14, 28, 0.85)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 24,
          padding: '8px 16px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.15)',
        }}
      >
        <span style={{ fontSize: 13, color: '#00e5ff', opacity: 0.8 }}>
          {geoLoading ? '⏳' : '🔍'}
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={PLACEHOLDERS[activeUniverse]}
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: 12,
            width: '100%',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              setGeoResults([])
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Holographic Autocomplete Dropdown */}
      {isOpen && visibleResults.length > 0 && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(8, 14, 28, 0.92)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: 12,
            padding: '6px 0',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {visibleResults.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
              <div style={{ fontSize: 10, color: '#80deea', opacity: 0.8 }}>{item.subtitle}</div>
            </div>
          ))}
        </div>
      )}

      {/* No results hint for weather when loading */}
      {isOpen && activeUniverse === 'weather' && query.length >= 2 && !geoLoading && geoResults.length === 0 && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(8, 14, 28, 0.92)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            backdropFilter: 'blur(20px)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
          }}
        >
          No locations found for "{query}"
        </div>
      )}
    </div>
  )
}
