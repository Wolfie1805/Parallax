import { useState, useEffect } from 'react'
import { useUniverseStore } from '../state/universeStore'

export function Dashboard() {
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)
  const satellites = useUniverseStore((s) => s.satellites)
  const aircraft = useUniverseStore((s) => s.aircraft)
  const cities = useUniverseStore((s) => s.cities)
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const wsConnected = useUniverseStore((s) => s.wsConnected)

  // Persist dashboard mode setting in localStorage
  const [mode, setMode] = useState<'minimal' | 'dashboard'>(() => {
    return (localStorage.getItem('parallax_mode') as 'minimal' | 'dashboard') || 'minimal'
  })

  useEffect(() => {
    localStorage.setItem('parallax_mode', mode)
  }, [mode])

  const toggleMode = () => {
    setMode((prev) => (prev === 'minimal' ? 'dashboard' : 'minimal'))
  }

  const activeCount =
    activeUniverse === 'satellite'
      ? satellites.length
      : activeUniverse === 'aircraft'
      ? aircraft.length
      : cities.length

  return (
    <>
      {/* Top-Right Mode Toggle Control */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          right: 28,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(8, 14, 28, 0.85)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 20,
          padding: '4px 6px',
          backdropFilter: 'blur(16px)',
          fontFamily: '"JetBrains Mono", monospace',
          userSelect: 'none',
        }}
      >
        <button
          onClick={toggleMode}
          style={{
            background: mode === 'minimal' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            border: 'none',
            color: mode === 'minimal' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: 10,
            letterSpacing: '0.12em',
            padding: '5px 12px',
            borderRadius: 14,
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          GLOBE ONLY
        </button>
        <button
          onClick={toggleMode}
          style={{
            background: mode === 'dashboard' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            border: 'none',
            color: mode === 'dashboard' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: 10,
            letterSpacing: '0.12em',
            padding: '5px 12px',
            borderRadius: 14,
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          DASHBOARD
        </button>
      </div>

      {/* Dashboard Mode Side Panels */}
      {mode === 'dashboard' && (
        <>
          {/* Left Telemetry Panel */}
          <div
            style={{
              position: 'fixed',
              top: 80,
              left: 28,
              width: 240,
              background: 'rgba(8, 14, 28, 0.88)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: 12,
              padding: '18px 20px',
              backdropFilter: 'blur(16px)',
              fontFamily: '"JetBrains Mono", monospace',
              color: '#ffffff',
              zIndex: 900,
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#00e5ff', marginBottom: 14, fontWeight: 700 }}>
              SYSTEM METRICS
            </div>

            <Metric label="ACTIVE UNIVERSE" value={activeUniverse.toUpperCase()} color="#00e5ff" />
            <Metric label="TRACKED OBJECTS" value={String(activeCount)} color="#00e676" />
            <Metric label="WEBSOCKET PIPE" value={wsConnected ? 'CONNECTED (1.5s)' : 'RECONNECTING…'} color={wsConnected ? '#00e676' : '#ff9100'} />
            <Metric label="REFRESH TIME" value={new Date().toLocaleTimeString()} color="#80deea" />
          </div>

          {/* Right Scrollable Object List Panel (Does not obscure detail card) */}
          {!selectedEntity && (
            <div
              style={{
                position: 'fixed',
                top: 80,
                right: 28,
                width: 260,
                maxHeight: 'calc(100vh - 120px)',
                background: 'rgba(8, 14, 28, 0.88)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: 12,
                padding: '16px 0',
                backdropFilter: 'blur(16px)',
                fontFamily: '"JetBrains Mono", monospace',
                color: '#ffffff',
                zIndex: 900,
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#00e5ff', padding: '0 18px 12px', fontWeight: 700 }}>
                VISIBLE ITEMS ({activeCount})
              </div>
              <div style={{ height: 1, background: 'rgba(0, 229, 255, 0.15)', marginBottom: 8 }} />

              <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px' }}>
                {activeUniverse === 'satellite' &&
                  satellites.slice(0, 30).map((sat) => (
                    <ItemRow
                      key={sat.norad_id}
                      title={sat.name || `SAT-${sat.norad_id}`}
                      subtitle={`${sat.altitude_km?.toFixed(0) ?? '—'} km`}
                      onClick={() => setSelectedEntity({ type: 'satellite', data: sat })}
                    />
                  ))}

                {activeUniverse === 'aircraft' &&
                  aircraft.slice(0, 30).map((ac) => (
                    <ItemRow
                      key={ac.icao24}
                      title={ac.callsign || ac.icao24}
                      subtitle={ac.origin_country || 'Aircraft'}
                      onClick={() => setSelectedEntity({ type: 'aircraft', data: ac })}
                    />
                  ))}

                {activeUniverse === 'weather' &&
                  cities.map((city) => (
                    <ItemRow
                      key={city.id ?? city.name}
                      title={city.name}
                      subtitle={city.country || 'Station'}
                      onClick={() => setSelectedEntity({ type: 'weather', data: city })}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: '0.15em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function ItemRow({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '7px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        marginBottom: 4,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#ffffff' }}>{title}</div>
      <div style={{ fontSize: 9, color: '#80deea', opacity: 0.75 }}>{subtitle}</div>
    </div>
  )
}
