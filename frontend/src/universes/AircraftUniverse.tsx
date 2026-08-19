import { useRef, useMemo, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Html } from '@react-three/drei'
import { useUniverseStore } from '../state/universeStore'
import { latLngToVec3, GLOBE_RADIUS } from '../scenes/GlobeScene'

function scaleAltitude(altMeters: number | null): number {
  const m = Math.max(0, Math.min(altMeters ?? 10000, 15000))
  return 0.02 + (m / 15000) * 0.05
}

function getAltitudeColor(altMeters: number | null): THREE.Color {
  const alt = altMeters ?? 8000
  if (alt > 10000) return new THREE.Color('#00b0ff') // Azure high altitude
  if (alt > 5000) return new THREE.Color('#00e5ff')  // Cyan medium altitude
  return new THREE.Color('#ffd740')                  // Gold low altitude
}

// ── Refined Sleek 3D Aircraft Chevron Geometry (Small Visual Size) ────────────
function createRefinedAircraftGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.012)        // Nose tip
  shape.lineTo(0.007, -0.008)   // Right wingtip
  shape.lineTo(0.002, -0.005)   // Right body notch
  shape.lineTo(0, -0.010)       // Tail center
  shape.lineTo(-0.002, -0.005)  // Left body notch
  shape.lineTo(-0.007, -0.008)  // Left wingtip
  shape.closePath()

  const extrudeSettings = { depth: 0.003, bevelEnabled: false }
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geom.rotateX(Math.PI / 2) // Orient flat to flight direction
  return geom
}

// Invisible Large Raycast Hitbox Geometry for Effortless Clicking
function createHitboxGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.032, 8, 8)
}

function buildFlightTrail(lat: number, lng: number, heading: number | null, radius: number): THREE.Vector3[] {
  const hdgRad = ((heading ?? 0) * Math.PI) / 180
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 6; i++) {
    const step = (i / 6) * 0.08
    const trailLat = lat - Math.cos(hdgRad) * step * 1.5
    const trailLng = lng - Math.sin(hdgRad) * step * 1.5
    points.push(latLngToVec3(trailLat, trailLng, radius))
  }
  return points
}

const DUMMY = new THREE.Object3D()
const COLOR_TMP = new THREE.Color()

export function AircraftUniverse() {
  const aircraft = useUniverseStore((s) => s.aircraft)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null!)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const count = aircraft.length
  const aircraftGeom = useMemo(() => createRefinedAircraftGeometry(), [])
  const hitboxGeometry = useMemo(() => createHitboxGeometry(), [])

  const basePositions = useMemo(() => {
    return aircraft.map((ac) => {
      const r = GLOBE_RADIUS + scaleAltitude(ac.altitude)
      return latLngToVec3(ac.lat, ac.lng, r)
    })
  }, [aircraft])

  const altColors = useMemo(() => {
    return aircraft.map((ac) => getAltitudeColor(ac.altitude))
  }, [aircraft])

  const flightTrails = useMemo(() => {
    return aircraft.slice(0, 50).map((ac) => {
      const r = GLOBE_RADIUS + scaleAltitude(ac.altitude)
      return buildFlightTrail(ac.lat, ac.lng, ac.heading, r)
    })
  }, [aircraft])

  useFrame(({ clock }) => {
    if (!meshRef.current || count === 0) return
    const time = clock.getElapsedTime()

    aircraft.forEach((ac, i) => {
      const basePos = basePositions[i]
      const hdgRad = ((ac.heading ?? 0) * Math.PI) / 180

      // Micro-bobbing & heading roll
      const bob = Math.sin(time * 2.5 + i) * 0.001
      DUMMY.position.set(basePos.x + bob, basePos.y + bob, basePos.z + bob)
      DUMMY.rotation.set(0, -hdgRad, 0)
      DUMMY.updateMatrix()

      meshRef.current.setMatrixAt(i, DUMMY.matrix)
      if (hitboxMeshRef.current) hitboxMeshRef.current.setMatrixAt(i, DUMMY.matrix)

      const baseC = altColors[i] || COLOR_TMP.set('#00b0ff')
      if (hoveredIdx === i) {
        meshRef.current.setColorAt(i, COLOR_TMP.set('#ffffff'))
      } else {
        meshRef.current.setColorAt(i, baseC)
      }
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    if (hitboxMeshRef.current) hitboxMeshRef.current.instanceMatrix.needsUpdate = true
  })

  const handlePointerMove = useCallback((e: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    if (e.instanceId != null) {
      setHoveredIdx(e.instanceId)
      document.body.style.cursor = 'pointer'
    } else {
      setHoveredIdx(null)
      document.body.style.cursor = 'default'
    }
  }, [])

  const handlePointerOut = useCallback(() => {
    setHoveredIdx(null)
    document.body.style.cursor = 'default'
  }, [])

  const handleClick = useCallback((e: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    if (e.instanceId == null) return
    const ac = aircraft[e.instanceId]
    if (!ac) return
    setSelectedEntity({ type: 'aircraft', data: ac })
  }, [aircraft, setSelectedEntity])

  if (count === 0) return null

  const hoveredAc = hoveredIdx != null ? aircraft[hoveredIdx] : null
  const hoveredPos = hoveredIdx != null ? basePositions[hoveredIdx] : null

  return (
    <group>
      {/* Refined Small 3D Aircraft Chevron Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[aircraftGeom, undefined, count]}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.15}
          metalness={0.85}
          emissive="#00b0ff"
          emissiveIntensity={2.8}
        />
      </instancedMesh>

      {/* Large Invisible Hitbox Mesh for Effortless Clicking */}
      <instancedMesh
        ref={hitboxMeshRef}
        args={[hitboxGeometry, undefined, count]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial visible={false} />
      </instancedMesh>

      {/* Altitude-Colored Directional Flight Trails */}
      {flightTrails.map((pts, idx) => (
        <Line
          key={idx}
          points={pts}
          color="#00b0ff"
          lineWidth={1.0}
          transparent
          opacity={0.35}
        />
      ))}

      {/* Hover Ring Halo */}
      {hoveredPos && (
        <mesh position={hoveredPos}>
          <sphereGeometry args={[0.032, 16, 16]} />
          <meshBasicMaterial color="#00b0ff" transparent opacity={0.85} wireframe />
        </mesh>
      )}

      {/* Hover Tooltip Tag */}
      {hoveredAc && hoveredPos && (
        <Html position={hoveredPos} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(3, 12, 24, 0.95)',
              border: '1px solid #00b0ff',
              borderRadius: 6,
              padding: '5px 10px',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 0 16px rgba(0, 176, 255, 0.6)',
              userSelect: 'none',
            }}
          >
            ✈️ {hoveredAc.callsign || hoveredAc.icao24}
            <span style={{ marginLeft: 8, fontSize: 10, color: '#00b0ff', fontWeight: 700 }}>
              [{hoveredAc.origin_country || 'Aircraft'}]
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}
