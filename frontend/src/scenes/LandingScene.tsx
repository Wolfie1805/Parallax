import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import earthData from '../geo/earthParticlesData.json'

// ── Typewriter Hook ──────────────────────────────────────────────────────────
function useTypewriter(fullText: string, speedMs = 30, delayMs = 0) {
  const [revealedCount, setRevealedCount] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsStarted(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])

  useEffect(() => {
    if (!isStarted || revealedCount >= fullText.length) {
      if (isStarted && revealedCount >= fullText.length) setIsComplete(true)
      return
    }
    const interval = setInterval(() => {
      setRevealedCount((prev) => {
        const next = prev + 1
        if (next >= fullText.length) {
          clearInterval(interval)
          setIsComplete(true)
        }
        return next
      })
    }, speedMs + Math.random() * 14)
    return () => clearInterval(interval)
  }, [isStarted, fullText, speedMs, revealedCount])

  return { displayedText: fullText.slice(0, revealedCount), isComplete }
}

// ── Count-up number animation hook ──────────────────────────────────────────
function useCountUp(target: number, durationMs = 1000, delayMs = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let raf: number
    const startDelay = setTimeout(() => {
      const animate = (ts: number) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / durationMs, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) raf = requestAnimationFrame(animate)
      }
      raf = requestAnimationFrame(animate)
    }, delayMs)
    return () => {
      clearTimeout(startDelay)
      cancelAnimationFrame(raf)
    }
  }, [target, durationMs, delayMs])
  return value
}

