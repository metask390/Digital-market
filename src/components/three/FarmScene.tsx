'use client'

import { Environment, Html, PointerLockControls, Text, useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { X } from 'lucide-react'
import type { ChickenType, UserChicken } from '@/lib/types'

const CHICKEN_URL = '/models/chicken.glb'
const COOP_URL = '/models/coop.glb'
const GROUND_URL = '/models/ground.glb'
const FENCE_URL = '/models/fence.glb'
const CORNER_FENCE_URL = '/models/fence_corner.glb'
const GROUND_SCALE: [number, number, number] = [5, 1, 5]
const PEN_LIMIT = 14.2
const LINE_Z = 2
const LINEUP_START = 23 * 3600 + 55 * 60

function dateKey(value: number | string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function secondsSinceMidnight(now: number) {
  const date = new Date(now)
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000
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

type AssetScale = number | [number, number, number]

function useGroundedModel(url: string, scale: AssetScale) {
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
    const scaleY = Array.isArray(scale) ? scale[1] : scale
    return { object, yOffset: -box.min.y * scaleY }
  }, [scene, scale])
}

function GroundModel() {
  const { scene } = useGLTF(GROUND_URL)
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(node => {
      if ((node as Mesh).isMesh) node.receiveShadow = true
    })
    return clone
  }, [scene])
  return <primitive object={object} position={[0, 0, 0]} scale={GROUND_SCALE} receiveShadow />
}

function GroundedAsset({ url, position, rotation = 0, scale = 1 }: { url: string; position: [number, number, number]; rotation?: number; scale?: AssetScale }) {
  const { object, yOffset } = useGroundedModel(url, scale)
  return <primitive object={object} position={[position[0], position[1] + yOffset, position[2]]} rotation={[0, rotation, 0]} scale={scale} />
}

function FarmArchitecture() {
  const fenceSlots = [-15, -10, -5, 0, 5, 10, 15]
  const sideSlots = [-10, -5, 0, 5, 10]
  return <group>
    <GroundModel />
    <GroundedAsset url={COOP_URL} position={[0, 0, -10]} scale={[2, 2, 2]} />
    {fenceSlots.map(x => <group key={`horizontal-${x}`}><GroundedAsset url={FENCE_URL} position={[x, 0, -15]} scale={1} /><GroundedAsset url={FENCE_URL} position={[x, 0, 15]} rotation={Math.PI} scale={1} /></group>)}
    {sideSlots.map(z => <group key={`vertical-${z}`}><GroundedAsset url={FENCE_URL} position={[-15, 0, z]} rotation={Math.PI / 2} scale={1} /><GroundedAsset url={FENCE_URL} position={[15, 0, z]} rotation={-Math.PI / 2} scale={1} /></group>)}
    {([[-15, -15], [15, -15], [-15, 15], [15, 15]] as [number, number][]).map(([x, z], index) => <GroundedAsset key={`corner-${index}`} url={CORNER_FENCE_URL} position={[x, 0, z]} rotation={index * Math.PI / 2} scale={1} />)}
  </group>
}

function PlayerMovement() {
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  useEffect(() => {
    camera.position.set(0, 2, 5)
    camera.lookAt(0, 1, -10)
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true }
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [camera])
  useFrame((_, delta) => {
    const direction = new Vector3()
    if (keys.current.KeyW || keys.current.ArrowUp) direction.z -= 1
    if (keys.current.KeyS || keys.current.ArrowDown) direction.z += 1
    if (keys.current.KeyA || keys.current.ArrowLeft) direction.x -= 1
    if (keys.current.KeyD || keys.current.ArrowRight) direction.x += 1
    if (!direction.lengthSq()) return
    direction.normalize().multiplyScalar(4.2 * Math.min(delta, 0.05))
    camera.translateX(direction.x)
    camera.translateZ(direction.z)
    camera.position.x = Math.max(-PEN_LIMIT, Math.min(PEN_LIMIT, camera.position.x))
    camera.position.z = Math.max(-PEN_LIMIT, Math.min(PEN_LIMIT, camera.position.z))
    camera.position.y = 2
  })
  return null
}

