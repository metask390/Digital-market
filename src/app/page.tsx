'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react'
import { getSupabase, supabaseConfigured } from '@/lib/supabase'
import { signIn, signUp } from '@/lib/api'
import { errMsg } from '@/lib/format'

const AuthScene = dynamic(() => import('@/components/three/AuthScene'), { ssr: false })

const REF_KEY = 'eggmarket_ref'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [referrer, setReferrer] = useState<string | null>(null)

  // Remember ?ref=<user id> and bounce already-signed-in players to their farm.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref && UUID.test(ref)) {
        localStorage.setItem(REF_KEY, ref)
        setMode('signup')
      }
      const saved = localStorage.getItem(REF_KEY)
      if (saved && UUID.test(saved)) setReferrer(saved)
    } catch { /* storage unavailable */ }

    if (!supabaseConfigured) return
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/game/dashboard/')
    }).catch(() => undefined)
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!supabaseConfigured) {
      setError('The game server is not connected yet. Add the Supabase URL and anon key to continue.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') await signUp(email.trim(), password, referrer)
      else await signIn(email.trim(), password)
      router.replace('/game/dashboard/')
    } catch (err) {
      setError(errMsg(err, 'Could not sign you in.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[520px] flex-col overflow-hidden bg-[#ff9a52] shadow-2xl">
      {/* ---- top half: 3D farm at sunset ---- */}
      <section className="relative h-[50vh] min-h-[320px] w-full"
        style={{ background: 'linear-gradient(180deg,#ffd37a 0%,#ff9a52 55%,#e8642c 100%)' }}>
        <div className="absolute inset-0"><AuthScene /></div>
        <div className="pointer-events-none absolute inset-x-0 top-5 flex flex-col items-center">
          <h1 className="font-display text-5xl text-white drop-shadow-[0_3px_0_rgba(138,45,0,0.55)]">Egg Market</h1>
          <p className="mt-1 rounded-full bg-black/20 px-3 py-0.5 text-xs font-bold tracking-wide text-white">
            Raise hens. Collect golden eggs.
          </p>
        </div>
      </section>

      {/* ---- bottom half: curved white form ---- */}
      <section className="relative -mt-9 flex-1 rounded-t-[2.75rem] bg-white px-6 pb-10 pt-6 shadow-[0_-12px_30px_rgba(120,40,0,0.25)]">
        <div className="mx-auto mb-5 grid w-full grid-cols-2 rounded-full bg-leaf-soft p-1" role="tablist">
          {(['login', 'signup'] as const).map(m => (
            <button key={m} type="button" role="tab" aria-selected={mode === m}
              onClick={() => { setMode(m); setError('') }}
              className={`rounded-full py-2.5 text-sm font-extrabold transition ${
                mode === m ? 'bg-leaf text-white shadow-md' : 'text-leaf-dark'}`}>
              {m === 'login' ? 'Log In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-leaf/30 bg-leaf-soft px-4 focus-within:border-leaf">
              <Mail className="h-5 w-5 text-leaf" aria-hidden />
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent py-3.5 text-base font-semibold text-ink outline-none placeholder:text-leaf/50" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-leaf-dark">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-leaf/30 bg-leaf-soft px-4 focus-within:border-leaf">
              <Lock className="h-5 w-5 text-leaf" aria-hidden />
              <input type={show ? 'text' : 'password'} required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"
                className="w-full bg-transparent py-3.5 text-base font-semibold text-ink outline-none placeholder:text-leaf/50" />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="text-leaf">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          {mode === 'signup' && referrer && (
            <p className="rounded-xl bg-yolk/20 px-3 py-2 text-xs font-bold text-barn">
              A friend invited you. Your referral is saved.
            </p>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}

          <button type="submit" disabled={busy}
            className="font-display flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-4 text-xl text-white shadow-[0_5px_0_#146c3a] transition active:translate-y-1 active:shadow-none disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        {!supabaseConfigured && (
          <p className="mt-4 text-center text-xs font-semibold text-barn">
            Backend not connected: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        )}
      </section>
    </main>
  )
}
