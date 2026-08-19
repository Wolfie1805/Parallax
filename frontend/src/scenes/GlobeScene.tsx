/**
 * GlobeScene.tsx
 *
 * Core 3D scene for PARALLAX.
 *
 * Bug Fix:
 *  - FocusController camera lerp now transforms local (lat, lng) by GlobeMesh's current Y-rotation so clicking ANY satellite, aircraft, or weather marker centers camera PRECISELY on that marker!
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import earthData from '../geo/earthParticlesData.json'
import { useUniverseStore } from '../state/universeStore'

import particleGlobeVert from '../shaders/particleGlobe.vert.glsl?raw'
import particleGlobeFrag from '../shaders/particleGlobe.frag.glsl?raw'

export const GLOBE_RADIUS = 1.0

export function latLngToVec3(lat: number, lng: number, r = GLOBE_RADIUS): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.sin(lngRad),
    r * Math.sin(latRad),
    r * Math.cos(latRad) * Math.cos(lngRad)
  )
}

export function vec3ToLatLng(point: THREE.Vector3): { lat: number; lng: number } {
  const r   = point.length()
  const lat = Math.asin(point.y / r) * (180 / Math.PI)
  const lng = Math.atan2(point.x, point.z) * (180 / Math.PI)
  return { lat, lng }
}

const STAR_RADIUS = 8.0

// ── Solid Occlusion Sphere ────────────────────────────────────────────────────
function EarthOcclusionBody() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 0.996, 64, 64]} />
      <meshBasicMaterial color="#000510" depthWrite={true} />
    </mesh>
  )
}

// ── Particle Landmass Component ───────────────────────────────────────────────
function ParticleLandmass() {
  const { positions, colors, densities } = useMemo(() => {
    return {
      positions: new Float32Array(earthData.positions),
      colors: new Float32Array(earthData.colors),
      densities: new Float32Array(earthData.densities || new Array(earthData.positions.length / 3).fill(1.0)),
    }
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleGlobeVert,
        fragmentShader: particleGlobeFrag,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uSize: { value: 18.0 },
          uGlowIntensity: { value: 0.5 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    material.uniforms.uGlowIntensity.value = 0.5 + Math.sin(time * (Math.PI * 2 / 5.0)) * 0.3
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aDensity" args={[densities, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  )
}

// ── Atmosphere Rim ────────────────────────────────────────────────────────────
function AtmosphereRim() {
  return (
    <group>
      <mesh scale={[1.018, 1.018, 1.018]}>
        <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.042, 1.042, 1.042]}>
        <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

// ── Starfield ────────────────────────────────────────────────────────────────
function Starfield() {
  const { bigPositions, smallPositions } = useMemo(() => {
    const big = new Float32Array(300 * 3)
    const small = new Float32Array(900 * 3)

    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      big[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * STAR_RADIUS
      big[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * STAR_RADIUS
      big[i * 3 + 2] = Math.cos(phi) * STAR_RADIUS
    }

    for (let i = 0; i < 900; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      small[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * STAR_RADIUS
      small[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * STAR_RADIUS
      small[i * 3 + 2] = Math.cos(phi) * STAR_RADIUS
    }

    return { bigPositions: big, smallPositions: small }
  }, [])

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bigPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.032} sizeAttenuation transparent opacity={0.80} color="#ffffff" />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[smallPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.014} sizeAttenuation transparent opacity={0.40} color="#80deea" />
      </points>
    </group>
  )
}

// ── Focus Controller (Lerps camera to current rotated world position) ──────
function FocusController({ globeGroupRef }: { globeGroupRef: React.RefObject<THREE.Group> }) {
  const selectedEntity = useUniverseStore((s) => s.selectedEntity)
  const { camera } = useThree()
  const focusingRef = useRef(false)
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 2.8))

  useEffect(() => {
    if (
      selectedEntity?.data &&
      selectedEntity.data.lat != null &&
      selectedEntity.data.lng != null &&
      globeGroupRef.current
    ) {
      const { lat, lng } = selectedEntity.data
      const localVec = latLngToVec3(lat, lng, 1.0)
      const rotY = globeGroupRef.current.rotation.y
      const worldVec = localVec.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).normalize()
      targetCamPos.current.copy(worldVec.multiplyScalar(2.2))
      focusingRef.current = true
    }
  }, [selectedEntity, globeGroupRef])

  useFrame((_, delta) => {
    if (focusingRef.current) {
      camera.position.lerp(targetCamPos.current, delta * 3.5)
      camera.lookAt(0, 0, 0)
      if (camera.position.distanceTo(targetCamPos.current) < 0.03) {
        focusingRef.current = false
      }
    }
  })

  return null
}

// ── Globe Group ──────────────────────────────────────────────────────────────
function GlobeMesh({
  children,
  groupRef,
  onSpinProgress,
}: {
  children?: React.ReactNode
  groupRef: React.RefObject<THREE.Group>
  onSpinProgress?: (progress: number) => void
}) {
  const mouseRef = useRef({ x: 0, y: 0 })
  const activeUniverse = useUniverseStore((s) => s.activeUniverse)

  const prevUniverse = useRef(activeUniverse)
  const spinTargetRef = useRef(0)

  // 1 Full Rotation (360° = 2 * PI radians) over 2.0s with Sine Ease-In-Out
  const timeRef = useRef(0)
  const spinDuration = 2.0
  const entryCompleteRef = useRef(false)
  const prevAngleRef = useRef(0)

  // Universe switch rotation trigger
  useEffect(() => {
    if (prevUniverse.current !== activeUniverse) {
      prevUniverse.current = activeUniverse
      spinTargetRef.current += Math.PI * 0.8
    }
  }, [activeUniverse])

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handlePointerMove)
    return () => window.removeEventListener('mousemove', handlePointerMove)
  }, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      if (!entryCompleteRef.current) {
        timeRef.current += delta
        const p = Math.min(1.0, timeRef.current / spinDuration)

        // Sine Ease-In-Out curve for 360° entry rotation
        const currentAngle = ((1.0 - Math.cos(p * Math.PI)) / 2.0) * (Math.PI * 2.0)
        const angleDelta = currentAngle - prevAngleRef.current
        prevAngleRef.current = currentAngle

        groupRef.current.rotation.y += angleDelta

        if (onSpinProgress) onSpinProgress(p)

        if (p >= 1.0) {
          entryCompleteRef.current = true
        }
      } else {
        // Resume normal slow idle rotation
        groupRef.current.rotation.y += 0.004 * delta
      }

      // Universe switch rotation spin
      if (spinTargetRef.current > 0.01) {
        const step = spinTargetRef.current * delta * 4.0
        groupRef.current.rotation.y += step
        spinTargetRef.current -= step
      }

      // Parallax cursor tilt
      const targetTiltX = mouseRef.current.y * 0.05
      const targetTiltZ = -mouseRef.current.x * 0.05
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetTiltX, delta * 2.0)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetTiltZ, delta * 2.0)
    }
  })

  return (
    <group ref={groupRef}>
      <EarthOcclusionBody />
      <ParticleLandmass />
      <AtmosphereRim />
      {children}
    </group>
  )
}

// ── GlobeScene Component ─────────────────────────────────────────────────────
interface GlobeSceneProps {
  children?: React.ReactNode
  interactive?: boolean
  dimmed?: boolean
}

export function GlobeScene({ children, interactive = true, dimmed = false }: GlobeSceneProps) {
  const [fadeIn, setFadeIn] = useState(false)
  const [dataPointsOpacity, setDataPointsOpacity] = useState(0)
  const globeGroupRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handleSpinProgress = (progress: number) => {
    if (progress > 0.6) {
      const alpha = Math.min(1.0, (progress - 0.6) / 0.4)
      setDataPointsOpacity(alpha)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        opacity: fadeIn ? (dimmed ? 0.35 : 1) : 0,
        transition: 'opacity 1.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        style={{
          width: '100%',
          height: '100%',
          background: '#000510',
        }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.25} />
        <Starfield />
        <GlobeMesh groupRef={globeGroupRef} onSpinProgress={handleSpinProgress}>
          <group visible={dataPointsOpacity > 0.05}>
            {children}
          </group>
        </GlobeMesh>
        <FocusController globeGroupRef={globeGroupRef} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            minDistance={1.4}
            maxDistance={5.0}
            rotateSpeed={0.6}
            zoomSpeed={0.8}
            enableDamping
            dampingFactor={0.05}
          />
        )}
      </Canvas>
    </div>
  )
}
