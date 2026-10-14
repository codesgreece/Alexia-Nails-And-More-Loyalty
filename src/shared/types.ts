/** Shared domain types for Angel Nails Club */

export type PointsTransactionType =
  | 'registration_bonus'
  | 'purchase'
  | 'birthday_bonus'
  | 'referral_reward'
  | 'redemption'
  | 'correction'

export type ReferralStatus = 'pending' | 'qualified' | 'rewarded'

export type CustomerStatus = 'active' | 'archived'

export interface Customer {
  id: string
  fullName: string
  phoneNormalized: string
  phoneDisplay: string
  dateOfBirth: string
  referralCode: string
  referredByCustomerId: string | null
  pointsBalance: number
  registrationBonusAwarded: number
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

export interface CustomerListItem extends Customer {
  successfulReferrals: number
}

export interface Purchase {
  id: string
  customerId: string
  amountCents: number
  pointsEarned: number
  description: string | null
  purchaseDate: string
  createdAt: string
  idempotencyKey: string
}

export interface PointsTransaction {
  id: string
  customerId: string
  type: PointsTransactionType
  points: number
  balanceAfter: number
  purchaseId: string | null
  redemptionId: string | null
  referralId: string | null
  birthdayYear: number | null
  description: string
  reason: string | null
  createdAt: string
  idempotencyKey: string | null
}

export interface Referral {
  id: string
  referrerCustomerId: string
  referredCustomerId: string
  status: ReferralStatus
  firstPurchaseId: string | null
  rewardPointsTotal: number | null
  referrerPoints: number | null
  referredPoints: number | null
  rewardedAt: string | null
  createdAt: string
}

export interface ReferralListItem extends Referral {
  referrerName: string
  referrerCode: string
  referredName: string
}

export interface Reward {
  id: string
  name: string
  description: string
  pointsRequired: number
  isActive: boolean
  validFrom: string | null
  validTo: string | null
  maxRedemptions: number | null
  redemptionCount: number
  createdAt: string
  updatedAt: string
}

export interface Redemption {
  id: string
  customerId: string
  rewardId: string
  pointsSpent: number
  status: 'completed' | 'cancelled'
  createdAt: string
  idempotencyKey: string
}

export interface RedemptionListItem extends Redemption {
  customerName: string
  rewardName: string
}

export interface BirthdayBonusAward {
  id: string
  customerId: string
  calendarYear: number
  pointsAwarded: number
  awardedAt: string
}

export interface AppSettings {
  registrationBonusEnabled: boolean
  registrationBonusPoints: number
  birthdayBonusEnabled: boolean
  birthdayBonusPoints: number
  referralRewardEnabled: boolean
  referralRewardPoints: number
  pointsPerEuro: number
  businessName: string
  appName: string
}

export interface DashboardStats {
  totalCustomers: number
  newCustomersInPeriod: number
  totalPointsOutstanding: number
  pointsAwardedInPeriod: number
  pointsRedeemedInPeriod: number
  referralRegistrations: number
  successfulReferrals: number
  totalPurchases: number
  totalSpendingCents: number
  recentCustomers: Customer[]
  recentPurchases: Array<Purchase & { customerName: string }>
  recentTransactions: Array<PointsTransaction & { customerName: string }>
}

export interface StatisticsReport {
  totalCustomers: number
  registrationsInPeriod: number
  birthdaysInPeriod: number
  totalPointsAwarded: number
  totalPointsRedeemed: number
  outstandingPoints: number
  totalPurchaseValueCents: number
  averagePurchaseValueCents: number
  referralRegistrations: number
  qualifiedReferrals: number
  completedReferralRewards: number
  topRedeemedRewards: Array<{ rewardId: string; rewardName: string; count: number }>
}

export interface DateRange {
  from: string
  to: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CustomerSearchParams {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: 'fullName' | 'createdAt' | 'pointsBalance' | 'phoneNormalized'
  sortDir?: 'asc' | 'desc'
  status?: CustomerStatus | 'all'
}

export interface RegisterCustomerInput {
  fullName: string
  phone: string
  dateOfBirth: string
  referralCode?: string
}

export interface RecordPurchaseInput {
  customerId: string
  amountEuros: number
  purchaseDate: string
  description?: string
  idempotencyKey: string
}

export interface RedeemRewardInput {
  customerId: string
  rewardId: string
  idempotencyKey: string
}

export interface CreateRewardInput {
  name: string
  description: string
  pointsRequired: number
  isActive?: boolean
  validFrom?: string | null
  validTo?: string | null
  maxRedemptions?: number | null
}

export interface UpdateRewardInput extends Partial<CreateRewardInput> {
  id: string
}

export interface UpdateCustomerInput {
  id: string
  fullName?: string
  phone?: string
  dateOfBirth?: string
  status?: CustomerStatus
}

export interface CorrectionInput {
  customerId: string
  pointsDelta: number
  reason: string
  idempotencyKey: string
}

export interface UpdateSettingsInput {
  registrationBonusEnabled?: boolean
  registrationBonusPoints?: number
  birthdayBonusEnabled?: boolean
  birthdayBonusPoints?: number
  referralRewardEnabled?: boolean
  referralRewardPoints?: number
}

export interface BackupResult {
  success: boolean
  path?: string
  message: string
}

export interface RestoreResult {
  success: boolean
  message: string
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
  releaseNotes?: string
  downloaded?: boolean
  message: string
}

export type UpdateStatusPayload =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface CustomerProfile {
  customer: Customer
  referredBy: Customer | null
  referrals: ReferralListItem[]
  purchases: Purchase[]
  transactions: PointsTransaction[]
  redemptions: RedemptionListItem[]
  birthdayAwards: BirthdayBonusAward[]
  redeemableRewards: Reward[]
}
