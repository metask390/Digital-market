'use client'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { PerspectiveCamera as ThreeCamera } from 'three'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, View } from '@react-three/drei'
import { SunsetLights } from './Lights'
import { ChickenModel } from './Models'

/**
 * One shared WebGL canvas that renders many small chicken scenes (drei <View>),
 * so a farm with dozens of chickens never exceeds the browser's WebGL context limit.
 */
export function ViewCanvasHost({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="relative">
      {children}
      <Canvas
        shadows
        dpr={[1, 1.75]}
        eventSource={ref as React.RefObject<HTMLElement>}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 5 }}
      >
        <View.Port />
      </Canvas>
    </div>
  )
}

/** drei's PerspectiveCamera does not aim at the origin by itself, so aim it explicitly. */
function AimedCamera({ position, target, fov }: { position: [number, number, number]; target: [number, number, number]; fov: number }) {
  const ref = useRef<ThreeCamera>(null)
  useLayoutEffect(() => { ref.current?.lookAt(...target) }, [target])
  return <PerspectiveCamera ref={ref} makeDefault position={position} fov={fov} />
}

const CAM_POS: [number, number, number] = [2.0, 1.25, 3.5]
const CAM_TARGET: [number, number, number] = [0, -0.12, 0]

/** A small stage with one chicken. Mounts its 3D view only while near the viewport. */
export function ChickenView({ color, height = 1.35, phase = 0, className = '' }: {
  color: string; height?: number; phase?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {near && (
        <View className="h-full w-full">
          <AimedCamera position={CAM_POS} target={CAM_TARGET} fov={30} />
          <SunsetLights shadowSize={512} />
          <Suspense fallback={null}>
            <group position={[0, -0.7, 0]}>
              <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <circleGeometry args={[1.05, 40]} />
                <meshStandardMaterial color={color} roughness={0.9} />
              </mesh>
              <ChickenModel height={height} phase={phase} color={color} />
            </group>
          </Suspense>
        </View>
      )}
    </div>
  )
}
