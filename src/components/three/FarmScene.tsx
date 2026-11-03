'use client'

import { Environment, Html, OrbitControls, Text, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, Group, Mesh, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three'
import { X } from 'lucide-react'
import type { ChickenType, UserChicken } from '@/lib/types'

const CHICKEN_URL = '/models/chicken.glb'
const BARN_URL = '/models/barn.glb'

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
    return { object, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] }
  }, [scene, targetHeight])
}

function roamPosition(time: number, phase: number) {
  return {
    x: Math.sin(time * 0.13 + phase) * 8.2 + Math.sin(time * 0.06 + phase * 0.7) * 0.65,
    z: Math.cos(time * 0.11 + phase) * 7.8 + Math.cos(time * 0.07 + phase * 0.4) * 0.65,
  }
}

function Barn() {
  const { object, scale, offset } = useFittedAsset(BARN_URL, 4.2)
  return <primitive object={object} position={[-2.4 + offset[0], offset[1], -5.2 + offset[2]]} scale={scale} />
}

function HayBale({ position }: { position: [number, number, number] }) {
  return <group position={position} rotation={[0, 0.3, 0]}><mesh castShadow receiveShadow><cylinderGeometry args={[0.38, 0.38, 0.8, 16]} /><meshStandardMaterial color="#d99b36" roughness={0.95} /></mesh><mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.38, 0.035, 8, 16]} /><meshStandardMaterial color="#8a5a20" roughness={1} /></mesh></group>
}

function Fence({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]}><mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[4.2, 0.12, 0.12]} /><meshStandardMaterial color="#8f5f32" roughness={0.9} /></mesh><mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[4.2, 0.12, 0.12]} /><meshStandardMaterial color="#8f5f32" roughness={0.9} /></mesh>{[-1.8, 0, 1.8].map(x => <mesh key={x} position={[x, 0.45, 0]} castShadow><boxGeometry args={[0.15, 1.1, 0.18]} /><meshStandardMaterial color="#70451f" roughness={0.9} /></mesh>)}</group>
}

function PerimeterFence() {
  return <><>{[-8, -4, 0, 4, 8].map(x => <Fence key={`north-${x}`} position={[x, 0, -8.7]} />)}</><>{[-8, -4, 0, 4, 8].map(x => <Fence key={`south-${x}`} position={[x, 0, 8.7]} />)}</><>{[-6, -2, 2, 6].map(z => <Fence key={`west-${z}`} position={[-9, 0, z]} rotation={Math.PI / 2} />)}</><>{[-6, -2, 2, 6].map(z => <Fence key={`east-${z}`} position={[9, 0, z]} rotation={Math.PI / 2} />)}</></>
}

function GrassGround() {
  const texture = useTexture('/textures/grass.png')
  useEffect(() => {
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(24, 24)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])
  return <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial map={texture} color="#b8dc72" roughness={1} /></mesh>
}

function DirtPath() {
  return <group position={[-2.4, 0.025, 1.1]}><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3.2, 19]} /><meshStandardMaterial color="#9b6a3d" roughness={1} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><planeGeometry args={[2.4, 19]} /><meshStandardMaterial color="#b8834c" roughness={1} /></mesh></group>
}

function Egg({ value, onClaim, claiming }: { value: number; onClaim: () => void; claiming: boolean }) {
  return <group position={[0, 0.44, 0]}><mesh scale={[0.34, 0.48, 0.34]} castShadow><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#fff8df" roughness={0.35} emissive="#ffc928" emissiveIntensity={0.2} /></mesh><Text position={[0, 0.86, 0]} fontSize={0.18} color="#fffaf0" outlineWidth={0.025} outlineColor="#4d321e" anchorX="center">+{value} Rs</Text><Html position={[0, 0.58, 0]} center><button type="button" onClick={event => { event.stopPropagation(); onClaim() }} disabled={claiming} className="pointer-events-auto rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_3px_0_#991b1b] transition hover:bg-red-700 active:translate-y-0.5 active:shadow-none disabled:opacity-60">{claiming ? 'Claiming…' : 'Claim'}</button></Html></group>
}

