'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CheckCircle2, Egg, Gift, Loader2, Share2, ShieldCheck, Store, Trash2, UserRound, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { GameProvider, useGame } from '@/components/GameProvider'
import ReceiptModal, { type ReceiptPayload } from '@/components/game/ReceiptModal'
import { deleteNotification, fetchGlobalWithdrawals, fetchMyDeposit, fetchMyWithdrawal, fetchNotifications, markNotificationsRead, type GlobalWithdrawal } from '@/lib/api'
import { getSupabase } from '@/lib/supabase'
import { errMsg, rs, when } from '@/lib/format'
import type { GameNotification } from '@/lib/types'

function notificationTransactionId(notification: GameNotification) {
  return notification.message.match(/Transaction ID:\s*([0-9a-f-]{36})/i)?.[1] ?? null
}

function isReceiptNotification(notification: GameNotification) {
  return notification.title === 'Deposit Approved' || notification.title === 'Withdrawal Successful'
}

function NotificationCenter({ onReceipt }: { onReceipt: (notification: GameNotification) => Promise<void> }) {
  const { userId } = useGame()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState<GameNotification[]>([])
  const unreadCount = notifications.filter(notification => !notification.is_read).length

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setNotifications(await fetchNotifications(userId)) }
    catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => {
    void load()
    const refreshTimer = window.setInterval(() => void load(), 60_000)
    const channel = getSupabase().channel(`notifications-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'game_notifications', filter: `user_id=eq.${userId}` }, () => void load()).subscribe()
    return () => { window.clearInterval(refreshTimer); void getSupabase().removeChannel(channel) }
  }, [load, userId])

  async function toggle() {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen && unreadCount > 0) {
      try { await markNotificationsRead(userId); setNotifications(current => current.map(notification => ({ ...notification, is_read: true }))) }
      catch (e) { setError(errMsg(e)) }
    }
  }

  async function remove(notificationId: string) {
    try { await deleteNotification(userId, notificationId); setNotifications(current => current.filter(notification => notification.id !== notificationId)) }
    catch (e) { setError(errMsg(e)) }
  }

  return <div className="relative"><button type="button" onClick={() => void toggle()} aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`} className="relative rounded-full p-2 transition hover:bg-black/10"><Bell className="h-5 w-5" aria-hidden />{unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-4 text-white">{unreadCount > 9 ? '9+' : `+${unreadCount}`}</span>}</button>{open && <div className="fixed inset-0 z-[90] bg-black/10" onClick={() => setOpen(false)}><div role="dialog" aria-label="Notifications" onClick={event => event.stopPropagation()} className="fixed left-1/2 top-16 z-[100] w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-black/15"><div className="flex items-center justify-between bg-leaf-soft px-4 py-3"><p className="font-display text-lg text-leaf-dark">Notifications</p><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-full p-1 hover:bg-black/10"><X className="h-4 w-4" /></button></div><div className="max-h-[calc(100vh-7rem)] overflow-y-auto">{loading && <div className="flex items-center justify-center gap-2 p-5 text-sm font-bold text-ink/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}{error && <p className="p-3 text-xs font-bold text-red-700">{error}</p>}{!loading && !error && notifications.length === 0 && <p className="p-5 text-center text-sm font-bold text-ink/50">You are all caught up.</p>}{!loading && notifications.length > 0 && <ul className="divide-y divide-black/5">{notifications.map(notification => { const receiptNotification = isReceiptNotification(notification); return <li key={notification.id} className={`relative p-4 pr-12 ${receiptNotification ? 'cursor-pointer hover:bg-leaf-soft/40' : ''}`} onClick={() => { if (receiptNotification) void onReceipt(notification) }}><button type="button" onClick={event => { event.stopPropagation(); void remove(notification.id) }} aria-label={`Delete ${notification.title}`} className="absolute right-2 top-2 rounded-full p-1 text-ink/40 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button><p className="text-sm font-extrabold text-leaf-dark">{notification.title}</p><p className="mt-0.5 whitespace-pre-wrap text-xs font-semibold text-ink/70">{notification.message}</p>{notification.created_at && <p className="mt-1 text-[10px] font-bold text-ink/40">{when(notification.created_at)}</p>}</li> })}</ul>}</div></div></div>}</div>
}

function TopReceiptAlert({ receipt, onOpen, onShare, onClose }: { receipt: ReceiptPayload; onOpen: () => void; onShare: () => void; onClose: () => void }) {
  const isDeposit = receipt.type === 'deposit'
  const amount = isDeposit ? receipt.data.total_amount : receipt.data.amount
  return <div className="fixed left-0 top-0 z-[9999] w-full bg-leaf px-3 py-2.5 text-white shadow-xl"><div className="mx-auto flex w-full max-w-2xl items-center gap-2"><button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left"><CheckCircle2 className="h-6 w-6 shrink-0 text-yolk" /><span className="truncate text-sm font-black">{isDeposit ? `Deposit Approved! Rs ${amount.toLocaleString('en-US')} added` : `Withdrawal Approved! Rs ${amount.toLocaleString('en-US')} sent`}</span></button><button type="button" onClick={event => { event.stopPropagation(); onShare() }} aria-label="Share or download receipt" className="shrink-0 rounded-full p-2 hover:bg-white/15"><Share2 className="h-5 w-5" /></button><button type="button" onClick={event => { event.stopPropagation(); onClose() }} aria-label="Close alert" className="shrink-0 rounded-full p-2 hover:bg-white/15"><X className="h-5 w-5" /></button></div></div>
}

