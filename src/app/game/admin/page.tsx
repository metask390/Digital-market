'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Check, CheckCircle2, Copy, Eye, Loader2, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { useGame } from '@/components/GameProvider'
import {
  adminApproveDeposit, adminApproveWithdrawal, adminPendingDeposits, adminPendingWithdrawals,
  adminBroadcastNotification, adminSendNotification,
  adminCreatePaymentAccount, adminDeletePaymentAccount, adminPaymentAccounts, adminRejectDeposit,
  adminRejectWithdrawal, adminScreenshotUrl, adminSetBlocked, adminTogglePaymentAccount, adminUpdatePaymentAccount,
  adminUsers, type AdminDeposit,
} from '@/lib/api'
import { errMsg, num, rs, when } from '@/lib/format'
import type { AdminUserRow, PaymentAccount, Withdrawal } from '@/lib/types'

type Tab = 'deposits' | 'withdrawals' | 'users' | 'messaging' | 'settings'
type AccountDraft = Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at'>
const EMPTY_ACCOUNT: AccountDraft = {
  kind: 'other', label: '', account_name: '', account_number: '', active: true, sort_order: 10,
}

export default function AdminPage() {
  const router = useRouter()
  const { email, isAdmin } = useGame()
  const [tab, setTab] = useState<Tab>('deposits')
  const [deposits, setDeposits] = useState<AdminDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(EMPTY_ACCOUNT)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [messageUserId, setMessageUserId] = useState('')
  const [directMessage, setDirectMessage] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  const loadAll = useCallback(async () => {
    try {
      const [d, w, u, pa] = await Promise.all([adminPendingDeposits(), adminPendingWithdrawals(), adminUsers(), adminPaymentAccounts()])
      setDeposits(d); setWithdrawals(w); setUsers(u); setAccounts(pa)
    } catch (e) { setError(errMsg(e)) }
  }, [])

  const exactAdmin = email.trim().toLowerCase() === 'muhammaddanyal4545@gmail.com'

  useEffect(() => {
    if (!exactAdmin) router.replace('/game/dashboard/')
    else void loadAll()
  }, [exactAdmin, loadAll, router])

  async function act(id: string, label: string, fn: () => Promise<void>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(''); setNotice(''); setBusyId(id)
    try { await fn(); setNotice(label); await loadAll() } catch (e) { setError(errMsg(e)) } finally { setBusyId(null) }
  }

  async function viewShot(path: string | null) {
    if (!path) return setError('No screenshot attached.')
    const url = await adminScreenshotUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
    else setError('Could not open the screenshot.')
  }

  async function copy(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) }
    catch { setError('Copy failed. Select the number and copy it manually.') }
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setNotice('')
    if (!accountDraft.label.trim() || !accountDraft.account_name.trim() || !accountDraft.account_number.trim()) {
      setError('Label, account holder name and account number are required.')
      return
    }
    setBusyId('account-form')
    try {
      const input = { ...accountDraft, label: accountDraft.label.trim(), account_name: accountDraft.account_name.trim(), account_number: accountDraft.account_number.trim() }
      if (editingAccountId) await adminUpdatePaymentAccount(editingAccountId, input)
      else await adminCreatePaymentAccount(input)
      setNotice(editingAccountId ? 'Payment account updated.' : 'Payment account added.')
      setEditingAccountId(null); setAccountDraft(EMPTY_ACCOUNT); await loadAll()
    } catch (err) { setError(errMsg(err)) } finally { setBusyId(null) }
  }

  function editAccount(account: PaymentAccount) {
    setEditingAccountId(account.id)
    setAccountDraft({ kind: account.kind, label: account.label, account_name: account.account_name, account_number: account.account_number, active: account.active, sort_order: account.sort_order })
    setTab('settings')
  }

  function cancelAccountEdit() { setEditingAccountId(null); setAccountDraft(EMPTY_ACCOUNT) }

  async function sendDirectMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageUserId) return setError('Select a user first.')
    if (!directMessage.trim()) return setError('Type a message first.')
    setError(''); setNotice(''); setBusyId('direct-message')
    try {
      await adminSendNotification(messageUserId, directMessage)
      setDirectMessage(''); setNotice('Direct message sent.'); await loadAll()
    } catch (err) { setError(errMsg(err)) } finally { setBusyId(null) }
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastMessage.trim()) return setError('Type an announcement first.')
    setError(''); setNotice(''); setBusyId('broadcast-message')
    try {
      await adminBroadcastNotification(broadcastMessage)
      setBroadcastMessage(''); setNotice('Announcement sent to all users.'); await loadAll()
    } catch (err) { setError(errMsg(err)) } finally { setBusyId(null) }
  }

  if (!isAdmin || !exactAdmin) {
    return (
      <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
        <ShieldAlert className="h-14 w-14 text-barn" />
        <p className="font-display text-3xl">Admins only</p>
        <p className="text-sm font-bold text-ink/60">Your account does not have access to this panel.</p>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'deposits', label: 'Deposits', count: deposits.length },
    { id: 'withdrawals', label: 'Withdrawals', count: withdrawals.length },
    { id: 'users', label: 'Users', count: users.length },
    { id: 'messaging', label: 'Messaging' },
    { id: 'settings', label: 'Settings' },
  ]
  const field = 'mt-1 w-full rounded-xl border-2 border-leaf/30 bg-white px-3 py-2.5 font-bold outline-none focus:border-leaf'
  const lab = 'text-xs font-extrabold uppercase tracking-wider text-leaf-dark'
  const btn = 'flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50'

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Admin Panel</h1>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${tab === t.id ? 'bg-leaf text-white' : 'bg-white text-ink/70 ring-1 ring-black/5'}`}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="rounded-xl bg-leaf-soft px-3 py-2 text-sm font-extrabold text-leaf-dark">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

      {tab === 'deposits' && (
        <section className="space-y-3">
          {deposits.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-ink/50">No pending deposits.</p>}
          {deposits.map(d => (
            <article key={d.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl">{d.quantity} × {d.chicken_name}</p>
                  <p className="font-display text-2xl text-leaf-dark">{rs(d.total_amount)}</p>
                </div>
                <p className="text-xs font-bold text-ink/50">{when(d.created_at)}</p>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-1 text-sm font-bold sm:grid-cols-3">
                <div><dt className="text-[10px] uppercase text-ink/50">Transaction ID</dt><dd className="break-all">{d.transaction_id}</dd></div>
                <div><dt className="text-[10px] uppercase text-ink/50">Sender</dt><dd>{d.sender_name}</dd></div>
                <div><dt className="text-[10px] uppercase text-ink/50">User</dt><dd className="break-all text-xs">{d.user_id}</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={`${btn} bg-sky-600`} onClick={() => void viewShot(d.screenshot_url)}><Eye className="h-4 w-4" /> Screenshot</button>
                <button disabled={busyId === d.id} className={`${btn} bg-leaf`}
                  onClick={() => void act(d.id, 'Deposit approved. Chickens added.', () => adminApproveDeposit(d.id), `Approve ${rs(d.total_amount)} and add ${d.quantity} chicken(s)?`)}>
                  {busyId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                </button>
                <button disabled={busyId === d.id} className={`${btn} bg-red-600`}
                  onClick={() => void act(d.id, 'Deposit rejected.', () => adminRejectDeposit(d.id), 'Reject this deposit?')}>
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'withdrawals' && (
        <section className="space-y-3">
          {withdrawals.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-ink/50">No pending withdrawals.</p>}
          {withdrawals.map(w => (
            <article key={w.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-2xl text-leaf-dark">{rs(w.amount)}</p>
                <p className="text-xs font-bold text-ink/50">{when(w.created_at)}</p>
              </div>
              <p className="mt-1 text-sm font-bold capitalize">{w.method} · {w.account_name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="select-all text-lg font-extrabold tracking-wide text-barn">{w.account_number}</span>
                <button onClick={() => void copy(w.id, w.account_number)} className="flex items-center gap-1 rounded-lg bg-black/5 px-2 py-1 text-xs font-extrabold">
                  {copiedId === w.id ? <CheckCircle2 className="h-3.5 w-3.5 text-leaf" /> : <Copy className="h-3.5 w-3.5" />} Copy Account Number
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={busyId === w.id} className={`${btn} bg-leaf`}
                  onClick={() => void act(w.id, 'Withdrawal marked completed.', () => adminApproveWithdrawal(w.id), `Mark ${rs(w.amount)} as paid? No money is returned to the user.`)}>
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button disabled={busyId === w.id} className={`${btn} bg-red-600`}
                  onClick={() => void act(w.id, 'Withdrawal rejected and refunded to the wallet.', () => adminRejectWithdrawal(w.id), `Reject and REFUND ${rs(w.amount)} to the user's wallet?`)}>
                  <X className="h-4 w-4" /> Reject &amp; Refund
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'users' && (
        <section className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-leaf-soft text-[11px] uppercase tracking-wider text-leaf-dark">
              <tr><th className="p-3">User</th><th className="p-3">Invested</th><th className="p-3">Wallet</th><th className="p-3">Hens</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-bold">
              {users.map(u => (
                <tr key={u.user_id} className={u.is_blocked ? 'bg-red-50' : ''}>
                  <td className="p-3"><p className="break-all">{u.email ?? 'unknown'}</p><p className="break-all text-[10px] text-ink/40">{u.user_id}</p></td>
                  <td className="p-3 whitespace-nowrap">{num(u.total_invested)} Rs</td>
                  <td className="p-3 whitespace-nowrap">{num(u.wallet_balance)} Rs</td>
                  <td className="p-3">{u.chickens}</td>
                  <td className="p-3 text-right">
                    <button disabled={busyId === u.user_id}
                      onClick={() => void act(u.user_id, u.is_blocked ? 'User unblocked.' : 'User blocked.', () => adminSetBlocked(u.user_id, !u.is_blocked))}
                      className={`${btn} ml-auto ${u.is_blocked ? 'bg-leaf' : 'bg-red-600'}`}>
                      <Ban className="h-4 w-4" /> {u.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td className="p-6 text-center text-ink/50" colSpan={5}>No users yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'messaging' && (
        <section className="grid gap-4 md:grid-cols-2">
          <form onSubmit={sendDirectMessage} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div><h2 className="font-display text-2xl">Direct Message</h2><p className="text-sm font-bold text-ink/60">Send a private notification to one user.</p></div>
            <label className="block"><span className={lab}>User</span><select value={messageUserId} onChange={e => setMessageUserId(e.target.value)} className={field}><option value="">Select user…</option>{users.map(user => <option key={user.user_id} value={user.user_id}>{user.email ?? user.user_id}</option>)}</select></label>
            <label className="block"><span className={lab}>Message</span><textarea value={directMessage} onChange={e => setDirectMessage(e.target.value)} rows={5} placeholder="Your account has been reviewed…" className={field} /></label>
            <button type="submit" disabled={busyId === 'direct-message'} className={`${btn} w-full justify-center bg-leaf`}>{busyId === 'direct-message' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Send Message</button>
          </form>
          <form onSubmit={sendBroadcast} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div><h2 className="font-display text-2xl">Broadcast</h2><p className="text-sm font-bold text-ink/60">Send an announcement to every registered user.</p></div>
            <label className="block"><span className={lab}>Announcement</span><textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={5} placeholder="New market update…" className={field} /></label>
            <button type="submit" disabled={busyId === 'broadcast-message'} className={`${btn} w-full justify-center bg-yolk-deep`}>{busyId === 'broadcast-message' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Send to All Users</button>
          </form>
        </section>
      )}

      {tab === 'settings' && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-leaf-soft p-4">
            <h2 className="font-display text-2xl">Payment accounts</h2>
            <p className="mt-1 text-sm font-bold text-ink/65">Add any Pakistani wallet or bank account. Only active accounts are shown to users in the Buy modal.</p>
          </div>
          <form onSubmit={saveAccount} className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-2">
            <label className="block"><span className={lab}>Wallet / Type</span>
              <select value={accountDraft.kind} onChange={e => setAccountDraft(s => ({ ...s, kind: e.target.value }))} className={field}>
                <option value="easypaisa">EasyPaisa</option><option value="jazzcash">JazzCash</option><option value="nayapay">NayaPay</option><option value="sadapay">SadaPay</option><option value="bank">Bank</option><option value="other">Other wallet</option>
              </select>
            </label>
            <label className="block"><span className={lab}>Display Label</span><input required value={accountDraft.label} onChange={e => setAccountDraft(s => ({ ...s, label: e.target.value }))} placeholder="NayaPay — Main" className={field} /></label>
            <label className="block"><span className={lab}>Account Holder Name</span><input required value={accountDraft.account_name} onChange={e => setAccountDraft(s => ({ ...s, account_name: e.target.value }))} className={field} /></label>
            <label className="block"><span className={lab}>Number / IBAN</span><input required value={accountDraft.account_number} onChange={e => setAccountDraft(s => ({ ...s, account_number: e.target.value }))} className={field} /></label>
            <label className="block"><span className={lab}>Display Order</span><input type="number" min="0" value={accountDraft.sort_order} onChange={e => setAccountDraft(s => ({ ...s, sort_order: Math.max(0, Number(e.target.value) || 0) }))} className={field} /></label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-extrabold"><input type="checkbox" checked={accountDraft.active} onChange={e => setAccountDraft(s => ({ ...s, active: e.target.checked }))} className="h-4 w-4 accent-[#1f9d55]" /> Show this account to users</label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busyId === 'account-form'} className="font-display flex flex-1 items-center justify-center gap-2 rounded-2xl bg-leaf py-3 text-lg text-white shadow-[0_4px_0_#146c3a]">
                {busyId === 'account-form' ? <Loader2 className="h-5 w-5 animate-spin" /> : editingAccountId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingAccountId ? 'Update Account' : 'Add Account'}
              </button>
              {editingAccountId && <button type="button" onClick={cancelAccountEdit} className="rounded-2xl bg-black/5 px-4 font-extrabold">Cancel</button>}
            </div>
          </form>
          <div className="space-y-2">
            {accounts.map(account => (
              <article key={account.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 ${!account.active ? 'opacity-60' : ''}`}>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-display text-xl">{account.label}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${account.active ? 'bg-leaf-soft text-leaf-dark' : 'bg-black/5 text-ink/50'}`}>{account.active ? 'Active' : 'Hidden'}</span></div><p className="text-sm font-bold">{account.account_name} · <span className="select-all text-barn">{account.account_number}</span></p></div>
                <div className="flex gap-2"><button onClick={() => editAccount(account)} className="rounded-xl bg-sky-600 p-2 text-white" aria-label={`Edit ${account.label}`}><Pencil className="h-4 w-4" /></button><button onClick={() => void act(account.id, account.active ? 'Account hidden from users.' : 'Account is now visible to users.', () => adminTogglePaymentAccount(account.id, !account.active))} className="rounded-xl bg-yolk px-3 py-2 text-sm font-extrabold text-white">{account.active ? 'Hide' : 'Show'}</button><button onClick={() => void act(account.id, 'Payment account deleted.', () => adminDeletePaymentAccount(account.id), `Delete ${account.label}?`)} className="rounded-xl bg-red-600 p-2 text-white" aria-label={`Delete ${account.label}`}><Trash2 className="h-4 w-4" /></button></div>
              </article>
            ))}
            {accounts.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-ink/50">No payment accounts yet. Add EasyPaisa, JazzCash, NayaPay, SadaPay, a bank, or any custom wallet above.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
