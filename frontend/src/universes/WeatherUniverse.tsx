import { useCallback, useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useUniverseStore } from '../state/universeStore'
import { latLngToVec3, vec3ToLatLng, GLOBE_RADIUS } from '../scenes/GlobeScene'

function mapWmoCode(code: number): string {
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

function roundNum(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

// Click Ripple Animation Component on Globe Surface
function SurfaceClickRipple({ position, onComplete }: { position: THREE.Vector3; onComplete: () => void }) {
  const ringRef = useRef<THREE.Mesh>(null!)
  const progressRef = useRef(0)

  useFrame((_, delta) => {
    progressRef.current += delta * 1.8
    const p = progressRef.current
    if (ringRef.current) {
      const s = 1.0 + p * 3.5
      ringRef.current.scale.set(s, s, s)
      const mat = ringRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1.0 - p)
    }
    if (p >= 1.0) onComplete()
  })

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.012, 0.024, 32]} />
        <meshBasicMaterial color="#00e676" transparent opacity={1.0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function WeatherUniverse() {
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  
  const [clickedPos, setClickedPos] = useState<THREE.Vector3 | null>(null)
  const [clickedLabel, setClickedLabel] = useState<string | null>(null)
  const [ripples, setRipples] = useState<{ id: number; pos: THREE.Vector3 }[]>([])
  const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null)

  // 100% Precise Local Coordinate Raycast Alignment
  const handleGlobeClick = useCallback(
    async (e: any) => {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
      if (!e.point || !e.object) return

      // Transform world hit point to local Earth coordinate frame
      const localPoint = e.object.worldToLocal(e.point.clone()).normalize()
      const { lat, lng } = vec3ToLatLng(localPoint)

      const localPos = latLngToVec3(lat, lng, GLOBE_RADIUS + 0.018)
      setClickedPos(localPos)

      // Add ripple animation in local Earth frame
      const rippleId = Date.now()
      setRipples((prev) => [...prev, { id: rippleId, pos: localPos }])

      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=temperature_2m,wind_speed_10m,weather_code`
        const weatherRes = await fetch(weatherUrl)
        const weatherData = await weatherRes.json()

        let locationName = `${lat >= 0 ? lat.toFixed(1) + '°N' : Math.abs(lat).toFixed(1) + '°S'}, ${lng >= 0 ? lng.toFixed(1) + '°E' : Math.abs(lng).toFixed(1) + '°W'}`
        let stateStr = ''
        let countryStr = ''

        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&localityLanguage=en`
          )
          const geoData = await geoRes.json()
          const cityStr = geoData.city || geoData.locality
          stateStr = geoData.principalSubdivision || ''
          countryStr = geoData.countryName || ''

          if (cityStr && countryStr) locationName = `${cityStr}, ${countryStr}`
          else if (countryStr) locationName = `${countryStr} (${locationName})`
        } catch {
          // Fallback to coordinates
        }

        setClickedLabel(locationName)

        const current = weatherData.current || {}
        setSelectedEntity({
          type: 'weather',
          data: {
            name: locationName,
            city_name: locationName,
            state: stateStr || undefined,
            country: countryStr || undefined,
            temperature_c: current.temperature_2m ?? '—',
            wind_speed_kmh: current.wind_speed_10m ?? '—',
            condition: mapWmoCode(current.weather_code ?? 0),
            lat: roundNum(lat, 2),
            lng: roundNum(lng, 2),
          },
        })
      } catch (err) {
        console.error('Globe click weather error:', err)
      }
    },
    [setSelectedEntity]
  )

  const handlePointerMove = useCallback((e: any) => {
    if (e.point && e.object) {
      const localPoint = e.object.worldToLocal(e.point.clone()).normalize()
      const { lat, lng } = vec3ToLatLng(localPoint)
      setCursorPos(latLngToVec3(lat, lng, GLOBE_RADIUS + 0.010))
    }
  }, [])

  return (
    <group>
      {/* Invisible Raycast Target Sphere */}
      <mesh
        onClick={handleGlobeClick}
        onPointerMove={handlePointerMove}
        onPointerOver={() => (document.body.style.cursor = 'crosshair')}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
          setCursorPos(null)
        }}
      >
        <sphereGeometry args={[1.008, 64, 64]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Surface Cursor Crosshair Affordance */}
      {cursorPos && (
        <mesh position={cursorPos}>
          <ringGeometry args={[0.012, 0.018, 16]} />
          <meshBasicMaterial color="#00e676" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Surface Click Ripple Animations */}
      {ripples.map((r) => (
        <SurfaceClickRipple
          key={r.id}
          position={r.pos}
          onComplete={() => setRipples((prev) => prev.filter((item) => item.id !== r.id))}
        />
      ))}

      {/* Selected Weather Location Marker */}
      {clickedPos && (
        <group position={clickedPos}>
          <mesh>
            <sphereGeometry args={[0.024, 16, 16]} />
            <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={2.0} />
          </mesh>
          {clickedLabel && (
            <Html position={[0, 0.04, 0]} center style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  background: 'rgba(3, 14, 28, 0.95)',
                  border: '1px solid #00e676',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 16px rgba(0, 230, 118, 0.6)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                📍 {clickedLabel}
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  )
}
