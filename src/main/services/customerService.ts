import { generateCustomerId, generateId, generateReferralCode } from '@shared/ids'
import { formatPhoneDisplay, isValidGreekPhone, normalizePhone } from '@shared/phone'
import type {
  ApiResult,
  Customer,
  CustomerListItem,
  CustomerProfile,
  CustomerSearchParams,
  PaginatedResult,
  RegisterCustomerInput,
  UpdateCustomerInput
} from '@shared/types'
import { getDb } from '../db/connection'
import { mapBirthdayAward, mapCustomer, mapPointsTransaction, mapPurchase, mapRedemption, mapReferral, mapReward, type CustomerRow } from './mappers'
import { getSettings } from './settingsService'

function uniqueCustomerId(): string {
  const db = getDb()
  for (let i = 0; i < 20; i++) {
    const id = generateCustomerId()
    const exists = db.prepare('SELECT 1 FROM customers WHERE id = ?').get(id)
    if (!exists) return id
  }
  throw new Error('Αδυναμία δημιουργίας μοναδικού κωδικού πελάτισσας')
}

function uniqueReferralCode(): string {
  const db = getDb()
  for (let i = 0; i < 30; i++) {
    const code = generateReferralCode()
    const exists = db.prepare('SELECT 1 FROM customers WHERE referral_code = ?').get(code)
    if (!exists) return code
  }
  throw new Error('Αδυναμία δημιουργίας μοναδικού κωδικού παραπομπής')
}

export function findCustomerByPhone(phone: string): Customer | null {
  const normalized = normalizePhone(phone)
  const row = getDb()
    .prepare('SELECT * FROM customers WHERE phone_normalized = ?')
    .get(normalized) as CustomerRow | undefined
  return row ? mapCustomer(row) : null
}

export function getCustomerById(id: string): Customer | null {
  const row = getDb()
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(id) as CustomerRow | undefined
  return row ? mapCustomer(row) : null
}