function WanderingChicken({ chicken, index, onSelect }: { chicken: UserChicken; index: number; onSelect: () => void }) {
  const root = useRef<Group>(null)
  const { animations } = useGLTF(CHICKEN_URL)
  const { object, scale, offset } = useFittedAsset(CHICKEN_URL, 1.15)
  const { actions } = useAnimations(animations, root)
  const phase = index * 1.73 + chicken.id.length * 0.11
  const walkAction = useMemo(() => Object.keys(actions).find(name => /walk/i.test(name)) ?? Object.keys(actions)[0], [actions])
  const idleAction = useMemo(() => Object.keys(actions).find(name => /idle|peck/i.test(name)) ?? walkAction, [actions, walkAction])
  const activeAction = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!idleAction) return
    actions[idleAction]?.reset().fadeIn(0.2).play()
    activeAction.current = idleAction
    return () => { actions[idleAction]?.fadeOut(0.2) }
  }, [actions, idleAction])

  useFrame(({ clock }) => {
    const group = root.current
    if (!group) return
    const cycleTime = (clock.elapsedTime + phase) % 10
    const walking = cycleTime < 5
    const desiredAction = walking ? walkAction : idleAction
    if (desiredAction && activeAction.current !== desiredAction) {
      actions[activeAction.current ?? '']?.fadeOut(0.2)
      actions[desiredAction]?.reset().fadeIn(0.2).play()
      activeAction.current = desiredAction
    }
    if (walking) {
      const t = clock.elapsedTime + phase
      const current = roamPosition(t, phase)
      const next = roamPosition(t + 0.03, phase)
      group.position.set(current.x, Math.abs(Math.sin(clock.elapsedTime * 5 + phase)) * 0.055, current.z)
      group.rotation.y = Math.atan2(next.x - current.x, next.z - current.z)
      group.rotation.z = Math.sin(clock.elapsedTime * 2.3 + phase) * 0.025
    } else {
      group.position.y = Math.abs(Math.sin(clock.elapsedTime * 1.4 + phase)) * 0.012
      group.rotation.z = Math.sin(clock.elapsedTime * 0.9 + phase) * 0.012
    }
  })

  return <group ref={root}><group position={offset} scale={scale} onClick={event => { event.stopPropagation(); onSelect() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}><primitive object={object} /></group></group>
}