function Egg({ value, onClaim, claiming }: { value: number; onClaim: () => void; claiming: boolean }) {
  return <group position={[0, 0.43, 0]}><mesh scale={[0.34, 0.48, 0.34]} castShadow onClick={event => { event.stopPropagation(); onClaim() }}><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#fff8df" roughness={0.35} emissive="#ffc928" emissiveIntensity={0.25} /></mesh><Text position={[0, 0.85, 0]} fontSize={0.18} color="#fffaf0" outlineWidth={0.025} outlineColor="#4d321e" anchorX="center">+{value} Rs</Text><Html position={[0, 0.55, 0]} center><button type="button" onClick={event => { event.stopPropagation(); onClaim() }} disabled={claiming} className="pointer-events-auto rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_3px_0_#991b1b] disabled:opacity-60">{claiming ? 'Claiming…' : 'Claim'}</button></Html></group>
}

function seededSpawn(index: number, id: string) {
  let hash = index * 9301 + 49297
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 233280
  return new Vector3(-5 + (hash % 1000) / 100, 0, (hash * 7 % 1000) / 100)
}

function ChickenModel({ chicken, index, count, now, onSelect }: { chicken: UserChicken; index: number; count: number; now: number; onSelect: () => void }) {
  const root = useRef<Group>(null)
  const modelRef = useRef<Group>(null)
  const { animations } = useGLTF(CHICKEN_URL)
  const { scene } = useGLTF(CHICKEN_URL)
  const { actions } = useAnimations(animations, root)
  const object = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse(node => { if ((node as Mesh).isMesh) { node.castShadow = true; node.receiveShadow = true } })
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const scale = 1.35 / Math.max(size.y, 0.001)
    return { clone, scale }
  }, [scene])
  const phase = index * 1.57 + chicken.id.length * 0.17
  const actionRef = useRef<string | undefined>(undefined)
  const walkAction = useMemo(() => Object.keys(actions).find(name => /walk/i.test(name)) ?? Object.keys(actions)[0], [actions])
  const idleAction = useMemo(() => Object.keys(actions).find(name => /idle|peck/i.test(name)) ?? walkAction, [actions, walkAction])
  const spawn = useMemo(() => seededSpawn(index, chicken.id), [chicken.id, index])
  const line = useMemo(() => new Vector3((index - (count - 1) / 2) * 2, 0, LINE_Z), [count, index])
  const ready = dateKey(chicken.last_collected_at) !== dateKey(now)

  useLayoutEffect(() => {
    if (!modelRef.current) return
    const box = new Box3().setFromObject(modelRef.current)
    modelRef.current.position.y = -box.min.y
  }, [object])

  useEffect(() => {
    if (!idleAction) return
    actions[idleAction]?.reset().fadeIn(0.2).play()
    actionRef.current = idleAction
    return () => { actions[idleAction]?.fadeOut(0.2) }
  }, [actions, idleAction])

  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const seconds = secondsSinceMidnight(now)
    const lineup = seconds >= LINEUP_START || (ready && seconds < 15)
    const cycle = (clock.elapsedTime + phase) % 10
    const normalWalking = cycle < 5
    const wander = new Vector3(spawn.x + Math.sin(clock.elapsedTime * 0.2 + phase) * 1.8, 0, spawn.z + Math.cos(clock.elapsedTime * 0.17 + phase) * 1.8)
    const target = lineup ? line : wander
    const moving = lineup || normalWalking
    root.current.position.lerp(target, Math.min(1, delta * (lineup ? 0.65 : 0.9)))
    const difference = target.clone().sub(root.current.position)
    if (moving && difference.lengthSq() > 0.001) root.current.rotation.y = Math.atan2(difference.x, difference.z)
    const desired = moving ? walkAction : idleAction
    if (desired && desired !== actionRef.current) {
      actions[actionRef.current ?? '']?.fadeOut(0.2)
      actions[desired]?.reset().fadeIn(0.2).play()
      actionRef.current = desired
    }
  })

  return <group ref={root} position={spawn}><group ref={modelRef} scale={object.scale} onClick={event => { event.stopPropagation(); onSelect() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}><primitive object={object.clone} /></group></group>
}

