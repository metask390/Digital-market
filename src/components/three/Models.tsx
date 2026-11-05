'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Mesh, Vector3, type Group } from 'three'
import { SafeGlb, Placeholder } from './SafeGlb'

export const CHICKEN_URL = '/chicken.glb'
export const FARMHOUSE_URL = '/models/farmhouse.glb'

/** Clones the GLB scene, enables shadows and fits it to a target height standing on y = 0. */
function useFitted(url: string, height: number) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const obj = scene.clone(true)
    obj.traverse(o => {
      if (url === FARMHOUSE_URL && /cow|sheep|animal|goat|pig|horse|donkey|duck|rooster|hen/iu.test(o.name)) {
        o.visible = false
      }
      if ((o as Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const box = new Box3().setFromObject(obj)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const s = height / (size.y || 1)
    return { obj, scale: s, offset: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number] }
  }, [scene, height])
}

function ChickenGlb({ height, phase }: { height: number; phase: number }) {
  const { obj, scale, offset } = useFitted(CHICKEN_URL, height)
  const ref = useRef<Group>(null)
  // Procedural idle: hop, sway and an occasional peck (the model has no baked clips).
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime + phase
    g.position.y = Math.abs(Math.sin(t * 2.2)) * 0.025 * height
    g.rotation.z = Math.sin(t * 1.3) * 0.035
    const peck = Math.max(0, Math.sin(t * 0.9 + 1.2) - 0.82) * 5
    g.rotation.x = peck * 0.5
  })
  return (
    <group ref={ref}>
      <group position={offset} scale={scale}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

export function ChickenModel({ height = 1.4, phase = 0, color }: { height?: number; phase?: number; color?: string }) {
  return (
    <SafeGlb fallback={<Placeholder color={color} height={height} />}>
      <ChickenGlb height={height} phase={phase} />
    </SafeGlb>
  )
}

function FarmhouseGlb({ height }: { height: number }) {
  const { obj, scale, offset } = useFitted(FARMHOUSE_URL, height)
  return (
    <group position={[0, 0, 0]}>
      <group position={offset} scale={scale}>
      <primitive object={obj} />
      </group>
    </group>
  )
}

export function FarmhouseModel({ height = 2.6 }: { height?: number }) {
  return (
    <SafeGlb fallback={<Placeholder color="#b91c1c" height={height} />}>
      <FarmhouseGlb height={height} />
    </SafeGlb>
  )
}

useGLTF.preload(CHICKEN_URL)
useGLTF.preload(FARMHOUSE_URL)