function GroundEgg({ chicken, type, index, now, onCollect }: { chicken: UserChicken; type: ChickenType; index: number; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  const root = useRef<Group>(null)
  const phase = index * 1.73 + chicken.id.length * 0.11
  const isReady = dateKey(chicken.last_collected_at) !== dateKey(now)
  const wasReady = useRef(isReady)
  const dropStarted = useRef<number | null>(null)
  const groundPosition = useRef({ x: 0, z: 0, initialized: false })
  const [claiming, setClaiming] = useState(false)

  useFrame(({ clock }) => {
    if (!root.current) return
    if (isReady && !wasReady.current) dropStarted.current = clock.elapsedTime
    if (!isReady) { dropStarted.current = null; groundPosition.current.initialized = false; return }
    const t = clock.elapsedTime + phase
    const current = roamPosition(t, phase)
    const next = roamPosition(t + 0.03, phase)
    if (!groundPosition.current.initialized) {
      groundPosition.current = { x: current.x - (next.x - current.x) * 0.35, z: current.z - (next.z - current.z) * 0.35, initialized: true }
      if (dropStarted.current === null) dropStarted.current = clock.elapsedTime
    }
    wasReady.current = isReady
    const dropProgress = dropStarted.current === null ? 1 : Math.min(1, (clock.elapsedTime - dropStarted.current) / 0.75)
    const eased = 1 - Math.pow(1 - dropProgress, 3)
    root.current.position.set(groundPosition.current.x, 1.15 * (1 - eased), groundPosition.current.z)
  })

  async function claim() {
    if (claiming) return
    setClaiming(true)
    try { await onCollect(chicken) } finally { setClaiming(false) }
  }

  if (!isReady || claiming) return null
  return <group ref={root}><Egg value={type.egg_value} onClaim={() => void claim()} claiming={claiming} /></group>
}

function ChickenInfoSheet({ chicken, type, now, onClose }: { chicken: UserChicken; type: ChickenType; now: number; onClose: () => void }) {
  return <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 rounded-3xl bg-[#fffaf0]/95 p-4 text-ink shadow-2xl ring-1 ring-yolk/40 backdrop-blur-md sm:inset-x-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-leaf-dark">Chicken details</p><h2 className="font-display text-2xl text-barn">{type.name}</h2></div><button type="button" onClick={onClose} aria-label="Close chicken details" className="rounded-full bg-black/5 p-2 hover:bg-black/10"><X className="h-5 w-5" /></button></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm font-extrabold"><div className="rounded-2xl bg-yolk/20 px-3 py-2"><p className="text-[10px] uppercase text-ink/55">Egg value</p><p className="text-lg text-barn">+{type.egg_value.toLocaleString('en-US')} Rs</p></div><div className="rounded-2xl bg-leaf-soft px-3 py-2"><p className="text-[10px] uppercase text-ink/55">Next reset</p><p className="text-lg text-leaf-dark">{countdownUntilMidnight(now)}</p></div></div><p className="mt-2 text-xs font-bold text-ink/60">Chicken ID: {chicken.id.slice(0, 8)} · Tap the egg on the ground to claim it.</p></div>
}

function FarmWorld({ chickens, types, now, onCollect, onSelect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void>; onSelect: (chicken: UserChicken, type: ChickenType) => void }) {
  return <><Environment preset="sunset" /><ambientLight intensity={0.5} /><directionalLight castShadow position={[10, 12, 5]} intensity={1.5} shadow-mapSize={[1024, 1024]} /><hemisphereLight intensity={0.25} color="#fff1cf" groundColor="#3d6b39" /><group position={[0, -0.06, 0]}><GrassGround /><DirtPath /><Barn /><PerimeterFence /><HayBale position={[4.2, 0.4, -3.1]} /><HayBale position={[4.8, 0.4, -3.5]} />{chickens.map((chicken, index) => { const type = types.find(item => String(item.id) === String(chicken.chicken_type_id)); if (!type) return null; return <group key={chicken.id}><WanderingChicken chicken={chicken} index={index} onSelect={() => onSelect(chicken, type)} /><GroundEgg chicken={chicken} type={type} index={index} now={now} onCollect={onCollect} /></group> })}</group></>
}

export function FarmScene({ chickens, types, now, onCollect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  const [selected, setSelected] = useState<{ chicken: UserChicken; type: ChickenType } | null>(null)
  return <div className="relative h-[min(66vh,620px)] min-h-[440px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-sky-100 to-leaf-soft shadow-inner ring-1 ring-leaf/20"><Canvas shadows camera={{ position: [0, 7.5, 11], fov: 45 }} dpr={[1, 1.6]}><Suspense fallback={null}><FarmWorld chickens={chickens} types={types} now={now} onCollect={onCollect} onSelect={(chicken, type) => setSelected({ chicken, type })} /></Suspense><OrbitControls enablePan={false} minDistance={7} maxDistance={16} maxPolarAngle={Math.PI / 2.15} target={[0, 0.6, -1]} /></Canvas>{selected && <ChickenInfoSheet chicken={selected.chicken} type={selected.type} now={now} onClose={() => setSelected(null)} />}<div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">Tap a chicken to view details · Drag to explore</div></div>
}

useGLTF.preload(CHICKEN_URL)
useGLTF.preload(BARN_URL)
