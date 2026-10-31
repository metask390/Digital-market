'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Egg, ShieldCheck, Store, UserRound, Wallet } from 'lucide-react'
import { GameProvider, useGame } from '@/components/GameProvider'
import { rs } from '@/lib/format'

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useGame()
  const path = usePathname() ?? ''
  const wide = path.startsWith('/game/admin')

  const tabs = [
    { href: '/game/market/', label: 'Market', icon: Store },
    { href: '/game/dashboard/', label: 'My Farm', icon: Egg },
    { href: '/game/profile/', label: 'Profile', icon: UserRound },
    ...(isAdmin ? [{ href: '/game/admin/', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <div className={`mx-auto min-h-screen w-full bg-cream shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-[480px]'}`}>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-leaf px-4 py-3 text-white shadow-md">
        <Link href="/game/dashboard/" className="font-display text-2xl leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">Egg Market</Link>
        <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-sm font-extrabold" aria-label="Wallet balance">
          <Wallet className="h-4 w-4 text-yolk" aria-hidden /> {rs(profile.wallet_balance)}
        </div>
      </header>

      <main className="px-3 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] justify-around rounded-t-3xl border-t border-black/5 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
        {tabs.map(t => {
          const active = path.startsWith(t.href.slice(0, -1))
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className={`flex min-w-16 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] font-extrabold transition ${
                active ? 'bg-leaf text-white' : 'text-ink/60'}`}>
              <Icon className="h-5 w-5" aria-hidden />
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      <Shell>{children}</Shell>
    </GameProvider>
  )
}
