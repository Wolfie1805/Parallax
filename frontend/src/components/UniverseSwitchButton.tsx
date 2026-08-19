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
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 'clamp(4px, 1.5vw, 8px)',
        zIndex: 1000,
        background: 'rgba(5, 8, 20, 0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 40,
        padding: '4px 6px',
        backdropFilter: 'blur(16px)',
        maxWidth: 'calc(100vw - 24px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
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
              color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              border: isActive ? `1px solid ${color}` : '1px solid transparent',
              borderRadius: 30,
              padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2.5vw, 20px)',
              fontSize: 'clamp(9px, 1.8vw, 11px)',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontWeight: 700,
              letterSpacing: 'clamp(1px, 0.3vw, 2px)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 0 16px ${color}66` : 'none',
              whiteSpace: 'nowrap',
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
          right: -16,
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
