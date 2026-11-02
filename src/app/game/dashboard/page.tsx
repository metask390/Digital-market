'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import { useGame } from '@/components/GameProvider'
import { ChickenView, ViewCanvasHost } from '@/components/three/ViewCanvas'
import { collectEgg, fetchChickenTypes, fetchMyChickens, sellEggs } from '@/lib/api'
import { CHICKEN_TIERS, EGG_COOLDOWN_MS } from '@/lib/chickens'
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

function FillingEgg({ progress, ready, value }: { progress: number; ready: boolean; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={ready ? `Egg ready to collect, worth ${num(value)} Rs` : `Egg filling, ${Math.round(progress)} percent complete`}>
      <div className={`egg-progress ${ready ? 'egg-progress-ready' : ''}`}>
        <div className="egg-progress-fill" style={{ height: `${progress}%` }} />
        <span className="egg-progress-shine" />
      </div>
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink/50">
        {ready ? 'Ready to collect' : 'Filling today'}
      </span>
    </div>
  )
}

function ChickenCard({ chicken, type, index, now, onCollect }: {
  chicken: UserChicken; type: ChickenType; index: number; now: number; onCollect: (c: UserChicken) => Promise<void>
}) {
  const lastCollectedAt = new Date(chicken.last_collected_at).getTime()
  const elapsed = now - lastCollectedAt
  const isEggReady = elapsed >= EGG_COOLDOWN_MS
  const [popping, setPopping] = useState(false)
  const [busy, setBusy] = useState(false)
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const dailyProgress = Math.min(100, Math.max(0, ((now - midnight.getTime()) / EGG_COOLDOWN_MS) * 100))

  async function click() {
    if (busy) return
    setBusy(true)
    setPopping(true)
    try {
      await onCollect(chicken)
      window.setTimeout(() => setPopping(false), 500)
    } catch { setPopping(false) } finally { setBusy(false) }
  }

  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-black/5">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: type.color }} />
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="font-display truncate text-base leading-tight">{type.name}</h2>
        <span className="ml-1 shrink-0 text-[10px] font-extrabold text-ink/50">#{index + 1}</span>
      </div>

      <ChickenView color={type.color} phase={index * 1.3} height={1.15} className="h-28 w-full" />

      {/* The filling egg follows the daily midnight cycle; the RPC remains the source of truth for collection. */}
      <div className="relative flex h-[104px] flex-col items-center justify-end pb-2">
        {isEggReady && !popping ? (
          <button onClick={click} aria-label={`Collect egg worth ${num(type.egg_value)} Rs`} className="flex flex-col items-center">
            <span className="font-display mb-0.5 rounded-full bg-yolk px-2 py-0.5 text-sm leading-none text-white shadow">+{num(type.egg_value)} Rs</span>
            <FillingEgg progress={100} ready value={type.egg_value} />
          </button>
        ) : popping ? (
          <span className="flex flex-col items-center animate-egg-pop">
            <span className="font-display mb-0.5 rounded-full bg-yolk px-2 py-0.5 text-sm leading-none text-white">+{num(type.egg_value)} Rs</span>
            <FillingEgg progress={100} ready value={type.egg_value} />
          </span>
        ) : (
          <FillingEgg progress={dailyProgress} value={type.egg_value} ready={false} />
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
