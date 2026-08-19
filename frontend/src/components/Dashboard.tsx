import { useState, useEffect } from 'react'
import { useUniverseStore } from '../state/universeStore'

function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return width
}

export function Dashboard() {
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)
  const satellites = useUniverseStore((s) => s.satellites)
  const aircraft = useUniverseStore((s) => s.aircraft)
  const cities = useUniverseStore((s) => s.cities)
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const wsConnected = useUniverseStore((s) => s.wsConnected)

  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 768
  const isTablet = windowWidth >= 768 && windowWidth < 1024

  // Mobile active subpanel tab
  const [mobileTab, setMobileTab] = useState<'metrics' | 'items'>('metrics')

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
          top: 'clamp(12px, 2.5vh, 24px)',
          right: 'clamp(12px, 2.5vw, 28px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(8, 14, 28, 0.85)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 20,
          padding: '3px 4px',
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
            fontSize: 'clamp(9px, 1.8vw, 10px)',
            letterSpacing: '0.12em',
            padding: '4px 10px',
            borderRadius: 14,
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          GLOBE
        </button>
        <button
          onClick={toggleMode}
          style={{
            background: mode === 'dashboard' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
            border: 'none',
            color: mode === 'dashboard' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
            fontSize: 'clamp(9px, 1.8vw, 10px)',
            letterSpacing: '0.12em',
            padding: '4px 10px',
            borderRadius: 14,
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
        >
          PANELS
        </button>
      </div>

      {/* Dashboard Mode Side Panels */}
      {mode === 'dashboard' && (
        <>
          {/* Mobile subpanel switcher bar */}
          {isMobile && !selectedEntity && (
            <div
              style={{
                position: 'fixed',
                top: 60,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 950,
                display: 'flex',
                gap: 6,
                background: 'rgba(8, 14, 28, 0.9)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: 16,
                padding: '3px 6px',
                backdropFilter: 'blur(16px)',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              <button
                onClick={() => setMobileTab('metrics')}
                style={{
                  background: mobileTab === 'metrics' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: mobileTab === 'metrics' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                METRICS
              </button>
              <button
                onClick={() => setMobileTab('items')}
                style={{
                  background: mobileTab === 'items' ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                  color: mobileTab === 'items' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                ITEMS ({activeCount})
              </button>
            </div>
          )}

          {/* Left Telemetry Panel */}
          {(!isMobile || mobileTab === 'metrics') && (
            <div
              style={{
                position: 'fixed',
                top: isMobile ? 96 : 80,
                left: isMobile ? 12 : isTablet ? 16 : 28,
                width: isMobile ? 'calc(100vw - 24px)' : isTablet ? 200 : 240,
                background: 'rgba(8, 14, 28, 0.88)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: 12,
                padding: isMobile ? '12px 14px' : '18px 20px',
                backdropFilter: 'blur(16px)',
                fontFamily: '"JetBrains Mono", monospace',
                color: '#ffffff',
                zIndex: 900,
                userSelect: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#00e5ff', marginBottom: isMobile ? 8 : 14, fontWeight: 700 }}>
                SYSTEM METRICS
              </div>

              <div style={{ display: isMobile ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 8 : 0 }}>
                <Metric label="ACTIVE UNIVERSE" value={activeUniverse.toUpperCase()} color="#00e5ff" />
                <Metric label="TRACKED OBJECTS" value={String(activeCount)} color="#00e676" />
                <Metric label="WEBSOCKET PIPE" value={wsConnected ? 'CONNECTED' : 'RECONNECTING…'} color={wsConnected ? '#00e676' : '#ff9100'} />
                <Metric label="REFRESH TIME" value={new Date().toLocaleTimeString()} color="#80deea" />
              </div>
            </div>
          )}

          {/* Right Scrollable Object List Panel */}
          {(!isMobile || mobileTab === 'items') && !selectedEntity && (
            <div
              style={{
                position: 'fixed',
                top: isMobile ? 96 : 80,
                right: isMobile ? 12 : isTablet ? 16 : 28,
                width: isMobile ? 'calc(100vw - 24px)' : isTablet ? 220 : 260,
                maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 120px)',
                background: 'rgba(8, 14, 28, 0.88)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: 12,
                padding: '14px 0',
                backdropFilter: 'blur(16px)',
                fontFamily: '"JetBrains Mono", monospace',
                color: '#ffffff',
                zIndex: 900,
                display: 'flex',
                flexDirection: 'column',
                userSelect: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#00e5ff', padding: '0 16px 10px', fontWeight: 700 }}>
                VISIBLE ITEMS ({activeCount})
              </div>
              <div style={{ height: 1, background: 'rgba(0, 229, 255, 0.15)', marginBottom: 8 }} />

              <div style={{ overflowY: 'auto', flex: 1, padding: '0 10px' }}>
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
