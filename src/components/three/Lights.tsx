'use client'
import { Environment } from '@react-three/drei'

/**
 * Sunset image-based light + ambient + a shadow-casting sun.
 * drei's `preset="sunset"` is the Venice sunset HDR. It is self-hosted in public/hdri because the
 * preset's third-party CDN is unreliable (403): same lighting, no external runtime dependency.
 */
export function SunsetLights({ shadowSize = 1024 }: { shadowSize?: number }) {
  return (
    <>
      <Environment files="/hdri/venice_sunset_1k.hdr" />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[4, 6, 3]}
        intensity={2.1}
        color="#ffe2b8"
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
    </>
  )
}