export function listCustomers(
  params: CustomerSearchParams = {}
): PaginatedResult<CustomerListItem> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25))
  const offset = (page - 1) * pageSize
  const sortBy = params.sortBy ?? 'createdAt'
  const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC'
  const status = params.status ?? 'active'

  const sortMap: Record<string, string> = {
    fullName: 'c.full_name',
    createdAt: 'c.created_at',
    pointsBalance: 'c.points_balance',
    phoneNormalized: 'c.phone_normalized'
  }
  const orderCol = sortMap[sortBy] ?? 'c.created_at'

  const where: string[] = []
  const args: unknown[] = []

  if (status !== 'all') {
    where.push('c.status = ?')
    args.push(status)
  }

  if (params.query?.trim()) {
    const q = `%${params.query.trim()}%`
    const phoneQ = `%${normalizePhone(params.query)}%`
    where.push(
      `(c.full_name LIKE ? OR c.phone_normalized LIKE ? OR c.phone_display LIKE ? OR c.id LIKE ? OR c.referral_code LIKE ?)`
    )
    args.push(q, phoneQ, q, q, q)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalRow = getDb()
    .prepare(`SELECT COUNT(*) as cnt FROM customers c ${whereSql}`)
    .get(...(args as Array<string | number>)) as { cnt: number }

  const rows = getDb()
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM referrals r
          WHERE r.referrer_customer_id = c.id AND r.status = 'rewarded') as successful_referrals
       FROM customers c
       ${whereSql}
       ORDER BY ${orderCol} ${sortDir}
       LIMIT ? OFFSET ?`
    )
    .all(...(args as Array<string | number>), pageSize, offset) as Array<
    CustomerRow & { successful_referrals: number }
  >

  return {
    items: rows.map((r) => ({
      ...mapCustomer(r),
      successfulReferrals: r.successful_referrals
    })),
    total: totalRow.cnt,
    page,
    pageSize
  }
}

export function registerCustomer(
  input: RegisterCustomerInput
): ApiResult<{
  customer: Customer
  existing?: Customer
  referralPending?: boolean
  referralRewardPoints?: number
  referralRewardEnabled?: boolean
}> {
  const fullName = input.fullName?.trim()
  if (!fullName || fullName.length < 2) {
    return { success: false, error: 'Το ονοματεπώνυμο είναι υποχρεωτικό', code: 'VALIDATION' }
  }
  if (!input.phone?.trim()) {
    return { success: false, error: 'Το τηλέφωνο είναι υποχρεωτικό', code: 'VALIDATION' }
  }
  if (!input.dateOfBirth?.trim()) {
    return { success: false, error: 'Η ημερομηνία γέννησης είναι υποχρεωτική', code: 'VALIDATION' }
  }

  const dob = new Date(`${input.dateOfBirth}T12:00:00`)
  if (Number.isNaN(dob.getTime()) || dob > new Date()) {
    return { success: false, error: 'Μη έγκυρη ημερομηνία γέννησης', code: 'VALIDATION' }
  }

  const phoneNormalized = normalizePhone(input.phone)
  if (!isValidGreekPhone(phoneNormalized) && phoneNormalized.length < 10) {
    return { success: false, error: 'Μη έγκυρος αριθμός τηλεφώνου', code: 'VALIDATION' }
  }

  const existing = findCustomerByPhone(input.phone)
  if (existing) {
    return {
      success: false,
      error: 'Υπάρχει ήδη πελάτισσα με αυτό το τηλέφωνο',
      code: 'DUPLICATE_PHONE',
      data: { customer: existing, existing }
    }
  }

  const settings = getSettings()
  let referrerId: string | null = null
  const referralCodeInput = input.referralCode?.trim().toUpperCase()

  if (referralCodeInput) {
    const referrer = getDb()
      .prepare('SELECT * FROM customers WHERE referral_code = ? AND status = ?')
      .get(referralCodeInput, 'active') as CustomerRow | undefined
    if (!referrer) {
      return { success: false, error: 'Ο κωδικός παραπομπής δεν είναι έγκυρος', code: 'INVALID_REFERRAL' }
    }
    referrerId = referrer.id
  }

  const db = getDb()
  const now = new Date().toISOString()
  const customerId = uniqueCustomerId()
  const referralCode = uniqueReferralCode()
  const phoneDisplay = formatPhoneDisplay(phoneNormalized)
  const bonusPoints =
    settings.registrationBonusEnabled && settings.registrationBonusPoints > 0
      ? settings.registrationBonusPoints
      : 0

  try {
    const run = db.transaction(() => {
      db.prepare(
        `INSERT INTO customers (
          id, full_name, phone_normalized, phone_display, date_of_birth,
          referral_code, referred_by_customer_id, points_balance,
          registration_bonus_awarded, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      ).run(
        customerId,
        fullName,
        phoneNormalized,
        phoneDisplay,
        input.dateOfBirth,
        referralCode,
        referrerId,
        bonusPoints,
        bonusPoints > 0 ? 1 : 0,
        now,
        now
      )

      if (bonusPoints > 0) {
        db.prepare(
          `INSERT INTO points_transactions (
            id, customer_id, type, points, balance_after, purchase_id,
            redemption_id, referral_id, birthday_year, description, reason,
            created_at, idempotency_key
          ) VALUES (?, ?, 'registration_bonus', ?, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, ?)`
        ).run(
          generateId('pt'),
          customerId,
          bonusPoints,
          bonusPoints,
          `Μπόνους εγγραφής (${bonusPoints} πόντοι)`,
          now,
          `reg_bonus_${customerId}`
        )
      }

      if (referrerId) {
        const existingRef = db
          .prepare('SELECT 1 FROM referrals WHERE referred_customer_id = ?')
          .get(customerId)
        if (!existingRef) {
          db.prepare(
            `INSERT INTO referrals (
              id, referrer_customer_id, referred_customer_id, status,
              first_purchase_id, reward_points_total, referrer_points,
              referred_points, rewarded_at, created_at
            ) VALUES (?, ?, ?, 'pending', NULL, NULL, NULL, NULL, NULL, ?)`
          ).run(generateId('ref'), referrerId, customerId, now)
        }
      }
    })
    run()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Σφάλμα εγγραφής'
    if (
      message.includes('UNIQUE') &&
      (message.includes('phone') || message.includes('phone_normalized'))
    ) {
      return { success: false, error: 'Υπάρχει ήδη πελάτισσα με αυτό το τηλέφωνο', code: 'DUPLICATE_PHONE' }
    }
    return { success: false, error: message, code: 'DB_ERROR' }
  }

  const customer = getCustomerById(customerId)
  if (!customer) {
    return { success: false, error: 'Η εγγραφή απέτυχε', code: 'DB_ERROR' }
  }
  return {
    success: true,
    data: {
      customer,
      referralPending: Boolean(referrerId),
      referralRewardEnabled: settings.referralRewardEnabled,
      referralRewardPoints: settings.referralRewardPoints
    }
  }
}

