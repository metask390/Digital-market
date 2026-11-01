'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2, Timer } from 'lucide-react'
import { useGame } from '@/components/GameProvider'
import { ChickenView, ViewCanvasHost } from '@/components/three/ViewCanvas'
import { collectEgg, fetchChickenTypes, fetchMyChickens, sellEggs } from '@/lib/api'
import { CHICKEN_TIERS, EGG_COOLDOWN_MS } from '@/lib/chickens'
import { clock, errMsg, num, rs } from '@/lib/format'
import type { ChickenType, UserChicken } from '@/lib/types'

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function ChickenCard({ chicken, type, index, now, onCollect }: {
  chicken: UserChicken; type: ChickenType; index: number; now: number; onCollect: (c: UserChicken) => Promise<void>
}) {
  const lastCollectedAt = new Date(chicken.last_collected_at).getTime()
  const elapsed = now - lastCollectedAt
  const left = EGG_COOLDOWN_MS - elapsed
  const isEggReady = elapsed >= EGG_COOLDOWN_MS
  const [popping, setPopping] = useState(false)
  const [busy, setBusy] = useState(false)
  const progress = Math.min(100, Math.max(0, ((EGG_COOLDOWN_MS - left) / EGG_COOLDOWN_MS) * 100))

  async function click() {
    if (busy) return
    setBusy(true)
    setPopping(true)
    try { await onCollect(chicken) } catch { setPopping(false) } finally { setBusy(false) }
  }

  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-black/5">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: type.color }} />
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="font-display truncate text-base leading-tight">{type.name}</h2>
        <span className="ml-1 shrink-0 text-[10px] font-extrabold text-ink/50">#{index + 1}</span>
      </div>

      <ChickenView color={type.color} phase={index * 1.3} height={1.15} className="h-28 w-full" />

      <div className="mx-3 flex items-center justify-center gap-1.5 rounded-full bg-leaf-soft px-2 py-1 text-xs font-extrabold tabular-nums text-leaf-dark">
        <Timer className="h-3.5 w-3.5" aria-hidden />
        {isEggReady ? 'Egg is ready!' : clock(left)}
      </div>

      {/* Bottom zone: egg appears here once 24 hours have passed */}
      <div className="relative flex h-[76px] flex-col items-center justify-end pb-2">
        {isEggReady && !popping ? (
          <button onClick={click} aria-label={`Collect egg worth ${num(type.egg_value)} Rs`} className="flex flex-col items-center">
            <span className="font-display mb-0.5 rounded-full bg-yolk px-2 py-0.5 text-sm leading-none text-white shadow">+{num(type.egg_value)} Rs</span>
            <span className="egg-shape animate-egg-glow cursor-pointer" />
          </button>
        ) : popping ? (
          <span className="flex flex-col items-center animate-egg-pop">
            <span className="font-display mb-0.5 rounded-full bg-yolk px-2 py-0.5 text-sm leading-none text-white">+{num(type.egg_value)} Rs</span>
            <span className="egg-shape" />
          </span>
        ) : (
          <div className="w-4/5">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-yolk" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center text-[10px] font-bold text-ink/50">next egg: +{num(type.egg_value)} Rs</p>
          </div>
        )}
      </div>
    </article>
  )
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
      const [c, t] = await Promise.all([fetchMyChickens(userId), fetchChickenTypes()])
      setChickens(c)
      setTypes(t)
    } catch (e) {
      setError(errMsg(e))
      setChickens(prev => prev ?? [])
    }
  }, [userId])

  useEffect(() => { void load() }, [load])

  async function collect(c: UserChicken) {
    setError('')
    try {
      const v = await collectEgg(c.id)
      setNotice(`Collected +${num(v)} Rs of eggs`)
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
    <ViewCanvasHost>
      {/* Sell Eggs */}
      <section className="mb-3 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-yolk to-yolk-deep p-3 text-white shadow-md">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">Total Eggs Value</p>
          <p className="font-display text-3xl leading-none drop-shadow-[0_2px_0_rgba(140,60,0,0.4)]">{rs(profile.unsold_eggs_value)}</p>
        </div>
        <button onClick={sell} disabled={selling || profile.unsold_eggs_value <= 0}
          className="font-display flex shrink-0 items-center gap-1.5 rounded-2xl bg-leaf px-4 py-3 text-base text-white shadow-[0_4px_0_#146c3a] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50">
          {selling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" aria-hidden />} Sell All Eggs
        </button>
      </section>

      {notice && <p role="status" className="mb-2 rounded-2xl bg-leaf-soft px-3 py-2 text-sm font-extrabold text-leaf-dark">{notice}</p>}
      {error && <p role="alert" className="mb-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

      {chickens === null && <p className="py-10 text-center font-display text-xl text-leaf-dark">Counting your hens...</p>}

      {chickens && chickens.length === 0 && (
        <div className="rounded-3xl bg-white p-8 text-center shadow-md">
          <p className="font-display text-2xl">Your coop is empty</p>
          <p className="mt-1 text-sm font-bold text-ink/60">Buy your first chicken to start collecting eggs.</p>
          <Link href="/game/market/" className="font-display mt-4 inline-block rounded-2xl bg-leaf px-6 py-3 text-lg text-white shadow-[0_4px_0_#146c3a]">Visit the Market</Link>
        </div>
      )}

      {chickens && chickens.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {chickens.map((c, i) => {
            const type = types.find(t => String(t.id) === String(c.chicken_type_id))
            if (!type) return null
            return <ChickenCard key={c.id} chicken={c} type={type} index={i} now={now} onCollect={collect} />
          })}
        </div>
      )}
    </ViewCanvasHost>
  )
}
