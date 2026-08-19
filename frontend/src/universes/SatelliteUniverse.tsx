import { useRef, useMemo, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Html, useTexture } from '@react-three/drei'
import { useUniverseStore } from '../state/universeStore'
import { latLngToVec3, GLOBE_RADIUS } from '../scenes/GlobeScene'

function scaleAltitude(altKm: number): number {
  const norm = Math.max(150, Math.min(altKm, 36000))
  return 0.06 + Math.log10(1 + norm / 300) * 0.14
}

export function getSatelliteCategoryInfo(name: string = '', noradId?: string) {
  const upper = name.toUpperCase()
  const norad = parseInt(noradId ?? '0', 10)

  // ── Space Stations ──────────────────────────────────────────────────────────
  if (upper.includes('ISS') || upper.includes('TIANGONG') || upper.includes('CSS') || upper.includes('STATION') || norad === 25544 || norad === 48274) {
    return { category: 'Space Station', color: '#ffd740', description: 'Crewed orbital research facility conducting microgravity science experiments.' }
  }

  // ── Mega-constellations ─────────────────────────────────────────────────────
  if (upper.includes('STARLINK')) {
    return { category: 'Starlink (SpaceX)', color: '#2979ff', description: 'SpaceX broadband internet constellation, providing global low-latency coverage.' }
  }
  if (upper.includes('ONEWEB')) {
    return { category: 'OneWeb', color: '#448aff', description: 'OneWeb LEO broadband satellite providing global internet access.' }
  }
  if (upper.includes('KUIPER')) {
    return { category: 'Amazon Kuiper', color: '#40c4ff', description: 'Amazon Project Kuiper broadband internet satellite.' }
  }

  // ── Navigation & GNSS ───────────────────────────────────────────────────────
  if (upper.includes('GPS') || upper.includes('NAVSTAR')) {
    return { category: 'GPS (USA)', color: '#00e5ff', description: 'U.S. Department of Defense GPS satellite providing precise positioning worldwide.' }
  }
  if (upper.includes('GLONASS')) {
    return { category: 'GLONASS (Russia)', color: '#00b8d4', description: 'Russian Global Navigation Satellite System providing precision location services.' }
  }
  if (upper.includes('GALILEO')) {
    return { category: 'Galileo (ESA)', color: '#18ffff', description: 'European civilian GNSS constellation providing high-accuracy positioning globally.' }
  }
  if (upper.includes('BEIDOU') || upper.includes('COMPASS')) {
    return { category: 'BeiDou (China)', color: '#80d8ff', description: 'China\'s BeiDou Navigation Satellite System, offering global coverage since 2020.' }
  }

  // ── Weather & Earth Observation ─────────────────────────────────────────────
  if (upper.includes('GOES') || upper.includes('METEOSAT') || upper.includes('NOAA') || upper.includes('SENTINEL')) {
    return { category: 'Weather & Earth Obs', color: '#00e676', description: 'Environmental monitoring satellite analyzing global climate & ocean patterns.' }
  }

  // ── Science & Research ──────────────────────────────────────────────────────
  if (upper.includes('HUBBLE') || upper.includes('HST') || upper.includes('CHANDRA') || upper.includes('SWIFT')) {
    return { category: 'Space Telescope', color: '#e040fb', description: 'Space observatory studying high-energy astronomical events and deep space.' }
  }

  return {
    category: 'Orbital Satellite',
    color: '#80d8ff',
    description: 'Active satellite in Earth orbit tracking global position.',
  }
}

function createPlaneBillboardGeometry(): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(0.045, 0.045)
  return geom
}

function createHitboxGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.038, 8, 8)
}

function buildSatelliteShortTrail(lat: number, lng: number, radius = 1.15): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 6; i++) {
    const step = (i / 6) * 0.12
    points.push(latLngToVec3(lat - step * 2.0, lng - step * 2.5, radius))
  }
  return points
}

const DUMMY = new THREE.Object3D()
const COLOR_TMP = new THREE.Color()

// ── Animated Selection Target Marker ─────────────────────────────────────────
function SelectedSatelliteMarker({ position, color }: { position: THREE.Vector3; color: string }) {
  const waveRef = useRef<THREE.Mesh>(null!)
  const reticleRef = useRef<THREE.Mesh>(null!)

  const quat = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize())
  }, [position])

  const groundPos = useMemo(() => position.clone().normalize().multiplyScalar(GLOBE_RADIUS), [position])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (waveRef.current) {
      const progress = (t * 1.8) % 1.0
      const scale = 1.0 + progress * 1.8
      const opacity = (1.0 - progress) * 0.95
      waveRef.current.scale.set(scale, scale, scale)
      ;(waveRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
    if (reticleRef.current) {
      reticleRef.current.rotation.z = t * 1.6
      reticleRef.current.rotation.y = t * 0.9
    }
  })

  return (
    <group position={position}>
      {/* 1. Radial Pulse Wave */}
      <mesh ref={waveRef} quaternion={quat}>
        <ringGeometry args={[0.02, 0.038, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Rotating Target Octahedron */}
      <mesh ref={reticleRef}>
        <octahedronGeometry args={[0.045, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.95} />
      </mesh>

      {/* 3. Orbit-to-Ground Laser Line */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), groundPos.clone().sub(position)]}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />
    </group>
  )
}