function GroundEgg({ chicken, type, index, count, now, onCollect }: { chicken: UserChicken; type: ChickenType; index: number; count: number; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  const [claiming, setClaiming] = useState(false)
  const ready = dateKey(chicken.last_collected_at) !== dateKey(now)
  const position: [number, number, number] = [(index - (count - 1) / 2) * 2, 0, LINE_Z]
  if (!ready || claiming) return null
  async function claim() {
    if (claiming) return
    setClaiming(true)
    try { await onCollect(chicken) } finally { setClaiming(false) }
  }
  return <group position={position}><Egg value={type.egg_value} onClaim={() => void claim()} claiming={claiming} /></group>
}

function ChickenInfoSheet({ chicken, type, now, onClose }: { chicken: UserChicken; type: ChickenType; now: number; onClose: () => void }) {
  return <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 rounded-3xl bg-[#fffaf0]/95 p-4 text-ink shadow-2xl ring-1 ring-yolk/40 backdrop-blur-md sm:inset-x-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-leaf-dark">Chicken details</p><h2 className="font-display text-2xl text-barn">{type.name}</h2></div><button type="button" onClick={onClose} aria-label="Close chicken details" className="rounded-full bg-black/5 p-2 hover:bg-black/10"><X className="h-5 w-5" /></button></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm font-extrabold"><div className="rounded-2xl bg-yolk/20 px-3 py-2"><p className="text-[10px] uppercase text-ink/55">Egg value</p><p className="text-lg text-barn">+{type.egg_value.toLocaleString('en-US')} Rs</p></div><div className="rounded-2xl bg-leaf-soft px-3 py-2"><p className="text-[10px] uppercase text-ink/55">Next reset</p><p className="text-lg text-leaf-dark">{countdownUntilMidnight(now)}</p></div></div><p className="mt-2 text-xs font-bold text-ink/60">W A S D to walk · click the farm to look around · tap an egg to claim it.</p></div>
}

function FarmWorld({ chickens, types, now, onCollect, onSelect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void>; onSelect: (chicken: UserChicken, type: ChickenType) => void }) {
  return <><Environment preset="sunset" /><ambientLight intensity={0.5} /><directionalLight castShadow position={[10, 14, 5]} intensity={1.8} shadow-mapSize={[2048, 2048]} /><FarmArchitecture /><PlayerMovement /><PointerLockControls selector="#farm-canvas" />{chickens.map((chicken, index) => { const type = types.find(item => String(item.id) === String(chicken.chicken_type_id)); if (!type) return null; return <group key={chicken.id}><ChickenModel chicken={chicken} index={index} count={chickens.length} now={now} onSelect={() => onSelect(chicken, type)} /><GroundEgg chicken={chicken} type={type} index={index} count={chickens.length} now={now} onCollect={onCollect} /></group> })}</>
}

export function FarmScene({ chickens, types, now, onCollect }: { chickens: UserChicken[]; types: ChickenType[]; now: number; onCollect: (chicken: UserChicken) => Promise<void> }) {
  const [selected, setSelected] = useState<{ chicken: UserChicken; type: ChickenType } | null>(null)
  return <div id="farm-canvas" className="relative h-[min(66vh,620px)] min-h-[440px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-300 via-sky-100 to-amber-50 shadow-inner ring-1 ring-leaf/20"><Canvas shadows camera={{ position: [0, 2, 5], fov: 70 }} dpr={[1, 1.6]}><Suspense fallback={null}><FarmWorld chickens={chickens} types={types} now={now} onCollect={onCollect} onSelect={(chicken, type) => setSelected({ chicken, type })} /></Suspense></Canvas><div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white/90">Click to look around · W A S D to walk</div>{selected && <ChickenInfoSheet chicken={selected.chicken} type={selected.type} now={now} onClose={() => setSelected(null)} />}</div>
}

useGLTF.preload(CHICKEN_URL)
useGLTF.preload(COOP_URL)
useGLTF.preload(GROUND_URL)
useGLTF.preload(FENCE_URL)
useGLTF.preload(CORNER_FENCE_URL)
