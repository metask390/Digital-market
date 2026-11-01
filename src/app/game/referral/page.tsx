'use client'
import { useEffect, useState } from 'react'
import { Check, Copy, Gift, Link2, Users } from 'lucide-react'
import { useGame } from '@/components/GameProvider'
import { fetchReferralEarnings } from '@/lib/api'
import { errMsg, rs } from '@/lib/format'

const SHARE_EN = 'Join Egg Market! A halal digital business. Buy chickens, collect eggs daily, and earn real money. Use my link to start.'
const SHARE_UR = 'ایگ مارکیٹ جوائن کریں! حلال ڈیجیٹل کاروبار۔ مرغیاں خریدیں، روزانہ انڈے جمع کریں اور اصل پیسے کمائیں۔'

export default function ReferralPage() {
  const { userId, profile } = useGame()
  const [link, setLink] = useState('')
  const [earnings, setEarnings] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLink(`${window.location.origin}/?ref=${userId}`)
    fetchReferralEarnings(userId).then(setEarnings).catch(e => setError(errMsg(e)))
  }, [userId])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setError('Could not copy. Select the link and copy it manually.') }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-yolk to-yolk-deep p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-white/80">Build your flock</p><h1 className="font-display mt-1 text-3xl">Refer & Earn</h1></div>
          <div className="rounded-2xl bg-white/20 p-3"><Gift className="h-7 w-7" aria-hidden /></div>
        </div>
        <p className="mt-2 text-sm font-bold text-white/90">Invite friends to Egg Market and earn 1% daily commission from their activity.</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-leaf/10"><p className="text-[11px] font-extrabold uppercase tracking-wide text-leaf-dark">Direct Withdraw Limit</p><p className="mt-2 font-display text-2xl text-ink">{rs(profile.direct_withdraw_limit)} Rs</p><p className="mt-1 text-[11px] font-bold text-ink/50">30% of your investment</p></div>
        <div className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-leaf/10"><p className="text-[11px] font-extrabold uppercase tracking-wide text-leaf-dark">Referral Withdraw Limit</p><p className="mt-2 font-display text-2xl text-ink">{rs(profile.referral_withdraw_limit)} Rs</p><p className="mt-1 text-[11px] font-bold text-ink/50">Available from referrals</p></div>
        <div className="col-span-2 rounded-3xl bg-leaf p-4 text-white shadow-md"><p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white/80"><Users className="h-3.5 w-3.5" aria-hidden /> Total Referral Earnings</p><p className="mt-1 font-display text-3xl">{rs(earnings)} Rs</p><p className="mt-1 text-xs font-bold text-white/75">Sum of 1% daily commissions earned</p></div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-md">
        <h2 className="font-display flex items-center gap-2 text-xl"><Link2 className="h-5 w-5 text-leaf" aria-hidden /> Your Referral Link</h2>
        <div className="mt-2 flex items-center gap-2"><input readOnly value={link} onFocus={e => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl bg-leaf-soft px-3 py-2.5 text-xs font-bold text-leaf-dark outline-none" aria-label="Referral link" /><button onClick={copyLink} className="flex items-center gap-1 rounded-xl bg-leaf px-3 py-2.5 text-sm font-extrabold text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}</button></div>
        <div className="mt-4 space-y-2 rounded-2xl bg-cream p-3 text-sm font-semibold"><p>{SHARE_EN}</p><p dir="rtl" className="text-right leading-7">{SHARE_UR}</p></div>
      </section>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
    </div>
  )
}
