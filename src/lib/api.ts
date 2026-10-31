import { getSupabase } from './supabase'
import { CHICKEN_TIERS } from './chickens'
import type {
  AdminUserRow, ChickenType, Deposit, GameSettings, GameUser, PaymentAccount, UserChicken, Withdrawal,
} from './types'

const n = (v: unknown) => Number(v ?? 0)

function normalizeUser(r: Record<string, unknown>): GameUser {
  return {
    user_id: String(r.user_id),
    wallet_balance: n(r.wallet_balance),
    egg_stock: n(r.egg_stock),
    total_invested: n(r.total_invested),
    direct_withdraw_limit: n(r.direct_withdraw_limit),
    referral_withdraw_limit: n(r.referral_withdraw_limit),
    referred_by: (r.referred_by as string) ?? null,
    is_blocked: Boolean(r.is_blocked),
  }
}

// ------------------------------------------------------------------ auth
export async function signUp(email: string, password: string, referredBy: string | null) {
  const sb = getSupabase()
  const { data, error } = await sb.auth.signUp({ email, password })
  if (error) throw error
  let session = data.session
  if (!session) {
    // "Confirm email" is expected to be OFF; if it is on, signing in right away reveals that.
    const res = await sb.auth.signInWithPassword({ email, password })
    if (res.error) {
      throw new Error('Account created, but Supabase still requires email confirmation. Turn off "Confirm email" in Supabase Auth settings.')
    }
    session = res.data.session
  }
  await registerGameUser(referredBy)
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await getSupabase().auth.signOut()
}

/** Inserts the game_users row (wallet_balance = 0). Safe to call repeatedly. */
export async function registerGameUser(referredBy: string | null) {
  const { error } = await getSupabase().rpc('game_register', { p_referred_by: referredBy })
  if (error) throw error
}

// ----------------------------------------------------------------- reads
export async function fetchProfile(userId: string): Promise<GameUser | null> {
  const { data, error } = await getSupabase().from('game_users').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? normalizeUser(data) : null
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('game_is_admin')
  if (error) return false
  return Boolean(data)
}

export async function fetchChickenTypes(): Promise<ChickenType[]> {
  try {
    const { data, error } = await getSupabase().from('game_chicken_types').select('*').order('price')
    if (error) throw error
    if (data && data.length) {
      const mapped = data.map(r => ({ id: Number(r.id), name: String(r.name), price: n(r.price), egg_value: n(r.egg_value), color: String(r.color ?? r.model_color ?? '#22c55e') }))
      if (mapped.every(t => Number.isFinite(t.id))) return mapped
    }
  } catch {
    /* fall through to built-in tiers so the market still renders */
  }
  return CHICKEN_TIERS
}

export async function fetchSettings(): Promise<GameSettings | null> {
  const { data, error } = await getSupabase().from('game_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return (data as GameSettings) ?? null
}

function normalizePaymentAccount(r: Record<string, unknown>): PaymentAccount {
  return {
    id: String(r.id),
    kind: String(r.kind ?? 'other'),
    label: String(r.label ?? 'Payment account'),
    account_name: String(r.account_name ?? ''),
    account_number: String(r.account_number ?? ''),
    active: Boolean(r.active),
    sort_order: n(r.sort_order),
    created_at: r.created_at ? String(r.created_at) : undefined,
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  }
}

/** Active accounts are dynamic; the legacy settings row remains a fallback until migration is applied. */
export async function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  try {
    const { data, error } = await getSupabase().from('game_payment_accounts').select('*').eq('active', true).order('sort_order').order('created_at')
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(normalizePaymentAccount)
  } catch {
    const legacy = await fetchSettings().catch(() => null)
    if (!legacy) return []
    return [
      { id: 'legacy-easypaisa', kind: 'easypaisa', label: 'EasyPaisa', account_name: legacy.easypaisa_name, account_number: legacy.easypaisa_number, active: true, sort_order: 10 },
      { id: 'legacy-jazzcash', kind: 'jazzcash', label: 'JazzCash', account_name: legacy.jazzcash_name, account_number: legacy.jazzcash_number, active: true, sort_order: 20 },
      { id: 'legacy-bank', kind: 'bank', label: legacy.bank_name || 'Bank', account_name: legacy.bank_account_name, account_number: legacy.bank_account_number, active: true, sort_order: 30 },
    ].filter(a => a.account_name || a.account_number)
  }
}

export async function fetchMyChickens(userId: string): Promise<UserChicken[]> {
  const { data, error } = await getSupabase()
    .from('game_user_chickens').select('*').eq('user_id', userId).order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as UserChicken[]
}

