'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, supabaseConfigured } from '@/lib/supabase'
import { fetchIsAdmin, fetchProfile, registerGameUser, signOut } from '@/lib/api'
import type { GameUser } from '@/lib/types'
import { errMsg } from '@/lib/format'

interface GameCtx {
  userId: string
  email: string
  profile: GameUser
  isAdmin: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<GameCtx | null>(null)

export function useGame(): GameCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGame must be used inside <GameProvider>')
  return c
}

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<GameUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  const load = useCallback(async (s: Session) => {
    try {
      let p = await fetchProfile(s.user.id)
      if (!p) {
        // Account exists in Auth but the game row is missing (e.g. interrupted sign-up): create it now.
        let ref: string | null = null
        try { ref = localStorage.getItem('eggmarket_ref') } catch { /* ignore */ }
        await registerGameUser(ref)
        p = await fetchProfile(s.user.id)
      }
      if (!p) throw new Error('Could not load your farm. Has the database schema been installed?')
      setProfile(p)
      setIsAdmin(await fetchIsAdmin())
      setState('ready')
    } catch (e) {
      setError(errMsg(e))
      setState('error')
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) {
      setError('The game server is not connected yet.')
      setState('error')
      return
    }
    const sb = getSupabase()
    let alive = true
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return
      if (!data.session) { router.replace('/'); return }
      setSession(data.session)
      void load(data.session)
    }).catch(e => { setError(errMsg(e)); setState('error') })
    const { data: sub } = sb.auth.onAuthStateChange((evt, s) => {
      if (evt === 'SIGNED_OUT') router.replace('/')
      else if (s) setSession(s)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [load, router])

  const refresh = useCallback(async () => {
    if (!session) return
    try {
      const p = await fetchProfile(session.user.id)
      if (p) setProfile(p)
    } catch (e) { console.warn('profile refresh failed', e) }
  }, [session])

  const logout = useCallback(async () => {
    try { await signOut() } catch (e) { console.warn(e) }
    router.replace('/')
  }, [router])

  const value = useMemo<GameCtx | null>(() => session && profile
    ? { userId: session.user.id, email: session.user.email ?? '', profile, isAdmin, refresh, logout }
    : null, [session, profile, isAdmin, refresh, logout])

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center font-display text-2xl text-leaf-dark">Waking up the hens...</div>
  }
  if (state === 'error' || !value) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-display text-3xl text-barn">Cluck! Something broke</p>
        <p className="text-sm font-semibold">{error}</p>
        <button onClick={() => router.replace('/')} className="rounded-xl bg-leaf px-5 py-2 font-extrabold text-white">Back to login</button>
      </div>
    )
  }
  if (profile?.is_blocked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-display text-3xl text-barn">Account blocked</p>
        <p className="text-sm font-semibold">Your account has been blocked. Please contact support.</p>
        <button onClick={() => void value.logout()} className="rounded-xl bg-leaf px-5 py-2 font-extrabold text-white">Log out</button>
      </div>
    )
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
