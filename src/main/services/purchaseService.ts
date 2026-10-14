import { generateId } from '@shared/ids'
import { calculatePurchasePoints, eurosToCents, splitReferralReward } from '@shared/points'
import type {
  ApiResult,
  CorrectionInput,
  PointsTransaction,
  Purchase,
  RecordPurchaseInput
} from '@shared/types'
import { getDb } from '../db/connection'
import { mapPointsTransaction, mapPurchase, type CustomerRow } from './mappers'
import { getSettings } from './settingsService'

export function recordPurchase(
  input: RecordPurchaseInput
): ApiResult<{ purchase: Purchase; pointsEarned: number; balance: number; referralRewarded: boolean }> {
  if (!input.customerId) {
    return { success: false, error: 'Απαιτείται πελάτισσα', code: 'VALIDATION' }
  }
  if (!input.idempotencyKey?.trim()) {
    return { success: false, error: 'Λείπει κλειδί μοναδικότητας', code: 'VALIDATION' }
  }
  if (!Number.isFinite(input.amountEuros) || input.amountEuros <= 0) {
    return { success: false, error: 'Το ποσό πρέπει να είναι θετικό', code: 'VALIDATION' }
  }

  const db = getDb()

  const existingPurchase = db
    .prepare('SELECT * FROM purchases WHERE idempotency_key = ?')
    .get(input.idempotencyKey) as Parameters<typeof mapPurchase>[0] | undefined

  if (existingPurchase) {
    const customer = db
      .prepare('SELECT points_balance FROM customers WHERE id = ?')
      .get(existingPurchase.customer_id) as { points_balance: number }
    return {
      success: true,
      data: {
        purchase: mapPurchase(existingPurchase),
        pointsEarned: existingPurchase.points_earned,
        balance: customer.points_balance,
        referralRewarded: false
      }
    }
  }

  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(input.customerId) as CustomerRow | undefined

  if (!customer) {
    return { success: false, error: 'Η πελάτισσα δεν βρέθηκε', code: 'NOT_FOUND' }
  }
  if (customer.status !== 'active') {
    return { success: false, error: 'Η πελάτισσα δεν είναι ενεργή', code: 'INACTIVE' }
  }

  const settings = getSettings()
  let amountCents: number
  try {
    amountCents = eurosToCents(input.amountEuros)
  } catch {
    return { success: false, error: 'Μη έγκυρο ποσό', code: 'VALIDATION' }
  }

  const pointsEarned = calculatePurchasePoints(amountCents, settings.pointsPerEuro)
  const purchaseDate = input.purchaseDate?.trim() || new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const purchaseId = generateId('pur')
  let referralRewarded = false

  try {
    const run = db.transaction(() => {
      const locked = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(input.customerId) as CustomerRow

      const newBalance = locked.points_balance + pointsEarned

      db.prepare(
        `INSERT INTO purchases (
          id, customer_id, amount_cents, points_earned, description,
          purchase_date, created_at, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        purchaseId,
        input.customerId,
        amountCents,
        pointsEarned,
        input.description?.trim() || null,
        purchaseDate,
        now,
        input.idempotencyKey
      )

      db.prepare(
        `INSERT INTO points_transactions (
          id, customer_id, type, points, balance_after, purchase_id,
          redemption_id, referral_id, birthday_year, description, reason,
          created_at, idempotency_key
        ) VALUES (?, ?, 'purchase', ?, ?, ?, NULL, NULL, NULL, ?, NULL, ?, ?)`
      ).run(
        generateId('pt'),
        input.customerId,
        pointsEarned,
        newBalance,
        purchaseId,
        `Αγορά — ${pointsEarned} πόντοι`,
        now,
        `purchase_${input.idempotencyKey}`
      )

      db.prepare(
        'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
      ).run(newBalance, now, input.customerId)

      // Referral reward on first eligible purchase (pending or previously qualified)
      const referral = db
        .prepare(
          `SELECT * FROM referrals
           WHERE referred_customer_id = ?
             AND status IN ('pending', 'qualified')
             AND rewarded_at IS NULL`
        )
        .get(input.customerId) as
        | {
            id: string
            referrer_customer_id: string
            referred_customer_id: string
            status: string
            first_purchase_id: string | null
          }
        | undefined

      if (referral && pointsEarned > 0) {
        const firstPurchaseId = referral.first_purchase_id ?? purchaseId

        if (!settings.referralRewardEnabled || settings.referralRewardPoints <= 0) {
          db.prepare(
            `UPDATE referrals SET status = 'qualified', first_purchase_id = COALESCE(first_purchase_id, ?)
             WHERE id = ? AND status IN ('pending', 'qualified')`
          ).run(purchaseId, referral.id)
        } else {
          const { referrerPoints, referredPoints } = splitReferralReward(
            settings.referralRewardPoints
          )
          const referrer = db
            .prepare('SELECT * FROM customers WHERE id = ?')
            .get(referral.referrer_customer_id) as CustomerRow

          const referrerBalance = referrer.points_balance + referrerPoints
          const referredCurrent = db
            .prepare('SELECT points_balance FROM customers WHERE id = ?')
            .get(input.customerId) as { points_balance: number }
          const referredBalance = referredCurrent.points_balance + referredPoints

          if (referrerPoints > 0) {
            db.prepare(
              'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
            ).run(referrerBalance, now, referrer.id)

            db.prepare(
              `INSERT INTO points_transactions (
                id, customer_id, type, points, balance_after, purchase_id,
                redemption_id, referral_id, birthday_year, description, reason,
                created_at, idempotency_key
              ) VALUES (?, ?, 'referral_reward', ?, ?, ?, NULL, ?, NULL, ?, NULL, ?, ?)`
            ).run(
              generateId('pt'),
              referrer.id,
              referrerPoints,
              referrerBalance,
              firstPurchaseId,
              referral.id,
              `Ανταμοιβή παραπομπής (80%) — ${referrerPoints} πόντοι`,
              now,
              `ref_reward_referrer_${referral.id}`
            )
          }

          if (referredPoints > 0) {
            db.prepare(
              'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
            ).run(referredBalance, now, input.customerId)

            db.prepare(
              `INSERT INTO points_transactions (
                id, customer_id, type, points, balance_after, purchase_id,
                redemption_id, referral_id, birthday_year, description, reason,
                created_at, idempotency_key
              ) VALUES (?, ?, 'referral_reward', ?, ?, ?, NULL, ?, NULL, ?, NULL, ?, ?)`
            ).run(
              generateId('pt'),
              input.customerId,
              referredPoints,
              referredBalance,
              firstPurchaseId,
              referral.id,
              `Ανταμοιβή παραπομπής (20%) — ${referredPoints} πόντοι`,
              now,
              `ref_reward_referred_${referral.id}`
            )
          }

          db.prepare(
            `UPDATE referrals SET
              status = 'rewarded',
              first_purchase_id = COALESCE(first_purchase_id, ?),
              reward_points_total = ?,
              referrer_points = ?,
              referred_points = ?,
              rewarded_at = ?
             WHERE id = ? AND status IN ('pending', 'qualified') AND rewarded_at IS NULL`
          ).run(
            firstPurchaseId,
            settings.referralRewardPoints,
            referrerPoints,
            referredPoints,
            now,
            referral.id
          )

          referralRewarded = true
        }
      }
    })
    run()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Σφάλμα καταγραφής αγοράς'
    if (message.includes('UNIQUE') && message.includes('idempotency')) {
      const again = db
        .prepare('SELECT * FROM purchases WHERE idempotency_key = ?')
        .get(input.idempotencyKey) as Parameters<typeof mapPurchase>[0]
      const bal = db
        .prepare('SELECT points_balance FROM customers WHERE id = ?')
        .get(again.customer_id) as { points_balance: number }
      return {
        success: true,
        data: {
          purchase: mapPurchase(again),
          pointsEarned: again.points_earned,
          balance: bal.points_balance,
          referralRewarded: false
        }
      }
    }
    return { success: false, error: message, code: 'DB_ERROR' }
  }

  const purchase = mapPurchase(
    db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId) as Parameters<
      typeof mapPurchase
    >[0]
  )
  const balance = (
    db.prepare('SELECT points_balance FROM customers WHERE id = ?').get(input.customerId) as {
      points_balance: number
    }
  ).points_balance

  return {
    success: true,
    data: { purchase, pointsEarned, balance, referralRewarded }
  }
}

export function listPointsTransactions(
  customerId?: string
): Array<PointsTransaction & { customerName?: string }> {
  const db = getDb()
  if (customerId) {
    const rows = db
      .prepare(
        `SELECT t.*, c.full_name as customer_name
         FROM points_transactions t
         JOIN customers c ON c.id = t.customer_id
         WHERE t.customer_id = ?
         ORDER BY t.created_at DESC`
      )
      .all(customerId) as Array<
      Parameters<typeof mapPointsTransaction>[0] & { customer_name: string }
    >
    return rows.map((r) => ({
      ...mapPointsTransaction(r),
      customerName: r.customer_name
    }))
  }

  const rows = db
    .prepare(
      `SELECT t.*, c.full_name as customer_name
       FROM points_transactions t
       JOIN customers c ON c.id = t.customer_id
       ORDER BY t.created_at DESC
       LIMIT 200`
    )
    .all() as Array<Parameters<typeof mapPointsTransaction>[0] & { customer_name: string }>

  return rows.map((r) => ({
    ...mapPointsTransaction(r),
    customerName: r.customer_name
  }))
}

export function applyCorrection(input: CorrectionInput): ApiResult<PointsTransaction> {
  if (!input.reason?.trim() || input.reason.trim().length < 3) {
    return { success: false, error: 'Απαιτείται αιτιολογία διόρθωσης', code: 'VALIDATION' }
  }
  if (!Number.isInteger(input.pointsDelta) || input.pointsDelta === 0) {
    return { success: false, error: 'Μη έγκυρη μεταβολή πόντων', code: 'VALIDATION' }
  }
  if (!input.idempotencyKey?.trim()) {
    return { success: false, error: 'Λείπει κλειδί μοναδικότητας', code: 'VALIDATION' }
  }

  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM points_transactions WHERE idempotency_key = ?')
    .get(input.idempotencyKey) as Parameters<typeof mapPointsTransaction>[0] | undefined

  if (existing) {
    return { success: true, data: mapPointsTransaction(existing) }
  }

  const now = new Date().toISOString()
  const txId = generateId('pt')

  try {
    const run = db.transaction(() => {
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(input.customerId) as CustomerRow | undefined
      if (!customer) throw new Error('Η πελάτισσα δεν βρέθηκε')

      const newBalance = customer.points_balance + input.pointsDelta
      if (newBalance < 0) {
        throw new Error('Το υπόλοιπο πόντων δεν μπορεί να γίνει αρνητικό')
      }

      db.prepare(
        'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
      ).run(newBalance, now, input.customerId)

      db.prepare(
        `INSERT INTO points_transactions (
          id, customer_id, type, points, balance_after, purchase_id,
          redemption_id, referral_id, birthday_year, description, reason,
          created_at, idempotency_key
        ) VALUES (?, ?, 'correction', ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?)`
      ).run(
        txId,
        input.customerId,
        input.pointsDelta,
        newBalance,
        `Διόρθωση πόντων (${input.pointsDelta > 0 ? '+' : ''}${input.pointsDelta})`,
        input.reason.trim(),
        now,
        input.idempotencyKey
      )
    })
    run()
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Σφάλμα διόρθωσης',
      code: 'DB_ERROR'
    }
  }

  const row = db.prepare('SELECT * FROM points_transactions WHERE id = ?').get(txId) as Parameters<
    typeof mapPointsTransaction
  >[0]
  return { success: true, data: mapPointsTransaction(row) }
}
