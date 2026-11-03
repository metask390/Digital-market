'use client'

import { Environment, Html, OrbitControls, Text, useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Group, Mesh, Vector3 } from 'three'
import type { ChickenType, UserChicken } from '@/lib/types'

const CHICKEN_URL = '/models/chicken.glb'
const BARN_URL = '/models/barn.glb'
const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(value: number | string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function countdownUntilMidnight(now: number) {
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)
  const totalSeconds = Math.max(0, Math.floor((nextMidnight.getTime() - now) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':')
}

function useFittedAsset(url: string, targetHeight: number) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const object = scene.clone(true)
    object.traverse(node => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = targetHeight / Math.max(size.y, 0.001)
    return {
      object,
      scale,
      offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number],
    }
  }, [scene, targetHeight])
}

function roamPosition(time: number, phase: number) {
  return {
    x: Math.sin(time * 0.31 + phase) * 8.5 + Math.sin(time * 0.13 + phase * 0.7) * 0.9,
    z: Math.cos(time * 0.25 + phase) * 8.2 + Math.cos(time * 0.17 + phase * 0.4) * 0.8,
  }
}

function Barn() {
  const { object, scale, offset } = useFittedAsset(BARN_URL, 4.2)
  return <primitive object={object} position={[-2.4 + offset[0], offset[1], -5.2 + offset[2]]} scale={scale} />
}

function HayBale({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.3, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.8, 16]} />
        <meshStandardMaterial color="#d99b36" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.38, 0.035, 8, 16]} />
        <meshStandardMaterial color="#8a5a20" roughness={1} />
      </mesh>
    </group>
  )
}

function Fence({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[4.2, 0.12, 0.12]} /><meshStandardMaterial color="#8f5f32" roughness={0.9} /></mesh>
      <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[4.2, 0.12, 0.12]} /><meshStandardMaterial color="#8f5f32" roughness={0.9} /></mesh>
      {[-1.8, 0, 1.8].map(x => <mesh key={x} position={[x, 0.45, 0]} castShadow><boxGeometry args={[0.15, 1.1, 0.18]} /><meshStandardMaterial color="#70451f" roughness={0.9} /></mesh>)}
    </group>
  )
}

function Egg({ value, ready, onClaim, claiming }: { value: number; ready: boolean; onClaim: () => void; claiming: boolean }) {
  return (
    <group position={[0, 0.44, 0]}>
      <mesh scale={[0.34, 0.48, 0.34]} castShadow>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={ready ? '#fff8df' : '#f4d99a'} roughness={0.35} emissive={ready ? '#ffc928' : '#000000'} emissiveIntensity={ready ? 0.2 : 0} />
      </mesh>
      <Text position={[0, 0.86, 0]} fontSize={0.18} color={ready ? '#fffaf0' : '#6b4a2b'} outlineWidth={0.025} outlineColor="#4d321e" anchorX="center">+{value} Rs</Text>
      {ready && <Html position={[0, 0.58, 0]} center><button type="button" onClick={onClaim} disabled={claiming} className="pointer-events-auto rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_3px_0_#991b1b] transition hover:bg-red-700 active:translate-y-0.5 active:shadow-none disabled:opacity-60">{claiming ? 'Claiming…' : 'Claim'}</button></Html>}
    </group>
  )
}

function WanderingChicken({ chicken, type, index, now }: { chicken: UserChicken; type: ChickenType; index: number; now: number }) {
  const root = useRef<Group>(null)
  const { animations } = useGLTF(CHICKEN_URL)
  const { object, scale, offset } = useFittedAsset(CHICKEN_URL, 1.15)
  const { actions } = useAnimations(animations, root)
  const phase = index * 1.73 + chicken.id.length * 0.11

  useEffect(() => {
    const animation = Object.keys(actions).find(name => /walk|idle|peck/i.test(name)) ?? Object.keys(actions)[0]
    if (animation) {
      actions[animation]?.reset().fadeIn(0.2).play()
      return () => { actions[animation]?.fadeOut(0.2) }
    }
  }, [actions])

  useFrame(({ clock }) => {
    const group = root.current
    if (!group) return
    const t = clock.elapsedTime + phase
    const current = roamPosition(t, phase)
    const next = roamPosition(t + 0.03, phase)
    group.position.set(current.x, Math.abs(Math.sin(clock.elapsedTime * 5 + phase)) * 0.055, current.z)
    group.rotation.y = Math.atan2(next.x - current.x, next.z - current.z)
    group.rotation.z = Math.sin(clock.elapsedTime * 2.3 + phase) * 0.025
  })

  return (
    <group ref={root}>
      <group position={offset} scale={scale}><primitive object={object} /></group>
      <ChickenLabels type={type} now={now} />
    </group>
  )
}

