'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { SunsetLights } from './Lights'
import { ChickenModel, FarmhouseModel } from './Models'

/** Top half of the login screen: farmhouse + a flock on a grassy knoll at sunset. */
export default function AuthScene() {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}>
      <PerspectiveCamera makeDefault position={[0, 2.6, 11.5]} fov={36} />
      <SunsetLights shadowSize={2048} />
      <Suspense fallback={null}>
        <group position={[0, -1.4, 0]}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[5.2, 64]} />
            <meshStandardMaterial color="#6fbf4a" roughness={1} />
          </mesh>
          <group position={[-1.2, 0, -1.2]} rotation-y={0.5}>
            <FarmhouseModel height={3} />
          </group>
          <group position={[1.4, 0, 1.2]} rotation-y={-0.5}>
            <ChickenModel height={1.5} />
          </group>
          <group position={[2.6, 0, -0.2]} rotation-y={-1}>
            <ChickenModel height={0.9} phase={1.7} />
          </group>
          <group position={[-0.5, 0, 2.1]} rotation-y={0.9}>
            <ChickenModel height={0.8} phase={3.1} />
          </group>
        </group>
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.7}
        minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