// ── UTC Clock Component ──────────────────────────────────────────────────────
function UTCClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`
  const dateStr = now.toUTCString().slice(5, 16)
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'rgba(0,229,255,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>TIME (UTC)</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#00e5ff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em' }}>{timeStr}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>{dateStr}</div>
    </div>
  )
}

// ── Live Sparkline Pulse ─────────────────────────────────────────────────────
function Sparkline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const histRef = useRef<number[]>(Array.from({ length: 28 }, () => Math.random() * 0.6 + 0.2))
  useEffect(() => {
    const id = setInterval(() => {
      histRef.current.push(Math.random() * 0.7 + 0.15)
      if (histRef.current.length > 28) histRef.current.shift()
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth = 1.5
      ctx.shadowBlur = 6
      ctx.shadowColor = '#00e5ff'
      ctx.beginPath()
      histRef.current.forEach((v, i) => {
        const x = (i / 27) * c.width
        const y = c.height - v * c.height
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
    }, 200)
    return () => clearInterval(id)
  }, [])
  return <canvas ref={canvasRef} width={56} height={20} style={{ display: 'block', opacity: 0.85 }} />
}

// ── 3D Scene: Globe + Fast Hyper-Warp Transition (< 1 second) ─────────────
function LandingGlobeScene({ dissolving, onComplete }: { dissolving: boolean; onComplete: () => void }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { camera } = useThree()
  const timeRef = useRef(0)
  const doneFired = useRef(false)

  const { positions, colors } = useMemo(() => ({
    positions: new Float32Array(earthData.positions),
    colors: new Float32Array(earthData.colors),
  }), [])

  const globeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 color;
          varying vec3 vColor;
          varying vec3 vNormalView;
          uniform float uPixelRatio;
          uniform float uGlowIntensity;
          void main() {
            vColor = color;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vNormalView = normalize(normalMatrix * position);
            gl_Position = projectionMatrix * mvPos;
            float facing = clamp(vNormalView.z, 0.3, 1.0);
            gl_PointSize = uPixelRatio * 18.0 * (0.008 + 0.008 * facing) * (1.0 / -mvPos.z);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying vec3 vNormalView;
          uniform float uGlowIntensity;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float a = (1.0 - smoothstep(0.28, 0.50, d));
            float facing = clamp(vNormalView.z, 0.35, 1.0);
            float depth = smoothstep(-0.2, 0.4, vNormalView.z);
            float fresnel = pow(1.0 - abs(vNormalView.z), 2.2);
            vec3 col = vColor * mix(0.55, 1.3, facing) + vec3(0.0, 0.95, 1.0) * fresnel * (0.45 + uGlowIntensity * 0.3);
            gl_FragColor = vec4(col, a * depth * 0.9);
          }
        `,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uGlowIntensity: { value: 0.5 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  const orbitArcs = useMemo(() => {
    const lines: THREE.Line[] = []
    const configs = [
      { tilt: 0.5, twist: 0.2, r: 1.38, opacity: 0.12 },
      { tilt: -0.7, twist: 1.1, r: 1.52, opacity: 0.09 },
      { tilt: 0.3, twist: 2.5, r: 1.44, opacity: 0.07 },
    ]
    for (const cfg of configs) {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= 96; i++) {
        const angle = (i / 96) * Math.PI * 2
        const x = Math.cos(angle) * cfg.r
        const y = Math.sin(angle) * Math.sin(cfg.tilt) * cfg.r
        const z = Math.sin(angle) * Math.cos(cfg.tilt) * cfg.r
        pts.push(new THREE.Vector3(x, y, z).applyEuler(new THREE.Euler(0, cfg.twist, 0)))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({ color: '#00e5ff', transparent: true, opacity: cfg.opacity })
      lines.push(new THREE.Line(geo, mat))
    }
    return lines
  }, [])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    globeMat.uniforms.uGlowIntensity.value = 0.5 + Math.sin(t * (Math.PI * 2 / 5)) * 0.3

    if (!dissolving) {
      if (groupRef.current) groupRef.current.rotation.y += 0.004 * delta
      return
    }

    // High-Speed Warp Spin under 1.0s total (0.75s)
    timeRef.current += delta
    const elapsed = timeRef.current
    const totalDuration = 0.75

    if (groupRef.current) {
      const spinSpeed = 0.004 + Math.sin(Math.min(1.0, elapsed / totalDuration) * Math.PI) * 4.5
      groupRef.current.rotation.y += spinSpeed * delta
    }

    const p = Math.min(1, elapsed / totalDuration)
    const ease = 1 - Math.pow(1 - p, 3)
    camera.position.z = THREE.MathUtils.lerp(3.2, 1.3, ease)
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(1.4, 0, ease)
      groupRef.current.position.y = THREE.MathUtils.lerp(-0.3, 0, ease)
    }

    if (elapsed >= totalDuration && !doneFired.current) {
      doneFired.current = true
      onComplete()
    }
  })

  return (
    <group>
      <group ref={groupRef} position={[1.4, -0.3, 0]} scale={[1.4, 1.4, 1.4]}>
        <mesh>
          <sphereGeometry args={[0.998, 48, 48]} />
          <meshBasicMaterial color="#020510" depthWrite />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <primitive object={globeMat} attach="material" />
        </points>
        <mesh scale={[1.018, 1.018, 1.018]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.11} side={THREE.BackSide} />
        </mesh>
        <mesh scale={[1.042, 1.042, 1.042]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#0088ff" transparent opacity={0.04} side={THREE.BackSide} />
        </mesh>
        {orbitArcs.map((line, i) => (
          <primitive key={i} object={line} />
        ))}
      </group>
    </group>
  )
}

