import { useEffect, useState } from 'react'
import { GlobeScene } from './scenes/GlobeScene'
import { LandingScene } from './scenes/LandingScene'
import { SatelliteUniverse } from './universes/SatelliteUniverse'
import { AircraftUniverse } from './universes/AircraftUniverse'
import { WeatherUniverse } from './universes/WeatherUniverse'
import { DetailCard } from './components/DetailCard'
import { UniverseSwitchButton } from './components/UniverseSwitchButton'
import { SearchBar } from './components/SearchBar'
import { Dashboard } from './components/Dashboard'
import { useWebSocket } from './hooks/useWebSocket'
import { useUniverseStore } from './state/universeStore'

type AppStage = 'splash' | 'landing' | 'globe'

// ── High-Tech Attractive PARALLAX Intro Splash Screen Component ──────────────
function SplashIntro({ onFinish }: { onFinish: () => void }) {
  const [typedText, setTypedText] = useState('')
  const [fadingOut, setFadingOut] = useState(false)
  const fullText = 'PARALLAX'

  useEffect(() => {
    let charIdx = 0
    const interval = setInterval(() => {
      charIdx++
      setTypedText(fullText.slice(0, charIdx))

      if (charIdx >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => {
          setFadingOut(true)
          setTimeout(onFinish, 600) // Fast 0.6s fade to landing page
        }, 900)
      }
    }, 90)

    return () => clearInterval(interval)
  }, [onFinish])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'radial-gradient(circle at 50% 50%, #030a1c 0%, #000510 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: fadingOut ? 'none' : 'auto',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Background Holographic Scan Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(0, 229, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Styled High-Tech Headline */}
      <div
        style={{
          fontFamily: '"Syne", "Inter", sans-serif',
          fontWeight: 800,
          fontSize: 54,
          letterSpacing: '0.4em',
          background: 'linear-gradient(135deg, #ffffff 0%, #00e5ff 60%, #7c4dff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 24px rgba(0, 229, 255, 0.7))',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        {typedText}
        {typedText.length < fullText.length && (
          <span style={{ color: '#00e5ff', WebkitTextFillColor: '#00e5ff', animation: 'blink 0.8s step-end infinite' }}>|</span>
        )}
      </div>

      {/* Subtitle tag */}
      <div
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: '0.3em',
          color: 'rgba(0, 229, 255, 0.75)',
          background: 'rgba(0, 229, 255, 0.06)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: 20,
          padding: '4px 16px',
          textTransform: 'uppercase',
          boxShadow: '0 0 16px rgba(0, 229, 255, 0.2)',
          opacity: typedText.length >= 4 ? 1 : 0,
          transform: typedText.length >= 4 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.4s ease',
        }}
      >
        3D PLANETARY TELEMETRY NETWORK
      </div>
    </div>
  )
}

function GlobeApp() {
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)
  const setCities = useUniverseStore((s) => s.setCities)

  // Start WebSocket connection
  useWebSocket()

  // Fetch city list once on mount
  useEffect(() => {
    fetch('/api/weather/cities')
      .then((r) => r.json())
      .then(setCities)
      .catch(console.error)
  }, [setCities])

  return (
    <>
      <GlobeScene interactive={true}>
        {activeUniverse === 'satellite' && <SatelliteUniverse />}
        {activeUniverse === 'aircraft' && <AircraftUniverse />}
        {activeUniverse === 'weather' && <WeatherUniverse />}
      </GlobeScene>

      {/* UI overlays */}
      <SearchBar />
      <Dashboard />
      <UniverseSwitchButton />
      <DetailCard />

      {/* Universe brand header */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          userSelect: 'none',
          zIndex: 100,
        }}
      >
        <span
          style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.25em',
            color: '#ffffff',
          }}
        >
          PARALLAX
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'rgba(0, 229, 255, 0.7)',
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: 4,
            padding: '2px 8px',
            textTransform: 'uppercase',
          }}
        >
          3D TELEMETRY
        </span>
      </div>
    </>
  )
}

export default function App() {
  const [stage, setStage] = useState<AppStage>('splash')

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000510' }}>
      {stage === 'splash' && <SplashIntro onFinish={() => setStage('landing')} />}
      {stage === 'landing' && <LandingScene onStart={() => setStage('globe')} />}
      {stage === 'globe' && <GlobeApp />}
    </div>
  )
}