export function updateCustomer(input: UpdateCustomerInput): ApiResult<Customer> {
  const existing = getCustomerById(input.id)
  if (!existing) {
    return { success: false, error: 'Η πελάτισσα δεν βρέθηκε', code: 'NOT_FOUND' }
  }

  const fullName = input.fullName?.trim() ?? existing.fullName
  if (fullName.length < 2) {
    return { success: false, error: 'Το ονοματεπώνυμο είναι υποχρεωτικό', code: 'VALIDATION' }
  }

  let phoneNormalized = existing.phoneNormalized
  let phoneDisplay = existing.phoneDisplay
  if (input.phone !== undefined) {
    phoneNormalized = normalizePhone(input.phone)
    if (!isValidGreekPhone(phoneNormalized) && phoneNormalized.length < 10) {
      return { success: false, error: 'Μη έγκυρος αριθμός τηλεφώνου', code: 'VALIDATION' }
    }
    const other = findCustomerByPhone(input.phone)
    if (other && other.id !== existing.id) {
      return { success: false, error: 'Το τηλέφωνο χρησιμοποιείται ήδη', code: 'DUPLICATE_PHONE' }
    }
    phoneDisplay = formatPhoneDisplay(phoneNormalized)
  }

  let dob = existing.dateOfBirth
  if (input.dateOfBirth !== undefined) {
    const d = new Date(`${input.dateOfBirth}T12:00:00`)
    if (Number.isNaN(d.getTime()) || d > new Date()) {
      return { success: false, error: 'Μη έγκυρη ημερομηνία γέννησης', code: 'VALIDATION' }
    }
    dob = input.dateOfBirth
  }

  const status = input.status ?? existing.status
  const now = new Date().toISOString()

  getDb()
    .prepare(
      `UPDATE customers SET
        full_name = ?, phone_normalized = ?, phone_display = ?,
        date_of_birth = ?, status = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(fullName, phoneNormalized, phoneDisplay, dob, status, now, input.id)

  const updated = getCustomerById(input.id)
  if (!updated) return { success: false, error: 'Η ενημέρωση απέτυχε', code: 'DB_ERROR' }
  return { success: true, data: updated }
}

export function getCustomerProfile(customerId: string): ApiResult<CustomerProfile> {
  const customer = getCustomerById(customerId)
  if (!customer) {
    return { success: false, error: 'Η πελάτισσα δεν βρέθηκε', code: 'NOT_FOUND' }
  }

  const db = getDb()
  const referredBy = customer.referredByCustomerId
    ? getCustomerById(customer.referredByCustomerId)
    : null

  const referralRows = db
    .prepare(
      `SELECT r.*,
        ref.full_name as referrer_name, ref.referral_code as referrer_code,
        rd.full_name as referred_name
       FROM referrals r
       JOIN customers ref ON ref.id = r.referrer_customer_id
       JOIN customers rd ON rd.id = r.referred_customer_id
       WHERE r.referrer_customer_id = ? OR r.referred_customer_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(customerId, customerId) as Array<{
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
    referrer_name: string
    referrer_code: string
    referred_name: string
  }>

  const purchases = db
    .prepare('SELECT * FROM purchases WHERE customer_id = ? ORDER BY purchase_date DESC, created_at DESC')
    .all(customerId)
    .map((r) => mapPurchase(r as Parameters<typeof mapPurchase>[0]))

  const transactions = db
    .prepare('SELECT * FROM points_transactions WHERE customer_id = ? ORDER BY created_at DESC')
    .all(customerId)
    .map((r) => mapPointsTransaction(r as Parameters<typeof mapPointsTransaction>[0]))

  const redemptionRows = db
    .prepare(
      `SELECT rd.*, c.full_name as customer_name, rw.name as reward_name
       FROM redemptions rd
       JOIN customers c ON c.id = rd.customer_id
       JOIN rewards rw ON rw.id = rd.reward_id
       WHERE rd.customer_id = ?
       ORDER BY rd.created_at DESC`
    )
    .all(customerId) as Array<Parameters<typeof mapRedemption>[0] & { customer_name: string; reward_name: string }>

  const birthdayAwards = db
    .prepare('SELECT * FROM birthday_bonus_awards WHERE customer_id = ? ORDER BY calendar_year DESC')
    .all(customerId)
    .map((r) => mapBirthdayAward(r as Parameters<typeof mapBirthdayAward>[0]))

  const today = new Date().toISOString().slice(0, 10)
  const redeemableRewards = db
    .prepare(
      `SELECT * FROM rewards
       WHERE is_active = 1
         AND points_required <= ?
         AND (valid_from IS NULL OR valid_from <= ?)
         AND (valid_to IS NULL OR valid_to >= ?)
         AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
       ORDER BY points_required ASC`
    )
    .all(customer.pointsBalance, today, today)
    .map((r) => mapReward(r as Parameters<typeof mapReward>[0]))

  return {
    success: true,
    data: {
      customer,
      referredBy,
      referrals: referralRows.map((r) => ({
        ...mapReferral(r),
        referrerName: r.referrer_name,
        referrerCode: r.referrer_code,
        referredName: r.referred_name
      })),
      purchases,
      transactions,
      redemptions: redemptionRows.map((r) => ({
        ...mapRedemption(r),
        customerName: r.customer_name,
        rewardName: r.reward_name
      })),
      birthdayAwards,
      redeemableRewards
    }
  }
}