export function SatelliteUniverse() {
  const satellites = useUniverseStore((s) => s.satellites)
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null!)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const satTexture = useTexture('/textures/satellite_icon.png')
  satTexture.colorSpace = THREE.SRGBColorSpace

  const count = satellites.length
  const quadGeometry = useMemo(() => createPlaneBillboardGeometry(), [])
  const hitboxGeometry = useMemo(() => createHitboxGeometry(), [])

  const basePositions = useMemo(() => {
    return satellites.map((sat) => {
      const altKm = sat.altitude_km ?? 400
      const r = GLOBE_RADIUS + scaleAltitude(altKm)
      return latLngToVec3(sat.lat, sat.lng, r)
    })
  }, [satellites])

  const categoryColors = useMemo(() => {
    return satellites.map((sat) => {
      const info = getSatelliteCategoryInfo(sat.name)
      return new THREE.Color(info.color)
    })
  }, [satellites])

  const shortTrails = useMemo(() => {
    return satellites.slice(0, 50).map((sat) => {
      const altKm = sat.altitude_km ?? 400
      const r = GLOBE_RADIUS + scaleAltitude(altKm)
      return buildSatelliteShortTrail(sat.lat, sat.lng, r)
    })
  }, [satellites])

  const selectedPosInfo = useMemo(() => {
    if (!selectedEntity || selectedEntity.type !== 'satellite' || !selectedEntity.data) return null
    const data = selectedEntity.data as any
    if (data.lat == null || data.lng == null) return null
    const altKm = data.altitude_km ?? 400
    const r = GLOBE_RADIUS + scaleAltitude(altKm)
    const pos = latLngToVec3(data.lat, data.lng, r)
    const info = getSatelliteCategoryInfo(data.name)
    return { pos, color: info.color }
  }, [selectedEntity])

  useFrame(({ clock, camera }) => {
    if (!meshRef.current || count === 0) return
    const time = clock.getElapsedTime()

    satellites.forEach((sat, i) => {
      const basePos = basePositions[i]
      
      const swayOffset = Math.sin(time * 1.5 + i * 0.4) * 0.0015
      DUMMY.position.set(
        basePos.x + swayOffset,
        basePos.y + swayOffset,
        basePos.z + swayOffset
      )
      
      // Face camera billboard alignment
      DUMMY.quaternion.copy(camera.quaternion)

      // Hover scale pulse animation
      const isHovered = hoveredIdx === i
      const scale = isHovered ? 1.45 : 1.0
      DUMMY.scale.set(scale, scale, scale)
      DUMMY.updateMatrix()

      meshRef.current.setMatrixAt(i, DUMMY.matrix)
      if (hitboxMeshRef.current) hitboxMeshRef.current.setMatrixAt(i, DUMMY.matrix)

      const baseC = categoryColors[i] || COLOR_TMP.set('#ffffff')
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
    const sat = satellites[e.instanceId]
    if (!sat) return
    setSelectedEntity({ type: 'satellite', data: sat })
  }, [satellites, setSelectedEntity])

  if (count === 0) return null

  const hoveredSat = hoveredIdx != null ? satellites[hoveredIdx] : null
  const hoveredPos = hoveredIdx != null ? basePositions[hoveredIdx] : null
  const hoveredInfo = hoveredSat ? getSatelliteCategoryInfo(hoveredSat.name) : null

  return (
    <group>
      {/* Uploaded Custom Satellite Icon Billboard Instanced Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[quadGeometry, undefined, count]}
      >
        <meshBasicMaterial
          map={satTexture}
          transparent
          alphaTest={0.02}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Invisible Raycast Hitboxes for Effortless Selection */}
      <instancedMesh
        ref={hitboxMeshRef}
        args={[hitboxGeometry, undefined, count]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial visible={false} />
      </instancedMesh>

      {/* Short Orbital Motion Trails */}
      {shortTrails.map((pts, idx) => (
        <Line
          key={idx}
          points={pts}
          color="#00e5ff"
          lineWidth={1.0}
          transparent
          opacity={0.3}
        />
      ))}

      {/* Selection & Hover Markers */}
      {selectedPosInfo && (
        <SelectedSatelliteMarker position={selectedPosInfo.pos} color={selectedPosInfo.color} />
      )}

      {hoveredPos && !selectedPosInfo && (
        <mesh position={hoveredPos}>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshBasicMaterial color={hoveredInfo?.color || '#00e5ff'} transparent opacity={0.85} wireframe />
        </mesh>
      )}

      {/* Hover Info Tooltip */}
      {hoveredSat && hoveredPos && hoveredInfo && (
        <Html position={hoveredPos} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(3, 12, 24, 0.95)',
              border: `1px solid ${hoveredInfo.color}`,
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: `0 0 16px ${hoveredInfo.color}88`,
              userSelect: 'none',
            }}
          >
            🛰️ {hoveredSat.name || `SAT-${hoveredSat.norad_id}`}
            <span style={{ marginLeft: 8, fontSize: 10, color: hoveredInfo.color, fontWeight: 700 }}>
              [{hoveredInfo.category}]
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}
