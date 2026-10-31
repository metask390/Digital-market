/** Money values come from numeric columns as-is (2000 stays 2000). */
export function rs(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })} Rs`
}

export function num(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':')
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function errMsg(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return fallback
}
