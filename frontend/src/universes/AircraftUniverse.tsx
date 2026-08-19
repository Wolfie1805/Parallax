import { useRef, useMemo, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Html, useTexture } from '@react-three/drei'
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

function createPlaneBillboardGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(0.040, 0.040)
  return geom
}

function createHitboxGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.035, 8, 8)
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

// ── Animated Target Marker for Selected Aircraft ───────────────────────────
function SelectedAircraftMarker({ position, color }: { position: THREE.Vector3; color: string }) {
  const waveRef = useRef<THREE.Mesh>(null!)
  const reticleRef = useRef<THREE.Mesh>(null!)

  const quat = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize())
  }, [position])

  const groundPos = useMemo(() => position.clone().normalize().multiplyScalar(GLOBE_RADIUS), [position])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (waveRef.current) {
      const progress = (t * 2.0) % 1.0
      const scale = 1.0 + progress * 1.6
      const opacity = (1.0 - progress) * 0.9
      waveRef.current.scale.set(scale, scale, scale)
      ;(waveRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
    if (reticleRef.current) {
      reticleRef.current.rotation.z = -t * 2.2
    }
  })

  return (
    <group position={position}>
      {/* 1. Radar Pulse Wave */}
      <mesh ref={waveRef} quaternion={quat}>
        <ringGeometry args={[0.02, 0.036, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Tactical Reticle Ring */}
      <mesh ref={reticleRef} quaternion={quat}>
        <torusGeometry args={[0.034, 0.002, 8, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {/* 3. Altitude Drop Line to Surface */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), groundPos.clone().sub(position)]}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />
    </group>
  )
}

export function AircraftUniverse() {
  const aircraft = useUniverseStore((s) => s.aircraft)
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null!)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const planeTexture = useTexture('/textures/airplane_icon.png')
  planeTexture.colorSpace = THREE.SRGBColorSpace

  const count = aircraft.length
  const quadGeometry = useMemo(() => createPlaneBillboardGeometry(), [])
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

  const selectedPosInfo = useMemo(() => {
    if (!selectedEntity || selectedEntity.type !== 'aircraft' || !selectedEntity.data) return null
    const data = selectedEntity.data as any
    if (data.lat == null || data.lng == null) return null
    const r = GLOBE_RADIUS + scaleAltitude(data.altitude)
    const pos = latLngToVec3(data.lat, data.lng, r)
    const color = '#00b0ff'
    return { pos, color }
  }, [selectedEntity])

  useFrame(({ clock, camera }) => {
    if (!meshRef.current || count === 0) return
    const time = clock.getElapsedTime()

    aircraft.forEach((ac, i) => {
      const basePos = basePositions[i]
      const bob = Math.sin(time * 2.0 + i) * 0.001

      DUMMY.position.set(basePos.x + bob, basePos.y + bob, basePos.z + bob)
      
      // Face camera billboard orientation for 3D perspective aircraft icon
      DUMMY.quaternion.copy(camera.quaternion)

      // Hover scale pulse animation
      const isHovered = hoveredIdx === i
      const scale = isHovered ? 1.6 : 1.0
      DUMMY.scale.set(scale, scale, scale)
      DUMMY.updateMatrix()

      meshRef.current.setMatrixAt(i, DUMMY.matrix)
      if (hitboxMeshRef.current) hitboxMeshRef.current.setMatrixAt(i, DUMMY.matrix)

      const baseC = altColors[i] || COLOR_TMP.set('#00b0ff')
      if (isHovered) {
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
      {/* Uploaded Custom Airplane Icon Billboard Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[quadGeometry, undefined, count]}
      >
        <meshBasicMaterial
          map={planeTexture}
          transparent
          alphaTest={0.02}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Invisible Hitboxes for Raycasting */}
      <instancedMesh
        ref={hitboxMeshRef}
        args={[hitboxGeometry, undefined, count]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial visible={false} />
      </instancedMesh>

      {/* Altitude Flight Path Trails */}
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

      {/* Selection Marker */}
      {selectedPosInfo && (
        <SelectedAircraftMarker position={selectedPosInfo.pos} color={selectedPosInfo.color} />
      )}

      {/* Hover Halo */}
      {hoveredPos && !selectedPosInfo && (
        <mesh position={hoveredPos}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshBasicMaterial color="#00b0ff" transparent opacity={0.85} wireframe />
        </mesh>
      )}

      {/* Hover Info Tooltip */}
      {hoveredAc && hoveredPos && (
        <Html position={hoveredPos} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(3, 12, 24, 0.95)',
              border: '1px solid #00b0ff',
              borderRadius: 6,
              padding: '6px 12px',
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
