import type {
  BirthdayBonusAward,
  Customer,
  CustomerStatus,
  PointsTransaction,
  PointsTransactionType,
  Purchase,
  Redemption,
  Referral,
  ReferralStatus,
  Reward
} from '@shared/types'

export interface CustomerRow {
  id: string
  full_name: string
  phone_normalized: string
  phone_display: string
  date_of_birth: string
  referral_code: string
  referred_by_customer_id: string | null
  points_balance: number
  registration_bonus_awarded: number
  status: string
  created_at: string
  updated_at: string
}

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    phoneNormalized: row.phone_normalized,
    phoneDisplay: row.phone_display,
    dateOfBirth: row.date_of_birth,
    referralCode: row.referral_code,
    referredByCustomerId: row.referred_by_customer_id,
    pointsBalance: row.points_balance,
    registrationBonusAwarded: row.registration_bonus_awarded,
    status: row.status as CustomerStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapPurchase(row: {
  id: string
  customer_id: string
  amount_cents: number
  points_earned: number
  description: string | null
  purchase_date: string
  created_at: string
  idempotency_key: string
}): Purchase {
  return {
    id: row.id,
    customerId: row.customer_id,
    amountCents: row.amount_cents,
    pointsEarned: row.points_earned,
    description: row.description,
    purchaseDate: row.purchase_date,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key
  }
}

export function mapPointsTransaction(row: {
  id: string
  customer_id: string
  type: string
  points: number
  balance_after: number
  purchase_id: string | null
  redemption_id: string | null
  referral_id: string | null
  birthday_year: number | null
  description: string
  reason: string | null
  created_at: string
  idempotency_key: string | null
}): PointsTransaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type as PointsTransactionType,
    points: row.points,
    balanceAfter: row.balance_after,
    purchaseId: row.purchase_id,
    redemptionId: row.redemption_id,
    referralId: row.referral_id,
    birthdayYear: row.birthday_year,
    description: row.description,
    reason: row.reason,
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key
  }
}

export function mapReferral(row: {
  id: string
  referrer_customer_id: string
  referred_customer_id: string
  status: string
  first_purchase_id: string | null
  reward_points_total: number | null
  referrer_points: number | null
  referred_points: number | null
  rewarded_at: string | null
  created_at: string
}): Referral {
  return {
    id: row.id,
    referrerCustomerId: row.referrer_customer_id,
    referredCustomerId: row.referred_customer_id,
    status: row.status as ReferralStatus,
    firstPurchaseId: row.first_purchase_id,
    rewardPointsTotal: row.reward_points_total,
    referrerPoints: row.referrer_points,
    referredPoints: row.referred_points,
    rewardedAt: row.rewarded_at,
    createdAt: row.created_at
  }
}

export function mapReward(row: {
  id: string
  name: string
  description: string
  points_required: number
  is_active: number
  valid_from: string | null
  valid_to: string | null
  max_redemptions: number | null
  redemption_count: number
  created_at: string
  updated_at: string
}): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pointsRequired: row.points_required,
    isActive: row.is_active === 1,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapRedemption(row: {
  id: string
  customer_id: string
  reward_id: string
  points_spent: number
  status: string
  created_at: string
  idempotency_key: string
}): Redemption {
  return {
    id: row.id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    pointsSpent: row.points_spent,
    status: row.status as 'completed' | 'cancelled',
    createdAt: row.created_at,
    idempotencyKey: row.idempotency_key
  }
}

export function mapBirthdayAward(row: {
  id: string
  customer_id: string
  calendar_year: number
  points_awarded: number
  awarded_at: string
}): BirthdayBonusAward {
  return {
    id: row.id,
    customerId: row.customer_id,
    calendarYear: row.calendar_year,
    pointsAwarded: row.points_awarded,
    awardedAt: row.awarded_at
  }
}