function GlobalWithdrawalToast() {
  const [withdrawals, setWithdrawals] = useState<GlobalWithdrawal[]>([])
  const [index, setIndex] = useState(0)
  useEffect(() => { let mounted = true; const load = async () => { try { const rows = await fetchGlobalWithdrawals(); if (mounted) setWithdrawals(rows) } catch { /* optional */ } }; void load(); const timer = window.setInterval(() => void load(), 60_000); return () => { mounted = false; window.clearInterval(timer) } }, [])
  useEffect(() => { if (withdrawals.length < 2) return; const timer = window.setInterval(() => setIndex(current => (current + 1) % withdrawals.length), 7000); return () => window.clearInterval(timer) }, [withdrawals.length])
  const withdrawal = withdrawals[index]
  if (!withdrawal) return null
  return <div className="pointer-events-none fixed left-1/2 top-[4.25rem] z-30 w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl bg-white/95 px-3 py-2 text-center text-xs font-extrabold text-leaf-dark shadow-lg ring-1 ring-leaf/20 backdrop-blur-sm">🎉 Congratulations! {withdrawal.masked_name} successfully withdrew {rs(withdrawal.amount)}.</div>
}

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, userId, email } = useGame()
  const path = usePathname() ?? ''
  const wide = path.startsWith('/game/admin')
  const [receipt, setReceipt] = useState<{ payload: ReceiptPayload; autoExport: boolean } | null>(null)
  const [alert, setAlert] = useState<ReceiptPayload | null>(null)

  const markSeenAndAlert = useCallback((next: ReceiptPayload) => {
    const key = `eggmarket:last_seen_receipt_id:${userId}:${next.type}`
    try { if (localStorage.getItem(key) === next.data.id) return; localStorage.setItem(key, next.data.id) } catch { /* storage unavailable */ }
    setAlert(next)
  }, [userId])

  const openReceipt = useCallback((next: ReceiptPayload, autoExport = false) => { setAlert(null); setReceipt({ payload: next, autoExport }) }, [])

  const openNotificationReceipt = useCallback(async (notification: GameNotification) => {
    const id = notificationTransactionId(notification)
    if (!id) return
    try {
      if (notification.title === 'Deposit Approved') {
        const data = await fetchMyDeposit(userId, id)
        if (data) openReceipt({ type: 'deposit', data, email })
      } else if (notification.title === 'Withdrawal Successful') {
        const data = await fetchMyWithdrawal(userId, id)
        if (data) openReceipt({ type: 'withdrawal', data, email })
      }
    } catch { /* keep the notification visible if a record is temporarily unavailable */ }
  }, [email, openReceipt, userId])

  useEffect(() => {
    const sb = getSupabase()
    const channel = sb.channel(`receipts-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_deposits', filter: `user_id=eq.${userId}` }, async payload => {
        const next = payload.new as Record<string, unknown>
        const previous = payload.old as Record<string, unknown>
        if (next.status === 'approved' && previous.status === 'pending') {
          const data = await fetchMyDeposit(userId, String(next.id)).catch(() => null)
          if (data) markSeenAndAlert({ type: 'deposit', data, email })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_withdrawals', filter: `user_id=eq.${userId}` }, async payload => {
        const next = payload.new as Record<string, unknown>
        const previous = payload.old as Record<string, unknown>
        if (next.status === 'completed' && previous.status === 'pending') {
          const data = await fetchMyWithdrawal(userId, String(next.id)).catch(() => null)
          if (data) markSeenAndAlert({ type: 'withdrawal', data, email })
        }
      })
      .subscribe()
    return () => { void sb.removeChannel(channel) }
  }, [email, markSeenAndAlert, userId])

  const tabs = [{ href: '/game/market/', label: 'Market', icon: Store }, { href: '/game/dashboard/', label: 'My Farm', icon: Egg }, { href: '/game/referral/', label: 'Refer', icon: Gift }, { href: '/game/profile/', label: 'Profile', icon: UserRound }, ...(isAdmin ? [{ href: '/game/admin/', label: 'Admin', icon: ShieldCheck }] : [])]
  return <div className={`mx-auto min-h-screen w-full bg-cream shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-[480px]'}`}>{alert && <TopReceiptAlert receipt={alert} onOpen={() => openReceipt(alert)} onShare={() => openReceipt(alert, true)} onClose={() => setAlert(null)} />}<header className="sticky top-0 z-40 flex items-center justify-between bg-leaf px-4 py-3 text-white shadow-md"><Link href="/game/dashboard/" className="font-display text-2xl leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">Egg Market</Link><div className="flex items-center gap-1.5"><NotificationCenter onReceipt={openNotificationReceipt} /><div className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-sm font-extrabold" aria-label="Wallet balance"><Wallet className="h-4 w-4 text-yolk" aria-hidden /> {rs(profile.wallet_balance)}</div></div></header><GlobalWithdrawalToast /><main className="px-3 pb-28 pt-4">{children}</main>{receipt && <ReceiptModal receipt={receipt.payload} autoExport={receipt.autoExport} onClose={() => setReceipt(null)} />}<nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] justify-around rounded-t-3xl border-t border-black/5 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.12)]">{tabs.map(t => { const active = path.startsWith(t.href.slice(0, -1)); const Icon = t.icon; return <Link key={t.href} href={t.href} className={`flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-extrabold transition ${active ? 'bg-leaf text-white' : 'text-ink/60'}`}><Icon className="h-5 w-5" aria-hidden />{t.label}</Link> })}</nav></div>
}

export default function GameLayout({ children }: { children: React.ReactNode }) { return <GameProvider><Shell>{children}</Shell></GameProvider> }