export async function fetchMyWithdrawals(userId: string): Promise<Withdrawal[]> {
  const { data, error } = await getSupabase()
    .from('game_withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return (data ?? []).map(r => ({ ...(r as Withdrawal), amount: n(r.amount) }))
}

// --------------------------------------------------------------- actions
export async function submitDeposit(args: {
  userId: string; chickenTypeId: number; quantity: number
  transactionId: string; senderName: string; screenshot: File
}) {
  const sb = getSupabase()
  const ext = (args.screenshot.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${args.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`
  const up = await sb.storage.from('game-screenshots').upload(path, args.screenshot, { contentType: args.screenshot.type || 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await sb.rpc('game_create_deposit', {
    p_chicken_type_id: args.chickenTypeId,
    p_quantity: args.quantity,
    p_transaction_id: args.transactionId,
    p_sender_name: args.senderName,
    p_screenshot_url: path,
  })
  if (error) {
    await sb.storage.from('game-screenshots').remove([path]).catch(() => undefined)
    throw error
  }
}

export async function collectEgg(chickenId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('game_collect_egg', { p_chicken_id: chickenId })
  if (error) throw error
  return n(data)
}

export async function sellEggs(): Promise<number> {
  const { data, error } = await getSupabase().rpc('game_sell_eggs')
  if (error) throw error
  return n(data)
}

export async function requestWithdrawal(args: { amount: number; method: string; accountNumber: string; accountName: string }) {
  const { error } = await getSupabase().rpc('game_request_withdrawal', {
    p_amount: args.amount, p_method: args.method, p_account_number: args.accountNumber, p_account_name: args.accountName,
  })
  if (error) throw error
}

// ----------------------------------------------------------------- admin
export async function adminSaveSettings(s: Omit<GameSettings, 'id'>) {
  const { error } = await getSupabase().from('game_settings').upsert({ id: 1, ...s })
  if (error) throw error
}

export async function adminPaymentAccounts(): Promise<PaymentAccount[]> {
  const { data, error } = await getSupabase().from('game_payment_accounts').select('*').order('sort_order').order('created_at')
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(normalizePaymentAccount)
}
export async function adminCreatePaymentAccount(input: Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at'>) {
  const { error } = await getSupabase().from('game_payment_accounts').insert(input)
  if (error) throw error
}
export async function adminUpdatePaymentAccount(id: string, input: Omit<PaymentAccount, 'id' | 'created_at' | 'updated_at'>) {
  const { error } = await getSupabase().from('game_payment_accounts').update(input).eq('id', id)
  if (error) throw error
}
export async function adminTogglePaymentAccount(id: string, active: boolean) {
  const { error } = await getSupabase().from('game_payment_accounts').update({ active }).eq('id', id)
  if (error) throw error
}
export async function adminDeletePaymentAccount(id: string) {
  const { error } = await getSupabase().from('game_payment_accounts').delete().eq('id', id)
  if (error) throw error
}

export interface AdminDeposit extends Deposit { chicken_name: string; email: string | null }

export async function adminPendingDeposits(): Promise<AdminDeposit[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('game_deposits').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  if (error) throw error
  const types = await fetchChickenTypes()
  return (data ?? []).map(r => ({
    ...(r as Deposit),
    total_amount: n(r.total_amount),
    chicken_name: types.find(t => t.id === r.chicken_type_id)?.name ?? `Type ${r.chicken_type_id}`,
    email: null,
  }))
}

export async function adminScreenshotUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from('game-screenshots').createSignedUrl(path, 600)
  if (error) return null
  return data.signedUrl
}

export async function adminPendingWithdrawals(): Promise<Withdrawal[]> {
  const { data, error } = await getSupabase()
    .from('game_withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => ({ ...(r as Withdrawal), amount: n(r.amount) }))
}

export async function adminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await getSupabase().rpc('game_admin_users')
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    user_id: String(r.user_id),
    email: (r.email as string) ?? null,
    wallet_balance: n(r.wallet_balance),
    total_invested: n(r.total_invested),
    is_blocked: Boolean(r.is_blocked),
    chickens: n(r.chickens),
    created_at: String(r.created_at),
  }))
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { error } = await getSupabase().rpc(name, args)
  if (error) throw error
}
export const adminApproveDeposit = (id: string) => rpc('game_admin_approve_deposit', { p_id: id })
export const adminRejectDeposit = (id: string) => rpc('game_admin_reject_deposit', { p_id: id })
export const adminApproveWithdrawal = (id: string) => rpc('game_admin_approve_withdrawal', { p_id: id })
export const adminRejectWithdrawal = (id: string) => rpc('game_admin_reject_withdrawal', { p_id: id })
export const adminSetBlocked = (userId: string, blocked: boolean) => rpc('game_admin_set_blocked', { p_user: userId, p_blocked: blocked })
