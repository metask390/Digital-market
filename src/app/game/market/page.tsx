'use client'
import { useEffect, useState } from 'react'
import { Coins, Egg } from 'lucide-react'
import { ChickenView, ViewCanvasHost } from '@/components/three/ViewCanvas'
import { BuyModal } from '@/components/BuyModal'
import { fetchChickenTypes } from '@/lib/api'
import { CHICKEN_TIERS } from '@/lib/chickens'
import { num } from '@/lib/format'
import type { ChickenType } from '@/lib/types'

export default function MarketPage() {
  const [types, setTypes] = useState<ChickenType[]>(CHICKEN_TIERS)
  const [selectedChicken, setSelectedChicken] = useState<ChickenType | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchChickenTypes().then(setTypes).catch(() => undefined) }, [])

  return (
    <ViewCanvasHost>
      <div className="mb-4 rounded-3xl bg-gradient-to-br from-yolk to-yolk-deep p-4 text-white shadow-md">
        <h1 className="font-display text-3xl drop-shadow-[0_2px_0_rgba(140,60,0,0.4)]">Chicken Market</h1>
        <p className="text-sm font-bold text-white/90">Every hen lays one egg every 24 hours. Pick your flock.</p>
      </div>

      {toast && (
        <p role="status" className="mb-3 rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-extrabold text-leaf-dark">{toast}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {types.map((t, i) => (
          <article key={t.id} className="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-black/5 [animation:var(--animate-rise)]"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: t.color }} />
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ background: t.color }}>
                Tier {i + 1}
              </span>
              <span className="flex items-center gap-1 text-xs font-extrabold text-yolk-deep"><Egg className="h-3.5 w-3.5" aria-hidden />{num(t.egg_value)} Rs</span>
            </div>

            <ChickenView color={t.color} phase={i * 0.9} height={1.1 + i * 0.04} className="h-36 w-full" />

            <div className="px-3 pb-3 text-center">
              <h2 className="font-display text-lg leading-tight">{t.name}</h2>
              <p className="text-[11px] font-bold text-ink/60">lays {num(t.egg_value)} Rs / egg</p>
              <button onClick={() => { setToast(''); setSelectedChicken(t) }}
                className="font-display mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-leaf py-2 text-base text-white shadow-[0_4px_0_#146c3a] transition active:translate-y-0.5 active:shadow-none">
                <Coins className="h-4 w-4" aria-hidden /> Buy {num(t.price)} Rs
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedChicken && (
        <BuyModal chicken={selectedChicken} onCloseAction={() => setSelectedChicken(null)}
          onDoneAction={msg => { setSelectedChicken(null); setToast(msg); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      )}
    </ViewCanvasHost>
  )
}