// ── Pedestal Glow ────────────────────────────────────────────────────────────
function PedestalGlow() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        right: '14%',
        width: 360,
        height: 180,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#00e5ff',
          boxShadow: '0 0 40px 20px rgba(0,229,255,0.6), 0 0 80px 40px rgba(0,136,255,0.3)',
          animation: 'pedestalPulse 3s ease-in-out infinite',
        }}
      />
      {[80, 140, 200, 260].map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: -r / 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: r,
            height: r / 3,
            borderRadius: '50%',
            border: `1px solid rgba(0,229,255,${0.3 - i * 0.06})`,
            boxShadow: `0 0 12px rgba(0,229,255,${0.15 - i * 0.03})`,
            animation: `pedestalRing${i} ${3 + i * 0.8}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Main LandingScene Component ──────────────────────────────────────────────
interface LandingSceneProps {
  onStart: () => void
}

export function LandingScene({ onStart }: LandingSceneProps) {
  const [dissolving, setDissolving] = useState(false)
  const [fadeOverlay, setFadeOverlay] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  const subtitle = useTypewriter(
    'Real-time 3D visualization engine for satellites, aircraft, weather systems and global operational data.',
    22,
    600
  )

  const objCount = useCountUp(71647, 1100, 300)
  const streamCount = useCountUp(12, 800, 500)
  const weatherCount = useCountUp(54783, 1000, 400)
  const latency = useCountUp(42, 600, 200)

  // High-Impact <1s Start Visualizer sequence
  const triggerIgnition = useCallback(() => {
    if (dissolving) return
    setFadeOverlay(true)
    setTimeout(() => {
      setDissolving(true)
    }, 180)
  }, [dissolving])

  const handleGlobeComplete = useCallback(() => {
    setFadingOut(true)
    setTimeout(() => {
      onStart()
    }, 300) // Fast 0.3s resolution
  }, [onStart])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(160deg, #020305 0%, #050810 100%)',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, sans-serif',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes fadeInBlur {
          from { opacity: 0; filter: blur(8px); transform: translateY(14px); }
          to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
        }
        @keyframes blinkCursor {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        .blink-cursor {
          display: inline-block; margin-left: 2px; color: #00e5ff;
          animation: blinkCursor 1s step-end infinite;
        }
        @keyframes pedestalPulse {
          0%,100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
          50%     { opacity: 1;    transform: translateX(-50%) scale(1.3); }
        }
        @keyframes pedestalRing0 { 0%,100%{opacity:0.55} 50%{opacity:0.9} }
        @keyframes pedestalRing1 { 0%,100%{opacity:0.4}  50%{opacity:0.7} }
        @keyframes pedestalRing2 { 0%,100%{opacity:0.3}  50%{opacity:0.55} }
        @keyframes pedestalRing3 { 0%,100%{opacity:0.18} 50%{opacity:0.38} }
        @keyframes eyebrRowPulse {
          0%,100% { opacity: 0.85; } 50% { opacity: 1; }
        }
        .eyebrow-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #00e5ff; box-shadow: 0 0 8px #00e5ff;
          animation: eyebrRowPulse 2.5s ease-in-out infinite; margin-right: 8px;
        }
        .launch-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: transparent; border: 1.5px solid #00e5ff; color: #00e5ff;
          padding: 12px 28px; border-radius: 28px; cursor: pointer;
          font-family: "JetBrains Mono", monospace; font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          box-shadow: 0 0 20px rgba(0,229,255,0.25);
          transition: all 0.2s ease;
        }
        .launch-btn:hover {
          background: rgba(0,229,255,0.12);
          box-shadow: 0 0 36px rgba(0,229,255,0.5);
        }
        .social-square {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          border: 1px solid rgba(0, 229, 255, 0.3);
          background: rgba(8, 14, 28, 0.75);
          color: #ffffff;
          font-family: "JetBrains Mono", monospace; font-size: 12px; font-weight: 600;
          text-decoration: none; transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
        }
        .social-square:hover {
          border-color: #00e5ff; color: #00e5ff; background: rgba(0,229,255,0.15);
          box-shadow: 0 0 24px rgba(0,229,255,0.4);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Cyber Flash Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'radial-gradient(circle at 70% 50%, rgba(0,229,255,0.5) 0%, rgba(0,5,16,0.98) 70%)',
          opacity: fadeOverlay ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 50 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <LandingGlobeScene dissolving={dissolving} onComplete={handleGlobeComplete} />
      </Canvas>

      {/* Pedestal Glow */}
      <PedestalGlow />

      {/* Top Nav Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: 64,
          background: 'rgba(2,3,5,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,229,255,0.1)',
        }}
      >
        <div>
          <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: '0.28em', color: '#fff' }}>PARALLAX</div>
          <div style={{ fontSize: 8.5, letterSpacing: '0.18em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', marginTop: 1 }}>
            REAL-TIME · SPATIALLY AWARE
          </div>
        </div>

        <button className="launch-btn" onClick={triggerIgnition} style={{ padding: '7px 20px', fontSize: 11, borderRadius: 20 }}>
          LAUNCH →
        </button>
      </div>

      {/* Hero Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
          paddingTop: 64,
          maxWidth: 680,
          opacity: dissolving ? 0 : 1,
          transform: dissolving ? 'translateX(-60px) scale(0.97)' : 'translateX(0) scale(1)',
          transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: dissolving ? 'none' : 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, animation: 'fadeInBlur 0.8s 0.1s backwards' }}>
          <span className="eyebrow-dot" />
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#00e5ff', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
            3D TELEMETRY NETWORK
          </span>
        </div>

        <h1
          style={{
            fontFamily: '"Syne", "Inter", sans-serif',
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1.06,
            letterSpacing: '-0.02em',
            color: '#fff',
            margin: '0 0 22px 0',
          }}
        >
          {['Every', ' ', 'operational', ' ', 'sphere', ' ', 'has', ' '].map((word, wi) =>
            word === ' '
              ? ' '
              : word.split('').map((char, ci) => (
                  <span
                    key={`${wi}-${ci}`}
                    style={{
                      display: 'inline-block',
                      animation: `fadeInBlur 0.6s cubic-bezier(0.16,1,0.3,1) ${(wi * 7 + ci) * 28}ms backwards`,
                    }}
                  >
                    {char}
                  </span>
                ))
          )}
          <br />
          {'telemetry.'.split('').map((char, ci) => (
            <span
              key={ci}
              style={{
                display: 'inline-block',
                background: 'linear-gradient(90deg, #00e5ff, #7c4dff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `fadeInBlur 0.6s cubic-bezier(0.16,1,0.3,1) ${(8 * 7 + ci) * 28 + 80}ms backwards`,
              }}
            >
              {char}
            </span>
          ))}
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.55)',
            margin: '0 0 34px 0',
            fontFamily: '"JetBrains Mono", monospace',
            maxWidth: 480,
            animation: 'fadeInBlur 0.8s 0.4s backwards',
          }}
        >
          {subtitle.displayedText}
          {!subtitle.isComplete && <span className="blink-cursor">|</span>}
        </p>

        <div style={{ animation: 'fadeInBlur 0.8s 0.7s backwards' }}>
          <button className="launch-btn" onClick={triggerIgnition}>
            <span style={{ fontSize: 16 }}>▶</span>
            LAUNCH VISUALIZER →
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32, animation: 'fadeInBlur 0.8s 0.9s backwards' }}>
          <a href="https://github.com/Wolfie1805" target="_blank" rel="noopener noreferrer" className="social-square">
            <span>🐙</span> GitHub
          </a>
          <a href="https://www.linkedin.com/in/aryanuj-chaudhary" target="_blank" rel="noopener noreferrer" className="social-square">
            <span>💼</span> LinkedIn
          </a>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          height: 72,
          background: 'rgba(2,3,5,0.75)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,229,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#00e676',
                boxShadow: '0 0 8px #00e676',
                animation: 'eyebrRowPulse 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ fontSize: 10, letterSpacing: '0.18em', color: '#00e676', fontFamily: '"JetBrains Mono", monospace' }}>LIVE NOW</span>
          </div>
          <Sparkline />
        </div>

        <div style={{ display: 'flex', gap: 56, alignItems: 'center' }}>
          <StatItem icon="🛰️" label="OBJECTS TRACKED" value={objCount.toLocaleString()} />
          <StatItem icon="✈️" label="DATA STREAMS" value={streamCount.toString()} />
          <StatItem icon="🌐" label="WEATHER NODES" value={weatherCount.toLocaleString()} />
          <StatItem icon="⚡" label="LATENCY" value={`${latency}ms`} />
        </div>

        <UTCClock />
      </div>
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16, opacity: 0.7 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 8.5, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em' }}>{value}</div>
      </div>
    </div>
  )
}
