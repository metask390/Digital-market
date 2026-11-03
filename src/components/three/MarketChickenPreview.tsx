'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { Environment, PerspectiveCamera, useAnimations, useGLTF } from '@react-three/drei'

const CHICKEN_URL = '/models/chicken.glb'

function ChickenModel({ phase = 0, color }: { phase?: number; color: string }) {
  const root = useRef<Group>(null)
  const { scene, animations } = useGLTF(CHICKEN_URL)
  const { actions } = useAnimations(animations, root)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(node => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = 1.8 / Math.max(size.y, 0.001)
    return { clone, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] }
  }, [scene])

  useEffect(() => {
    const name = Object.keys(actions).find(key => /idle|walk|peck/i.test(key)) ?? Object.keys(actions)[0]
    if (!name) return
    actions[name]?.reset().fadeIn(0.2).play()
    return () => { actions[name]?.fadeOut(0.2) }
  }, [actions])

  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime + phase
    root.current.position.y = 0.035 + Math.abs(Math.sin(t * 2.2)) * 0.018
    root.current.rotation.y = Math.PI + Math.sin(t * 0.45) * 0.22
    root.current.rotation.z = Math.sin(t * 1.3) * 0.025
  })

  return (
    <group ref={root}>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[0.86, 32]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <group position={model.offset} scale={model.scale}>
        <primitive object={model.clone} />
      </group>
    </group>
  )
}

export function MarketChickenPreview({ color, phase = 0 }: { color: string; phase?: number }) {
  return (
    <div className="h-36 w-full overflow-hidden bg-gradient-to-b from-sky-100 to-leaf-soft">
      <Canvas shadows dpr={[1, 1.4]}>
        <PerspectiveCamera makeDefault position={[0, 0.65, 6]} fov={45} />
        <ambientLight intensity={1.5} />
        <directionalLight castShadow position={[5, 6, 5]} intensity={2} shadow-mapSize={[512, 512]} />
        <Environment preset="city" />
        <Suspense fallback={null}><ChickenModel color={color} phase={phase} /></Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(CHICKEN_URL)
