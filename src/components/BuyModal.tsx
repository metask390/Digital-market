'use client'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ImageUp, Loader2, X } from 'lucide-react'
import { fetchSettings, submitDeposit } from '@/lib/api'
import { useGame } from '@/components/GameProvider'
import { errMsg, num } from '@/lib/format'
import type { ChickenType, GameSettings } from '@/lib/types'

const MAX_FILE = 8 * 1024 * 1024

function Row({ label, name, number }: { label: string; name: string; number: string }) {
  if (!name && !number) return null
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-leaf/20">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-leaf-dark">{label}</p>
      <p className="text-sm font-extrabold">{name || '-'}</p>
      <p className="select-all text-base font-extrabold tracking-wide text-barn">{number || '-'}</p>
    </div>
  )
}

export function BuyModal({ chicken, onClose, onDone }: {
  chicken: ChickenType; onClose: () => void; onDone: (message: string) => void
}) {
  const { userId } = useGame()
  const [qty, setQty] = useState('1')
  const [txn, setTxn] = useState('')
  const [sender, setSender] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [settingsErr, setSettingsErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetchSettings().then(setSettings).catch(e => setSettingsErr(errMsg(e, 'Could not load payment details.')))
  }, [])

  const quantity = useMemo(() => {
    const n = Math.floor(Number(qty))
    return Number.isFinite(n) && n >= 1 ? n : 0
  }, [qty])
  const total = quantity * chicken.price

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!quantity) return setError('Enter a quantity of 1 or more.')
    if (quantity > 100000) return setError('That quantity is too large.')
    if (!txn.trim() || !sender.trim()) return setError('Transaction ID and sender name are required.')
    if (!file) return setError('Please upload your payment screenshot.')
    if (!file.type.startsWith('image/')) return setError('Screenshot must be an image file.')
    if (file.size > MAX_FILE) return setError('Screenshot must be smaller than 8 MB.')
    setBusy(true)
    try {
      await submitDeposit({ userId, chickenTypeId: chicken.id, quantity, transactionId: txn.trim(), senderName: sender.trim(), screenshot: file })
      setDone(true)
      setTimeout(() => onDone(`Order received: ${quantity} x ${chicken.name} (${num(total)} Rs). Your chickens arrive once the payment is approved.`), 1800)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const hasPay = settings && (settings.easypaisa_number || settings.jazzcash_number || settings.bank_account_number)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Buy ${chicken.name}`}>
      <div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[2rem] bg-cream p-5 shadow-2xl sm:rounded-[2rem]">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-leaf" />
            <p className="font-display text-3xl text-leaf-dark">Order submitted!</p>
            <p className="text-sm font-bold">We will approve your payment shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl">Buy {chicken.name}</h2>
                <p className="text-xs font-bold text-ink/60">{num(chicken.price)} Rs each · lays {num(chicken.egg_value)} Rs / egg</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full bg-black/5 p-2"><X className="h-5 w-5" /></button>
            </div>

            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Quantity</span>
              <input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                className="mt-1 w-full rounded-2xl border-2 border-leaf/30 bg-white px-4 py-3 text-lg font-extrabold outline-none focus:border-leaf" />
            </label>

            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-yolk to-yolk-deep px-4 py-3 text-white">
              <span className="text-sm font-extrabold">{quantity || 0} × {num(chicken.price)} =</span>
              <span className="font-display text-2xl drop-shadow-[0_2px_0_rgba(140,60,0,0.4)]">{num(total)} Rs</span>
            </div>

            <section className="space-y-2 rounded-2xl bg-leaf-soft p-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Send exactly {num(total)} Rs to</p>
              {settings && (
                <>
                  <Row label="EasyPaisa" name={settings.easypaisa_name} number={settings.easypaisa_number} />
                  <Row label="JazzCash" name={settings.jazzcash_name} number={settings.jazzcash_number} />
                  <Row label={settings.bank_name || 'Bank'} name={settings.bank_account_name} number={settings.bank_account_number} />
                </>
              )}
              {!settings && !settingsErr && <p className="text-sm font-bold">Loading payment details...</p>}
              {settingsErr && <p className="text-sm font-bold text-red-700">{settingsErr}</p>}
              {settings && !hasPay && <p className="text-sm font-bold text-red-700">Payment details have not been set up yet. Please try again later.</p>}
            </section>

            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Transaction ID</span>
              <input value={txn} onChange={e => setTxn(e.target.value)} required
                className="mt-1 w-full rounded-2xl border-2 border-leaf/30 bg-white px-4 py-3 font-bold outline-none focus:border-leaf" />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Sender Name</span>
              <input value={sender} onChange={e => setSender(e.target.value)} required
                className="mt-1 w-full rounded-2xl border-2 border-leaf/30 bg-white px-4 py-3 font-bold outline-none focus:border-leaf" />
            </label>
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Payment Screenshot</span>
              <span className="mt-1 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-leaf/50 bg-white px-4 py-3 text-sm font-extrabold text-leaf-dark">
                <ImageUp className="h-5 w-5 shrink-0" />
                <span className="truncate">{file ? file.name : 'Tap to upload screenshot'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </span>
            </label>

            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

            <button type="submit" disabled={busy || !quantity}
              className="font-display flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-4 text-xl text-white shadow-[0_5px_0_#146c3a] transition active:translate-y-1 active:shadow-none disabled:opacity-60">
              {busy && <Loader2 className="h-5 w-5 animate-spin" />} Submit Payment
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
