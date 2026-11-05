'use client'

import { Environment, PerspectiveCamera, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import { Box3, Group, Mesh, Vector3 } from 'three'
import { FarmhouseModel } from './Models'

const CHICKEN_URL = '/models/chicken.glb'

type ChickenMode = 'idle' | 'circle' | 'patrol'

function fitted(url: string, height: number) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const object = scene.clone(true)
    object.traverse(node => {
      if ((node as Mesh).isMesh) { node.castShadow = true; node.receiveShadow = true }
    })
    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = height / Math.max(size.y, 0.001)
    return { object, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number] }
  }, [scene, height])
}

function AnimatedChicken({ mode, phase, position, height }: { mode: ChickenMode; phase: number; position: [number, number, number]; height: number }) {
  const root = useRef<Group>(null)
  const { object, scale, offset } = fitted(CHICKEN_URL, height)

  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime + phase
    if (mode === 'idle') {
      root.current.position.set(position[0], Math.abs(Math.sin(t * 2.1)) * 0.035, position[2])
      root.current.rotation.y = Math.sin(t * 0.65) * 0.12
      root.current.rotation.z = Math.sin(t * 1.2) * 0.025
      return
    }
    if (mode === 'circle') {
      const angle = t * 0.42
      const x = -0.2 + Math.cos(angle) * 2.1
      const z = -0.9 + Math.sin(angle) * 1.25
      root.current.position.set(x, Math.abs(Math.sin(t * 4.5)) * 0.025, z)
      root.current.rotation.y = Math.atan2(Math.cos(angle), -Math.sin(angle))
      return
    }
    const x = Math.sin(t * 0.38) * 3.3
    const direction = Math.cos(t * 0.38) >= 0 ? 1 : -1
    root.current.position.set(x, Math.abs(Math.sin(t * 4.2)) * 0.025, 1.35)
    root.current.rotation.y = direction * Math.PI / 2
  })

  return <group ref={root}><group position={offset} scale={scale}><primitive object={object} /></group></group>
}

function SceneContents() {
  return <><Environment preset="sunset" /><ambientLight intensity={0.65} /><directionalLight castShadow position={[4, 7, 5]} intensity={2.2} color="#ffe0ae" shadow-mapSize={[1024, 1024]} /><hemisphereLight intensity={0.3} color="#fff4d6" groundColor="#63894b" /><group position={[0, -1.3, 0]}><mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[16, 12]} /><meshStandardMaterial color="#6da84c" roughness={1} /></mesh><FarmhouseModel height={3.2} /><AnimatedChicken mode="idle" phase={0} position={[0.65, 0, 1.15]} height={1.35} /><AnimatedChicken mode="circle" phase={1.4} position={[0, 0, 0]} height={1.1} /><AnimatedChicken mode="patrol" phase={2.8} position={[0, 0, 0]} height={1.05} /></group></>
}

export default function AuthScene() {
  return <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}><PerspectiveCamera makeDefault position={[0, 2.7, 11]} fov={40} /><Suspense fallback={null}><SceneContents /></Suspense></Canvas>
}

useGLTF.preload(CHICKEN_URL)
