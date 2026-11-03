'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import { FarmScene } from '@/components/three/FarmScene'
import { useGame } from '@/components/GameProvider'
import { collectEgg, fetchChickenTypes, fetchMyChickens, sellEggs } from '@/lib/api'
import { CHICKEN_TIERS } from '@/lib/chickens'
import { errMsg, num, rs } from '@/lib/format'
import type { ChickenType, UserChicken } from '@/lib/types'

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
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

export default function DashboardPage() {
  const { userId, profile, refresh } = useGame()
  const [chickens, setChickens] = useState<UserChicken[] | null>(null)
  const [types, setTypes] = useState<ChickenType[]>(CHICKEN_TIERS)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selling, setSelling] = useState(false)
  const now = useNow()

  const load = useCallback(async () => {
    try {
      const [ownedChickens, chickenTypes] = await Promise.all([fetchMyChickens(userId), fetchChickenTypes()])
      setChickens(ownedChickens)
      setTypes(chickenTypes)
    } catch (e) {
      setError(errMsg(e))
      setChickens(previous => previous ?? [])
    }
  }, [userId])

  useEffect(() => { void load() }, [load])

  async function collect(chicken: UserChicken) {
    setError('')
    try {
      const value = await collectEgg(chicken.id)
      setNotice(`Collected +${num(value)} Rs of eggs`)
      await Promise.all([load(), refresh()])
    } catch (e) {
      setError(errMsg(e))
      await load()
      throw e
    }
  }

  async function sell() {
    if (profile.unsold_eggs_value <= 0) return
    setError('')
    setSelling(true)
    try {
      await sellEggs()
      setNotice('Eggs sold successfully!')
      await refresh()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setSelling(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-black/75 px-3 py-2 text-center text-xs font-extrabold text-white shadow-md">
        Egg Reset Time: 12:00 AM (Midnight) <span className="text-yolk">| {countdownUntilMidnight(now)}</span> <span className="mr-1 text-white/80">| انڈے کا ٹائم رات 12 بجے ہے</span>
      </div>
      <section className="flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-yolk to-yolk-deep p-3 text-white shadow-md">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">Total Eggs Value</p>
          <p className="font-display text-3xl leading-none drop-shadow-[0_2px_0_rgba(140,60,0,0.4)]">{rs(profile.unsold_eggs_value)}</p>
        </div>
        <button onClick={sell} disabled={selling || profile.unsold_eggs_value <= 0}
          className="font-display flex shrink-0 items-center gap-1.5 rounded-2xl bg-leaf px-4 py-3 text-base text-white shadow-[0_4px_0_#146c3a] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50">
          {selling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" aria-hidden />} Sell All Eggs
        </button>
      </section>

      {notice && <p role="status" className="rounded-2xl bg-leaf-soft px-3 py-2 text-sm font-extrabold text-leaf-dark">{notice}</p>}
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

      {chickens === null && <p className="py-10 text-center font-display text-xl text-leaf-dark">Preparing your farm...</p>}

      {chickens && chickens.length === 0 && (
        <div className="rounded-3xl bg-white p-8 text-center shadow-md">
          <p className="font-display text-2xl">Your coop is empty</p>
          <p className="mt-1 text-sm font-bold text-ink/60">Buy your first chicken to start collecting eggs.</p>
          <Link href="/game/market/" className="font-display mt-4 inline-block rounded-2xl bg-leaf px-6 py-3 text-lg text-white shadow-[0_4px_0_#146c3a]">Visit the Market</Link>
        </div>
      )}

      {chickens && chickens.length > 0 && <FarmScene chickens={chickens} types={types} now={now} onCollect={collect} />}
    </div>
  )
}
