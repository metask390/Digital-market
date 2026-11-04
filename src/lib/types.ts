export interface GameUser {
  user_id: string
  wallet_balance: number
  egg_stock: number
  unsold_eggs_value: number
  total_invested: number
  direct_withdraw_limit: number
  referral_withdraw_limit: number
  referred_by: string | null
  withdraw_method: string | null
  withdraw_account_name: string | null
  withdraw_account_number: string | null
  is_blocked: boolean
}

export interface ChickenType {
  id: string
  name: string
  price: number
  egg_value: number
  color: string
}

export interface UserChicken {
  id: string
  user_id: string
  chicken_type_id: string
  last_collected_at: string
}

export type DepositStatus = 'pending' | 'approved' | 'rejected'
export type WithdrawalStatus = 'pending' | 'completed' | 'rejected'

export interface Deposit {
  id: string
  user_id: string
  chicken_type_id: string
  quantity: number
  total_amount: number
  transaction_id: string
  sender_name: string
  screenshot_url: string | null
  status: DepositStatus
  created_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  method: string
  account_number: string
  account_name: string
  status: WithdrawalStatus
  created_at: string
}

export interface GameNotification {
  id: string
  user_id: string
  title: string
  message: string
  created_at: string
}

export interface GameSettings {
  id: number
  easypaisa_name: string
  easypaisa_number: string
  jazzcash_name: string
  jazzcash_number: string
  bank_name: string
  bank_account_name: string
  bank_account_number: string
}

export type PaymentAccountKind = 'easypaisa' | 'jazzcash' | 'nayapay' | 'sadapay' | 'bank' | 'other'
export interface PaymentAccount {
  id: string
  kind: PaymentAccountKind | string
  label: string
  account_name: string
  account_number: string
  active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface AdminUserRow {
  user_id: string
  email: string | null
  wallet_balance: number
  total_invested: number
  is_blocked: boolean
  chickens: number
  created_at: string
}
