'use client'
import { Component, type ReactNode } from 'react'

/** Shows a simple placeholder only if a promised GLB cannot be loaded. */
export class SafeGlb extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.warn('GLB failed to load, using placeholder', err) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function Placeholder({ color = '#fde68a', height = 1.4 }: { color?: string; height?: number }) {
  return (
    <mesh position={[0, height / 2, 0]} castShadow>
      <capsuleGeometry args={[height * 0.28, height * 0.4, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}
