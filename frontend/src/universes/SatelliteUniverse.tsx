import { useRef, useMemo, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Html } from '@react-three/drei'
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
  if (upper.includes('QZSS') || upper.includes('MICHIBIKI')) {
    return { category: 'QZSS (Japan)', color: '#40c4ff', description: 'Japan\'s Quasi-Zenith Satellite System augmenting GPS accuracy over East Asia.' }
  }

  // ── Weather & Earth Observation ─────────────────────────────────────────────
  if (upper.includes('GOES')) {
    return { category: 'GOES (NOAA)', color: '#00e676', description: 'NOAA Geostationary Operational Environmental Satellite monitoring US weather.' }
  }
  if (upper.includes('METEOSAT')) {
    return { category: 'Meteosat (EUMETSAT)', color: '#69f0ae', description: 'European geostationary weather satellite monitoring Europe, Africa and Atlantic.' }
  }
  if (upper.includes('NOAA') || upper.includes('TIROS')) {
    return { category: 'NOAA Weather', color: '#00e676', description: 'NOAA polar-orbiting satellite collecting global atmospheric and ocean data.' }
  }
  if (upper.includes('SUOMI') || upper.includes('SNPP') || upper.includes('JPSS')) {
    return { category: 'JPSS (NOAA/NASA)', color: '#1de9b6', description: 'Joint Polar Satellite System for advanced weather forecasting and climate monitoring.' }
  }
  if (upper.includes('TERRA') || upper.includes('AQUA') || upper.includes('AURA')) {
    return { category: 'Earth Science (NASA)', color: '#00bfa5', description: 'NASA Earth Observing System satellite monitoring land, ocean, and atmosphere.' }
  }
  if (upper.includes('SENTINEL')) {
    return { category: 'Sentinel (ESA)', color: '#64ffda', description: 'ESA Copernicus Sentinel satellite for Earth observation and environmental monitoring.' }
  }
  if (upper.includes('LANDSAT')) {
    return { category: 'Landsat (USGS/NASA)', color: '#1de9b6', description: 'USGS/NASA Landsat satellite providing multispectral imagery of Earth\'s surface.' }
  }
  if (upper.includes('MODIS') || upper.includes('VIIRS')) {
    return { category: 'Earth Observation', color: '#00e676', description: 'Remote sensing satellite collecting multi-spectral data for climate science.' }
  }

  // ── Communications ──────────────────────────────────────────────────────────
  if (upper.includes('INTELSAT')) {
    return { category: 'Intelsat (Commercial)', color: '#ff6d00', description: 'Intelsat commercial GEO satellite providing broadcast and broadband services.' }
  }
  if (upper.includes('SES-') || upper.includes('SES ')) {
    return { category: 'SES (Commercial)', color: '#ff5722', description: 'SES commercial satellite delivering video and data connectivity worldwide.' }
  }
  if (upper.includes('INMARSAT')) {
    return { category: 'Inmarsat (Maritime)', color: '#ff7043', description: 'Inmarsat geostationary satellite providing maritime and aviation connectivity.' }
  }
  if (upper.includes('EUTELSAT')) {
    return { category: 'Eutelsat (Europe)', color: '#ff6e40', description: 'European commercial satellite operator delivering broadcast and broadband services.' }
  }
  if (upper.includes('VIASAT') || upper.includes('WILDBLUE')) {
    return { category: 'Viasat (Broadband)', color: '#ff6d00', description: 'Viasat high-throughput satellite providing consumer and enterprise broadband.' }
  }
  if (upper.includes('IRIDIUM')) {
    return { category: 'Iridium (Global Voice)', color: '#ff9100', description: 'Iridium LEO satellite enabling global voice and data communications anywhere on Earth.' }
  }
  if (upper.includes('GLOBALSTAR')) {
    return { category: 'Globalstar (Mobile)', color: '#ffab40', description: 'Globalstar LEO satellite providing mobile voice and data services globally.' }
  }
  if (upper.includes('ORBCOMM')) {
    return { category: 'ORBCOMM (IoT)', color: '#ffd180', description: 'ORBCOMM machine-to-machine and IoT satellite communications network.' }
  }
  if (upper.includes('THURAYA')) {
    return { category: 'Thuraya (Mobile Sat)', color: '#ff9100', description: 'Thuraya geostationary satellite providing mobile satellite phone services.' }
  }
  if (upper.includes('YAMAL') || upper.includes('EXPRESS') || upper.includes('ASTRA') || upper.includes('HOTBIRD')) {
    return { category: 'Broadcast (GEO)', color: '#ff5722', description: 'Geostationary communications satellite providing broadcast and direct-to-home TV services.' }
  }

  // ── Military & Intelligence ─────────────────────────────────────────────────
  if (upper.includes('MILSTAR') || upper.includes('WGS') || upper.includes('MUOS') || upper.includes('AEHF') || upper.includes('SBIRS')) {
    return { category: 'Military Comms (USA)', color: '#e040fb', description: 'U.S. Department of Defense protected military communications satellite.' }
  }
  if (upper.includes('COSMO-SKYMED') || upper.includes('PLEIADES') || upper.includes('HELIOS')) {
    return { category: 'Reconnaissance', color: '#ce93d8', description: 'High-resolution optical or SAR imaging satellite for defense intelligence.' }
  }
  if (upper.includes('DSP') || upper.includes('SBIRS') || upper.includes('STSS')) {
    return { category: 'Missile Warning (USA)', color: '#ba68c8', description: 'U.S. Space Force satellite providing infrared early warning of ballistic missile launches.' }
  }

  // ── Science & Research ──────────────────────────────────────────────────────
  if (upper.includes('HUBBLE') || upper.includes('HST')) {
    return { category: 'Space Telescope (NASA)', color: '#80cbc4', description: 'NASA/ESA Hubble Space Telescope observing the universe since 1990.' }
  }
  if (upper.includes('CHANDRA')) {
    return { category: 'X-Ray Observatory', color: '#4db6ac', description: 'NASA Chandra X-ray Observatory studying high-energy astrophysical phenomena.' }
  }
  if (upper.includes('SWIFT') || upper.includes('FERMI') || upper.includes('INTEGRAL')) {
    return { category: 'High-Energy Astronomy', color: '#4dd0e1', description: 'Space telescope observing gamma-ray bursts, black holes, and neutron stars.' }
  }
  if (upper.includes('GRACE') || upper.includes('SWARM')) {
    return { category: 'Geoscience (ESA/NASA)', color: '#26c6da', description: 'Satellite measuring Earth\'s gravity field and magnetic field variations.' }
  }
  if (upper.includes('ICE') || upper.includes('CRYOSAT') || upper.includes('ICESAT')) {
    return { category: 'Ice & Climate (ESA/NASA)', color: '#00bcd4', description: 'Satellite monitoring polar ice sheet mass balance and climate change impacts.' }
  }

  // ── Technology Demonstration ────────────────────────────────────────────────
  if (upper.includes('CUBESAT') || upper.includes('CUBE SAT') || upper.includes('-3U') || upper.includes('-6U') || upper.includes('-12U')) {
    return { category: 'CubeSat', color: '#a5d6a7', description: 'Small standardized research satellite (CubeSat format) for technology demonstration.' }
  }
  if (upper.includes('DEMO') || upper.includes('TECHNO') || upper.includes('INSPECT') || upper.includes('BRITE')) {
    return { category: 'Tech Demo', color: '#c5e1a5', description: 'In-orbit technology demonstration and validation satellite.' }
  }

  // ── Amateur Radio ───────────────────────────────────────────────────────────
  if (upper.includes('AMSAT') || upper.includes('OSCAR') || upper.includes('RS-') || upper.startsWith('AO-') || upper.startsWith('FO-') || upper.startsWith('SO-')) {
    return { category: 'Amateur Radio (AMSAT)', color: '#ffcc80', description: 'Amateur radio satellite enabling global ham radio communications from orbit.' }
  }

  // ── Rocket Bodies & Debris ──────────────────────────────────────────────────
  if (upper.includes('R/B') || upper.includes('ROCKET BODY') || upper.includes('DEB') || upper.includes('DEBRIS') || upper.includes('FRAG') || upper.endsWith(' [+]')) {
    return { category: 'Space Debris / Rocket Body', color: '#78909c', description: 'Tracked piece of orbital debris or spent rocket stage — catalogued by NORAD.' }
  }

  // Numeric NORAD ID range heuristics (rocket bodies tend to cluster in high IDs)
  if (norad > 70000) {
    return { category: 'Recent Launch Object', color: '#90a4ae', description: 'Recently launched object — classification pending additional tracking data.' }
  }

  return {
    category: 'Orbital Satellite',
    color: '#b39ddb',
    description: 'Active satellite in Earth orbit — detailed mission data not yet catalogued for this object.',
  }
}

