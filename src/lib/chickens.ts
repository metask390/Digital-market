import type { ChickenType } from './types'

/** The ten tiers (price in Rs -> Rs per egg). Mirrors the seed in supabase/schema.sql. */
export const CHICKEN_TIERS: ChickenType[] = [
  { id: '1', name: 'Sunny Chick', price: 200, egg_value: 5, color: '#facc15' },
  { id: '2', name: 'Brown Hen', price: 400, egg_value: 15, color: '#d97706' },
  { id: '3', name: 'Speckled Hen', price: 700, egg_value: 25, color: '#a16207' },
  { id: '4', name: 'Golden Layer', price: 1000, egg_value: 50, color: '#f59e0b' },
  { id: '5', name: 'Rosy Rooster', price: 1500, egg_value: 60, color: '#f43f5e' },
  { id: '6', name: 'Meadow Queen', price: 2000, egg_value: 70, color: '#22c55e' },
  { id: '7', name: 'Sky Feather', price: 2500, egg_value: 90, color: '#0ea5e9' },
  { id: '8', name: 'Royal Plume', price: 3000, egg_value: 100, color: '#8b5cf6' },
  { id: '9', name: 'Emerald Champion', price: 4000, egg_value: 150, color: '#10b981' },
  { id: '10', name: 'Diamond Cluck', price: 10000, egg_value: 400, color: '#06b6d4' },
]

export const EGG_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const MIN_WITHDRAW = 50
export const MAX_WITHDRAW_PER_DAY = 10000
