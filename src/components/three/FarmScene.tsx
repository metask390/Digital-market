'use client'

import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Group, Mesh, Vector3 } from 'three'
import type { ChickenType, UserChicken } from '@/lib/types'

const CHICKEN_URL = '/models/chicken.glb'

function seededPosition(index: number, id: string): [number, number, number] {
  let hash = 2166136261 + index
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const x = -5 + (Math.abs(hash) % 1000) / 100
  const z = -5 + (Math.abs(Math.imul(hash, 31)) % 1000) / 100
  return [Math.max(-5, Math.min(5, x)), 0, Math.max(-5, Math.min(5, z))]
}

function Chicken({ chicken, index }: { chicken: UserChicken; index: number }) {
  const { scene } = useGLTF(CHICKEN_URL)
  const modelRef = useRef<Group>(null)
  const position = useMemo(() => seededPosition(index, chicken.id), [chicken.id, index])
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(node => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    const bounds = new Box3().setFromObject(clone)
    const size = bounds.getSize(new Vector3())
    const scale = 1.5 / Math.max(size.y, 0.001)
    return { clone, scale }
  }, [scene])

  useLayoutEffect(() => {
    if (!modelRef.current) return
    const bounds = new Box3().setFromObject(modelRef.current)
    modelRef.current.position.y = -bounds.min.y
  }, [model])

  return <group position={position}>
    <group ref={modelRef} scale={model.scale}>
      <primitive object={model.clone} />
    </group>
  </group>
}

function BasicFarm({ chickens }: { chickens: UserChicken[] }) {
  return <>
    <ambientLight intensity={0.6} />
    <directionalLight castShadow position={[10, 10, 5]} intensity={1.2} shadow-mapSize={[1024, 1024]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#78a85a" roughness={0.95} />
    </mesh>
    {chickens.map((chicken, index) => <Chicken key={chicken.id} chicken={chicken} index={index} />)}
  </>
}

export function FarmScene({ chickens, types: _types, now: _now, onCollect: _onCollect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  return <div id="farm-canvas" className="relative h-[min(66vh,620px)] min-h-[440px] overflow-hidden rounded-[2rem] bg-sky-200 shadow-inner ring-1 ring-leaf/20">
    <Canvas shadows dpr={[1, 1.6]}>
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={45} />
      <Suspense fallback={null}>
        <BasicFarm chickens={chickens} />
      </Suspense>
      <OrbitControls target={[0, 0, 0]} enablePan enableDamping minDistance={5} maxDistance={24} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  </div>
}

useGLTF.preload(CHICKEN_URL)
