'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Egg, Gift, Loader2, ShieldCheck, Store, UserRound, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { GameProvider, useGame } from '@/components/GameProvider'
import { fetchNotifications } from '@/lib/api'
import { errMsg, rs, when } from '@/lib/format'
import type { GameNotification } from '@/lib/types'

function NotificationCenter() {
  const { userId } = useGame()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState<GameNotification[]>([])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || notifications.length > 0) return
    setLoading(true); setError('')
    try { setNotifications(await fetchNotifications(userId)) }
    catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => void toggle()} aria-label={`Notifications${notifications.length ? ` (${notifications.length} unread)` : ''}`}
        className="relative rounded-full p-2 transition hover:bg-black/10">
        <Bell className="h-5 w-5" aria-hidden />
        {notifications.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-4 text-white">{notifications.length > 9 ? '9+' : notifications.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-ink shadow-xl ring-1 ring-black/10">
          <div className="flex items-center justify-between bg-leaf-soft px-3 py-2">
            <p className="font-display text-lg text-leaf-dark">Notifications</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X className="h-4 w-4" /></button>
          </div>
          {loading && <div className="flex items-center justify-center gap-2 p-5 text-sm font-bold text-ink/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
          {error && <p className="p-3 text-xs font-bold text-red-700">{error}</p>}
          {!loading && !error && notifications.length === 0 && <p className="p-5 text-center text-sm font-bold text-ink/50">You are all caught up.</p>}
          {!loading && notifications.length > 0 && <ul className="max-h-80 divide-y divide-black/5 overflow-y-auto">
            {notifications.map(notification => <li key={notification.id} className="relative p-3 pr-9">
              <button type="button" onClick={() => setNotifications(current => current.filter(item => item.id !== notification.id))} aria-label={`Dismiss ${notification.title}`}
                className="absolute right-2 top-2 rounded-full p-1 text-ink/40 hover:bg-black/5 hover:text-ink"><X className="h-3.5 w-3.5" /></button>
              <p className="text-sm font-extrabold text-leaf-dark">{notification.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink/70">{notification.message}</p>
              {notification.created_at && <p className="mt-1 text-[10px] font-bold text-ink/40">{when(notification.created_at)}</p>}
            </li>)}
          </ul>}
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useGame()
  const path = usePathname() ?? ''
  const wide = path.startsWith('/game/admin')

  const tabs = [
    { href: '/game/market/', label: 'Market', icon: Store },
    { href: '/game/dashboard/', label: 'My Farm', icon: Egg },
    { href: '/game/referral/', label: 'Refer', icon: Gift },
    { href: '/game/profile/', label: 'Profile', icon: UserRound },
    ...(isAdmin ? [{ href: '/game/admin/', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <div className={`mx-auto min-h-screen w-full bg-cream shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-[480px]'}`}>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-leaf px-4 py-3 text-white shadow-md">
        <Link href="/game/dashboard/" className="font-display text-2xl leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">Egg Market</Link>
        <div className="flex items-center gap-1.5">
          <NotificationCenter />
          <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-sm font-extrabold" aria-label="Wallet balance">
            <Wallet className="h-4 w-4 text-yolk" aria-hidden /> {rs(profile.wallet_balance)}
          </div>
        </div>
      </header>

      <main className="px-3 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] justify-around rounded-t-3xl border-t border-black/5 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">
        {tabs.map(t => {
          const active = path.startsWith(t.href.slice(0, -1))
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className={`flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-extrabold transition ${active ? 'bg-leaf text-white' : 'text-ink/60'}`}>
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
  return <GameProvider><Shell>{children}</Shell></GameProvider>
}
