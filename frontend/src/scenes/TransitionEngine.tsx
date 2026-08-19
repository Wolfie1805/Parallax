import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { UniverseType } from '../state/universeStore'

import reweaveVert from '../shaders/reweave.vert.glsl?raw'
import reweaveFrag from '../shaders/reweave.frag.glsl?raw'

const PALETTES: Record<UniverseType, string> = {
  satellite: '#00e5ff',
  aircraft: '#00b0ff',
  weather: '#00e676',
}

interface TransitionEngineProps {
  fromPositions: Float32Array
  toPositions: Float32Array
  fromUniverse: UniverseType
  toUniverse: UniverseType
  particleCount: number
  onComplete: () => void
}

export function TransitionEngine({
  fromPositions,
  toPositions,
  fromUniverse,
  toUniverse,
  particleCount,
  onComplete,
}: TransitionEngineProps) {
  const meshRef = useRef<THREE.Points>(null!)
  const progressRef = useRef(0)
  const completeFired = useRef(false)
  const { camera } = useThree()
  const initialCamZ = useRef(camera.position.z)

  const { fromColors, toColors } = useMemo(() => {
    const fromCol = new THREE.Color(PALETTES[fromUniverse])
    const toCol = new THREE.Color(PALETTES[toUniverse])

    const fArr = new Float32Array(particleCount * 3)
    const tArr = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      fromCol.toArray(fArr, i * 3)
      toCol.toArray(tArr, i * 3)
    }

    return { fromColors: fArr, toColors: tArr }
  }, [fromUniverse, toUniverse, particleCount])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: reweaveVert,
        fragmentShader: reweaveFrag,
        uniforms: {
          uProgress: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
          uSize: { value: 16.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  useFrame((_, delta) => {
    // 2.0s total three-phase transition
    progressRef.current = Math.min(1.0, progressRef.current + delta * 0.5)
    const p = progressRef.current

    material.uniforms.uProgress.value = p

    // 1. Camera Micro-shake at peak Shatter burst (p ~0.3)
    if (p > 0.15 && p < 0.45) {
      const shakeAmt = (0.45 - Math.abs(p - 0.3)) * 0.015
      camera.position.x = (Math.random() - 0.5) * shakeAmt
      camera.position.y = (Math.random() - 0.5) * shakeAmt
    } else {
      camera.position.x = 0
      camera.position.y = 0
    }

    // 2. Void Phase Camera Drift (0.6 - 0.9s -> p: 0.3 - 0.45)
    if (p > 0.3 && p < 0.6) {
      camera.position.z = initialCamZ.current + (p - 0.3) * 0.15
    } else if (p >= 0.6) {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, initialCamZ.current, delta * 3.0)
    }

    if (p >= 1.0 && !completeFired.current) {
      completeFired.current = true
      camera.position.set(0, 0, initialCamZ.current)
      onComplete()
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[fromPositions, 3]} />
        <bufferAttribute attach="attributes-aTargetPosition" args={[toPositions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[fromColors, 3]} />
        <bufferAttribute attach="attributes-aTargetColor" args={[toColors, 3]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  )
}