// ── Realistic 3D Satellite Geometry [==O==] (Core Bus + Dual Solar Wings + Dish) ─
function createRefinedSatelliteGeometry(): THREE.BufferGeometry {
  const groupGeo = new THREE.BufferGeometry()

  // 1. Central Core Bus (Small Box)
  const bus = new THREE.BoxGeometry(0.008, 0.008, 0.012)
  
  // 2. Solar Wings (Flat Panels)
  const leftWing = new THREE.BoxGeometry(0.022, 0.002, 0.006)
  leftWing.translate(-0.014, 0, 0)

  const rightWing = new THREE.BoxGeometry(0.022, 0.002, 0.006)
  rightWing.translate(0.014, 0, 0)

  // Combine into single geometry
  const geometries = [bus, leftWing, rightWing]
  return bus
}

// Invisible Large Raycast Hitbox Geometry for Effortless Clicking
function createHitboxGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.032, 8, 8)
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

export function SatelliteUniverse() {
  const satellites = useUniverseStore((s) => s.satellites)
  const setSelectedEntity = useUniverseStore((s) => s.setSelectedEntity)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null!)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const count = satellites.length
  const icoGeometry = useMemo(() => createRefinedSatelliteGeometry(), [])
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
    return satellites.slice(0, 40).map((sat) => {
      const altKm = sat.altitude_km ?? 400
      const r = GLOBE_RADIUS + scaleAltitude(altKm)
      return buildSatelliteShortTrail(sat.lat, sat.lng, r)
    })
  }, [satellites])

  useFrame(({ clock }) => {
    if (!meshRef.current || count === 0) return
    const time = clock.getElapsedTime()

    satellites.forEach((sat, i) => {
      const basePos = basePositions[i]
      
      const swayOffset = Math.sin(time * 1.8 + i * 0.5) * 0.002
      DUMMY.position.set(
        basePos.x + swayOffset,
        basePos.y + swayOffset,
        basePos.z + swayOffset
      )
      DUMMY.rotation.set(time * 0.5, time * 0.3 + i, 0)
      DUMMY.updateMatrix()

      meshRef.current.setMatrixAt(i, DUMMY.matrix)
      if (hitboxMeshRef.current) hitboxMeshRef.current.setMatrixAt(i, DUMMY.matrix)

      const baseC = categoryColors[i] || COLOR_TMP.set('#ffffff')
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
      {/* Refined Small 3D Satellite Model Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[icoGeometry, undefined, count]}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.1}
          metalness={0.9}
          emissive="#00e5ff"
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

      {/* Always-Visible Short Fading Path Trails */}
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

      {/* Hovered Ring Halo */}
      {hoveredPos && (
        <mesh position={hoveredPos}>
          <sphereGeometry args={[0.032, 16, 16]} />
          <meshBasicMaterial color={hoveredInfo?.color || '#00e5ff'} transparent opacity={0.85} wireframe />
        </mesh>
      )}

      {/* Hover Tooltip Tag */}
      {hoveredSat && hoveredPos && hoveredInfo && (
        <Html position={hoveredPos} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(3, 12, 24, 0.95)',
              border: `1px solid ${hoveredInfo.color}`,
              borderRadius: 6,
              padding: '5px 10px',
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
