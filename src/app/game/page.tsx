'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GameIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/game/dashboard/') }, [router])
  return null
}
