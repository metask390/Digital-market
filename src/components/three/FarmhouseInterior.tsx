'use client'

import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Suspense } from 'react'
import type { UserChicken } from '@/lib/types'
import { ChickenModel, FarmhouseModel } from './Models'

class FarmhouseErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn('Farmhouse 3D scene failed; showing safe fallback.', error, info)
  }

  render() {
    if (this.state.failed) {
      return <div className="flex h-full min-h-[380px] items-center justify-center bg-gradient-to-b from-sky-200 to-leaf-soft p-6 text-center"><div><p className="font-display text-2xl text-leaf-dark">Farmhouse preview unavailable</p><p className="mt-1 text-sm font-bold text-ink/60">Your chickens and farm data are safe. Refresh to try the 3D view again.</p></div></div>
    }
    return this.props.children
  }
}

function PlayerMovement() {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    camera.position.set(0, 1.6, 4.8)
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true }
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera])

  useFrame((_, delta) => {
    const direction = { x: 0, z: 0 }
    if (keys.current.KeyW || keys.current.ArrowUp) direction.z -= 1
    if (keys.current.KeyS || keys.current.ArrowDown) direction.z += 1
    if (keys.current.KeyA || keys.current.ArrowLeft) direction.x -= 1
    if (keys.current.KeyD || keys.current.ArrowRight) direction.x += 1
    const length = Math.hypot(direction.x, direction.z)
    if (!length) return
    const speed = 3.5 * Math.min(delta, 0.05) / length
    camera.translateX(direction.x * speed)
    camera.translateZ(direction.z * speed)
    camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x))
    camera.position.z = Math.max(-4.5, Math.min(5.5, camera.position.z))
    camera.position.y = 1.6
  })

  return null
}

function ChickenFlock({ chickens }: { chickens: UserChicken[] }) {
  const spots = useMemo(() => chickens.map((_, index) => {
    const angle = index * 2.399963
    const radius = 0.65 + (index % 5) * 0.28
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius - 0.15,
      rotation: angle + Math.PI,
    }
  }), [chickens])

  return <>
    {spots.map((spot, index) => (
      <group key={chickens[index]?.id ?? index} position={[spot.x, 0.02, spot.z]} rotation-y={spot.rotation}>
        <ChickenModel height={0.75 + (index % 3) * 0.06} phase={index * 0.83} color={index % 2 ? '#facc15' : '#d97706'} />
      </group>
    ))}
  </>
}

export default function FarmhouseInterior({ chickens }: { chickens: UserChicken[] }) {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(window.matchMedia('(max-width: 768px), (pointer: coarse)').matches)
  }, [])

  const canvas = (
    <Canvas
      shadows={!mobile}
      dpr={mobile ? 1 : [1, 1.5]}
      camera={{ position: [0, 1.55, 4.6], fov: 68 }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
      fallback={<div className="flex h-full min-h-[380px] items-center justify-center bg-leaf-soft p-6 text-center font-bold text-leaf-dark">Unable to load 3D Farm. Your farm data is still available below.</div>}
    >
      <color attach="background" args={['#b8e5ff']} />
      <hemisphereLight intensity={1.7} color="#fff5dc" groundColor="#5d8d48" />
      <directionalLight castShadow={!mobile} position={[4, 8, 5]} intensity={2.2} shadow-mapSize={[mobile ? 512 : 1024, mobile ? 512 : 1024]} />
      <Suspense fallback={null}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.03, 0]}>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#6da84c" roughness={1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, 0]}>
          <circleGeometry args={[4.8, 64]} />
          <meshStandardMaterial color="#b9824e" roughness={1} />
        </mesh>
        <FarmhouseModel height={6.2} />
        <ChickenFlock chickens={chickens} />
      </Suspense>
      <PlayerMovement />
      <PointerLockControls />
    </Canvas>
  )

  return (
    <section className="relative mb-4 h-[min(68vh,560px)] min-h-[380px] overflow-hidden rounded-[2rem] bg-[#8fcf67] shadow-lg ring-1 ring-black/10">
      <FarmhouseErrorBoundary>{canvas}</FarmhouseErrorBoundary>
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <div className="rounded-full bg-black/45 px-4 py-2 text-center text-xs font-extrabold text-white backdrop-blur-sm">
          Click the farm to walk inside · WASD to move · mouse to look
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl bg-black/35 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
        {chickens.length ? `${chickens.length} chicken${chickens.length === 1 ? '' : 's'} in the farmhouse` : 'Buy chickens to fill your farmhouse'}
      </div>
      {!chickens.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="rounded-full bg-black/45 px-4 py-2 text-sm font-extrabold text-white">Your farmhouse is waiting for its first chicken</p></div>
      )}
    </section>
  )
}
