'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Text } from '@react-three/drei'
import { Suspense } from 'react'
import type { UserChicken } from '@/lib/types'
import { ChickenModel, FarmhouseModel } from './Models'

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
  return (
    <section className="relative mb-4 h-[min(68vh,560px)] min-h-[380px] overflow-hidden rounded-[2rem] bg-[#8fcf67] shadow-lg ring-1 ring-black/10">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.55, 4.6], fov: 68 }}>
        <color attach="background" args={['#b8e5ff']} />
        <hemisphereLight intensity={1.7} color="#fff5dc" groundColor="#5d8d48" />
        <directionalLight castShadow position={[4, 8, 5]} intensity={2.2} shadow-mapSize={[1024, 1024]} />
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
        <PointerLockControls />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <div className="rounded-full bg-black/45 px-4 py-2 text-center text-xs font-extrabold text-white backdrop-blur-sm">
          Click the farm to walk inside · WASD to move · mouse to look
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl bg-black/35 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
        {chickens.length ? `${chickens.length} chicken${chickens.length === 1 ? '' : 's'} in the farmhouse` : 'Buy chickens to fill your farmhouse'}
      </div>
      {!chickens.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Text color="white" fontSize={0.2}>Your farmhouse is waiting for its first chicken</Text>
        </div>
      )}
    </section>
  )
}