function GroundEgg({ chicken, type, index, now, onCollect }: { chicken: UserChicken; type: ChickenType; index: number; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  const root = useRef<Group>(null)
  const phase = index * 1.73 + chicken.id.length * 0.11
  const isReady = dateKey(chicken.last_collected_at) !== dateKey(now)
  const wasReady = useRef(isReady)
  const dropStarted = useRef<number | null>(null)
  const [claiming, setClaiming] = useState(false)

  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime + phase
    const current = roamPosition(t, phase)
    const next = roamPosition(t + 0.03, phase)
    if (isReady && !wasReady.current) dropStarted.current = clock.elapsedTime
    if (!isReady) dropStarted.current = null
    wasReady.current = isReady
    const dropProgress = dropStarted.current === null ? 1 : Math.min(1, (clock.elapsedTime - dropStarted.current) / 0.75)
    const eased = 1 - Math.pow(1 - dropProgress, 3)
    const dropY = isReady ? 1.15 * (1 - eased) : 0
    root.current.position.set(current.x - (next.x - current.x) * 0.35, dropY, current.z - (next.z - current.z) * 0.35)
    root.current.rotation.y = Math.atan2(next.x - current.x, next.z - current.z)
  })

  async function claim() {
    if (claiming) return
    setClaiming(true)
    try { await onCollect(chicken) } finally { setClaiming(false) }
  }

  return <group ref={root}><Egg value={type.egg_value} ready={isReady && !claiming} onClaim={() => void claim()} claiming={claiming} /></group>
}

function ChickenLabels({ type, now }: { type: ChickenType; now: number }) {
  return (
    <Html position={[0, 3.1, 0]} center distanceFactor={8}>
      <div className="min-w-28 rounded-lg bg-black/55 px-2 py-1 text-center text-[10px] font-extrabold leading-4 text-white shadow-lg backdrop-blur-sm">
        <div>Midnight in {countdownUntilMidnight(now)}</div>
        <div>{type.name}</div>
        <div>{type.price.toLocaleString('en-US')} Rs</div>
      </div>
    </Html>
  )
}

function FarmWorld({ chickens, types, now, onCollect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <directionalLight castShadow position={[10, 12, 5]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
      <hemisphereLight intensity={0.25} color="#fff1cf" groundColor="#3d6b39" />
      <group position={[0, -0.06, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#4ade80" roughness={1} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[22, 18]} /><meshStandardMaterial color="#87ce68" roughness={1} /></mesh>
        <Barn />
        <Fence position={[-4.6, 0, 1.7]} rotation={0.05} />
        <Fence position={[4.1, 0, 2.8]} rotation={-0.12} />
        <HayBale position={[4.2, 0.4, -3.1]} />
        <HayBale position={[4.8, 0.4, -3.5]} />
        {chickens.map((chicken, index) => {
          const type = types.find(item => String(item.id) === String(chicken.chicken_type_id))
          if (!type) return null
          return (
            <group key={chicken.id}>
              <WanderingChicken chicken={chicken} type={type} index={index} now={now} />
              <GroundEgg chicken={chicken} type={type} index={index} now={now} onCollect={onCollect} />
            </group>
          )
        })}
      </group>
    </>
  )
}

export function FarmScene({ chickens, types, now, onCollect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  return (
    <div className="relative h-[min(66vh,620px)] min-h-[440px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-sky-100 to-leaf-soft shadow-inner ring-1 ring-leaf/20">
      <Canvas shadows camera={{ position: [0, 7.5, 11], fov: 45 }} dpr={[1, 1.6]}>
        <Suspense fallback={null}>
          <FarmWorld chickens={chickens} types={types} now={now} onCollect={onCollect} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={7} maxDistance={16} maxPolarAngle={Math.PI / 2.15} target={[0, 0.6, -1]} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">Drag to explore your farm</div>
    </div>
  )
}

useGLTF.preload(CHICKEN_URL)
useGLTF.preload(BARN_URL)
