import { useUniverseStore, type UniverseType } from '../state/universeStore'

const UNIVERSE_CONFIG: { type: UniverseType; label: string; color: string }[] = [
  { type: 'satellite', label: 'SATELLITES', color: '#ff5722' },
  { type: 'aircraft', label: 'AIRCRAFT', color: '#00b0ff' },
  { type: 'weather', label: 'WEATHER', color: '#00e676' },
]

export function UniverseSwitchButton() {
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)
  const setActiveUniverse = useUniverseStore((s) => s.setActiveUniverse)
  const wsConnected = useUniverseStore((s) => s.wsConnected)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 1000,
        background: 'rgba(5, 8, 20, 0.75)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 40,
        padding: '6px 8px',
        backdropFilter: 'blur(12px)',
      }}
    >
      {UNIVERSE_CONFIG.map(({ type, label, color }) => {
        const isActive = activeUniverse === type
        return (
          <button
            key={type}
            onClick={() => setActiveUniverse(type)}
            style={{
              background: isActive ? color : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              border: isActive ? `1px solid ${color}` : '1px solid transparent',
              borderRadius: 30,
              padding: '8px 20px',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontWeight: 700,
              letterSpacing: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 0 16px ${color}66` : 'none',
            }}
          >
            {label}
          </button>
        )
      })}

      {/* WS connection indicator */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: -24,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: wsConnected ? '#4caf50' : '#f44336',
          boxShadow: wsConnected ? '0 0 6px #4caf50' : '0 0 6px #f44336',
        }}
        title={wsConnected ? 'Live data connected' : 'Reconnecting...'}
      />
    </div>
  )
}
