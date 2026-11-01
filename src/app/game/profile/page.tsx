'use client'
import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, Check, Copy, Link2, Loader2, LogOut, PiggyBank, Wallet } from 'lucide-react'
import { useGame } from '@/components/GameProvider'
import { fetchMyWithdrawals, requestWithdrawal } from '@/lib/api'
import { MAX_WITHDRAW_PER_DAY, MIN_WITHDRAW } from '@/lib/chickens'
import { errMsg, num, rs, when } from '@/lib/format'
import type { Withdrawal } from '@/lib/types'

const STATUS_STYLE: Record<Withdrawal['status'], string> = {
  pending: 'bg-yolk/25 text-yolk-deep',
  completed: 'bg-leaf-soft text-leaf-dark',
  rejected: 'bg-red-100 text-red-700',
}

export default function ProfilePage() {
  const { userId, email, profile, refresh, logout } = useGame()
  const [history, setHistory] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('easypaisa')
  const [accNo, setAccNo] = useState('')
  const [accName, setAccName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [copied, setCopied] = useState(false)
  const [link, setLink] = useState('')

  useEffect(() => { setLink(`${window.location.origin}/?ref=${userId}`) }, [userId])

  const loadHistory = useCallback(async () => {
    try { setHistory(await fetchMyWithdrawals(userId)) } catch (e) { setError(errMsg(e)) }
  }, [userId])
  useEffect(() => { void loadHistory() }, [loadHistory])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { setError('Could not copy. Select the link and copy it manually.') }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < MIN_WITHDRAW) return setError(`Minimum withdrawal is ${MIN_WITHDRAW} Rs.`)
    if (amt > MAX_WITHDRAW_PER_DAY) return setError(`Maximum withdrawal is ${num(MAX_WITHDRAW_PER_DAY)} Rs per day.`)
    const availableLimit = profile.direct_withdraw_limit + profile.referral_withdraw_limit
    if (availableLimit <= 0) return setError('آپ کی وڈراول لیمٹ ختم ہو گئی ہے۔ مزید کمائی کے لیے اپنے دوستوں کو انوائٹ کریں۔')
    if (amt > availableLimit) return setError(`Withdrawal limit available is ${rs(availableLimit)}.`)
    if (amt > profile.wallet_balance) return setError('Insufficient wallet balance.')
    if (!accNo.trim() || !accName.trim()) return setError('Enter your account number and account name.')
    setBusy(true)
    try {
      await requestWithdrawal({ amount: amt, method, accountNumber: accNo.trim(), accountName: accName.trim() })
      setOk(`Withdrawal of ${rs(amt)} requested. It is pending approval.`)
      setAmount('')
      await Promise.all([refresh(), loadHistory()])
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'mt-1 w-full rounded-2xl border-2 border-leaf/30 bg-white px-4 py-3 font-bold outline-none focus:border-leaf'
  const labelCls = 'text-xs font-extrabold uppercase tracking-wider text-leaf-dark'

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-leaf to-leaf-dark p-4 text-white shadow-md">
        <p className="truncate text-xs font-bold text-white/80">{email}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 p-3">
            <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-white/80"><Wallet className="h-3.5 w-3.5" aria-hidden /> Wallet Balance</p>
            <p className="font-display text-2xl">{rs(profile.wallet_balance)}</p>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-white/80"><PiggyBank className="h-3.5 w-3.5" aria-hidden /> Total Invested</p>
            <p className="font-display text-2xl">{rs(profile.total_invested)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-md">
        <h2 className="font-display flex items-center gap-2 text-xl"><Link2 className="h-5 w-5 text-leaf" aria-hidden /> Referral Link</h2>
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={link} onFocus={e => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl bg-leaf-soft px-3 py-2.5 text-xs font-bold text-leaf-dark outline-none" aria-label="Referral link" />
          <button onClick={copyLink} className="flex items-center gap-1 rounded-xl bg-leaf px-3 py-2.5 text-sm font-extrabold text-white">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-md">
        {profile.total_invested > 0 ? (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-leaf-soft p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-leaf-dark">Direct limit</p><p className="font-display text-xl">{rs(profile.direct_withdraw_limit)}</p></div>
            <div className="rounded-2xl bg-yolk/15 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-yolk-deep">Referral limit</p><p className="font-display text-xl">{rs(profile.referral_withdraw_limit)}</p></div>
          </div>
        ) : (
          <p className="mb-3 rounded-2xl bg-black/5 px-3 py-3 text-center text-sm font-bold text-ink/60">Please buy a chicken to unlock your withdrawal limits.</p>
        )}
        {profile.direct_withdraw_limit + profile.referral_withdraw_limit <= 0 && <p className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-right text-sm font-bold leading-6 text-red-700" dir="rtl">آپ کی وڈراول لیمٹ ختم ہو گئی ہے۔ مزید کمائی کے لیے اپنے دوستوں کو انوائٹ کریں۔</p>}
        <h2 className="font-display flex items-center gap-2 text-xl"><ArrowDownToLine className="h-5 w-5 text-leaf" aria-hidden /> Withdraw</h2>
        <p className="text-xs font-bold text-ink/60">Min {MIN_WITHDRAW} Rs · Max {num(MAX_WITHDRAW_PER_DAY)} Rs per day. The amount is deducted immediately.</p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block">
            <span className={labelCls}>Method</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="bank">Bank account</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Account Number</span>
            <input value={accNo} onChange={e => setAccNo(e.target.value)} inputMode="numeric" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Account Name</span>
            <input value={accName} onChange={e => setAccName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Amount (Rs)</span>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal"
              placeholder={`${MIN_WITHDRAW} - ${MAX_WITHDRAW_PER_DAY}`} className={inputCls} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
          {ok && <p role="status" className="rounded-xl bg-leaf-soft px-3 py-2 text-sm font-bold text-leaf-dark">{ok}</p>}
          <button type="submit" disabled={busy || profile.direct_withdraw_limit + profile.referral_withdraw_limit <= 0}
            className="font-display flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3.5 text-lg text-white shadow-[0_5px_0_#146c3a] transition active:translate-y-1 active:shadow-none disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} Request Withdrawal
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-md">
        <h2 className="font-display text-xl">Withdrawal History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm font-bold text-ink/50">No withdrawals yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {history.map(w => (
              <li key={w.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-display text-lg leading-none">{rs(w.amount)}</p>
                  <p className="text-[11px] font-bold text-ink/50">{when(w.created_at)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold capitalize ${STATUS_STYLE[w.status]}`}>{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button onClick={() => void logout()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 py-3 text-sm font-extrabold text-ink/70">
        <LogOut className="h-4 w-4" aria-hidden /> Log out
      </button>
    </div>
  )
}
