import { generateId } from '@shared/ids'
import type {
  ApiResult,
  CreateRewardInput,
  RedeemRewardInput,
  Redemption,
  RedemptionListItem,
  Reward,
  UpdateRewardInput
} from '@shared/types'
import { getDb } from '../db/connection'
import { mapRedemption, mapReward, type CustomerRow } from './mappers'

function isRewardCurrentlyValid(reward: Reward, today: string): boolean {
  if (!reward.isActive) return false
  if (reward.validFrom && reward.validFrom > today) return false
  if (reward.validTo && reward.validTo < today) return false
  if (reward.maxRedemptions != null && reward.redemptionCount >= reward.maxRedemptions) {
    return false
  }
  return true
}

export function listRewards(activeOnly = false): Reward[] {
  const sql = activeOnly
    ? 'SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_required ASC'
    : 'SELECT * FROM rewards ORDER BY created_at DESC'
  return getDb()
    .prepare(sql)
    .all()
    .map((r) => mapReward(r as Parameters<typeof mapReward>[0]))
}

export function createReward(input: CreateRewardInput): ApiResult<Reward> {
  const name = input.name?.trim()
  if (!name) return { success: false, error: 'Το όνομα ανταμοιβής είναι υποχρεωτικό', code: 'VALIDATION' }
  if (!Number.isInteger(input.pointsRequired) || input.pointsRequired <= 0) {
    return { success: false, error: 'Οι απαιτούμενοι πόντοι πρέπει να είναι θετικοί', code: 'VALIDATION' }
  }

  const now = new Date().toISOString()
  const id = generateId('rw')
  getDb()
    .prepare(
      `INSERT INTO rewards (
        id, name, description, points_required, is_active,
        valid_from, valid_to, max_redemptions, redemption_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .run(
      id,
      name,
      input.description?.trim() || '',
      input.pointsRequired,
      input.isActive === false ? 0 : 1,
      input.validFrom ?? null,
      input.validTo ?? null,
      input.maxRedemptions ?? null,
      now,
      now
    )

  const row = getDb().prepare('SELECT * FROM rewards WHERE id = ?').get(id) as Parameters<
    typeof mapReward
  >[0]
  return { success: true, data: mapReward(row) }
}

export function updateReward(input: UpdateRewardInput): ApiResult<Reward> {
  const existing = getDb()
    .prepare('SELECT * FROM rewards WHERE id = ?')
    .get(input.id) as Parameters<typeof mapReward>[0] | undefined
  if (!existing) {
    return { success: false, error: 'Η ανταμοιβή δεν βρέθηκε', code: 'NOT_FOUND' }
  }

  const current = mapReward(existing)
  const name = input.name?.trim() ?? current.name
  const description = input.description ?? current.description
  const pointsRequired = input.pointsRequired ?? current.pointsRequired
  const isActive = input.isActive ?? current.isActive
  const validFrom = input.validFrom !== undefined ? input.validFrom : current.validFrom
  const validTo = input.validTo !== undefined ? input.validTo : current.validTo
  const maxRedemptions =
    input.maxRedemptions !== undefined ? input.maxRedemptions : current.maxRedemptions

  if (!name) return { success: false, error: 'Το όνομα ανταμοιβής είναι υποχρεωτικό', code: 'VALIDATION' }
  if (!Number.isInteger(pointsRequired) || pointsRequired <= 0) {
    return { success: false, error: 'Οι απαιτούμενοι πόντοι πρέπει να είναι θετικοί', code: 'VALIDATION' }
  }

  const now = new Date().toISOString()
  getDb()
    .prepare(
      `UPDATE rewards SET
        name = ?, description = ?, points_required = ?, is_active = ?,
        valid_from = ?, valid_to = ?, max_redemptions = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      name,
      description,
      pointsRequired,
      isActive ? 1 : 0,
      validFrom,
      validTo,
      maxRedemptions,
      now,
      input.id
    )

  const row = getDb().prepare('SELECT * FROM rewards WHERE id = ?').get(input.id) as Parameters<
    typeof mapReward
  >[0]
  return { success: true, data: mapReward(row) }
}

export function redeemReward(
  input: RedeemRewardInput
): ApiResult<{ redemption: Redemption; balance: number }> {
  if (!input.idempotencyKey?.trim()) {
    return { success: false, error: 'Λείπει κλειδί μοναδικότητας', code: 'VALIDATION' }
  }

  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM redemptions WHERE idempotency_key = ?')
    .get(input.idempotencyKey) as Parameters<typeof mapRedemption>[0] | undefined

  if (existing) {
    const bal = db
      .prepare('SELECT points_balance FROM customers WHERE id = ?')
      .get(existing.customer_id) as { points_balance: number }
    return {
      success: true,
      data: { redemption: mapRedemption(existing), balance: bal.points_balance }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const redemptionId = generateId('rdm')

  try {
    const run = db.transaction(() => {
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(input.customerId) as CustomerRow | undefined
      if (!customer) throw new Error('Η πελάτισσα δεν βρέθηκε')
      if (customer.status !== 'active') throw new Error('Η πελάτισσα δεν είναι ενεργή')

      const rewardRow = db
        .prepare('SELECT * FROM rewards WHERE id = ?')
        .get(input.rewardId) as Parameters<typeof mapReward>[0] | undefined
      if (!rewardRow) throw new Error('Η ανταμοιβή δεν βρέθηκε')

      const reward = mapReward(rewardRow)
      if (!isRewardCurrentlyValid(reward, today)) {
        throw new Error('Η ανταμοιβή δεν είναι διαθέσιμη')
      }
      if (customer.points_balance < reward.pointsRequired) {
        throw new Error('Ανεπαρκείς πόντοι')
      }

      const newBalance = customer.points_balance - reward.pointsRequired

      db.prepare(
        `INSERT INTO redemptions (
          id, customer_id, reward_id, points_spent, status, created_at, idempotency_key
        ) VALUES (?, ?, ?, ?, 'completed', ?, ?)`
      ).run(
        redemptionId,
        input.customerId,
        input.rewardId,
        reward.pointsRequired,
        now,
        input.idempotencyKey
      )

      db.prepare(
        'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
      ).run(newBalance, now, input.customerId)

      db.prepare(
        'UPDATE rewards SET redemption_count = redemption_count + 1, updated_at = ? WHERE id = ?'
      ).run(now, input.rewardId)

      db.prepare(
        `INSERT INTO points_transactions (
          id, customer_id, type, points, balance_after, purchase_id,
          redemption_id, referral_id, birthday_year, description, reason,
          created_at, idempotency_key
        ) VALUES (?, ?, 'redemption', ?, ?, NULL, ?, NULL, NULL, ?, NULL, ?, ?)`
      ).run(
        generateId('pt'),
        input.customerId,
        -reward.pointsRequired,
        newBalance,
        redemptionId,
        `Εξαργύρωση: ${reward.name} (−${reward.pointsRequired} πόντοι)`,
        now,
        `redeem_${input.idempotencyKey}`
      )

      return newBalance
    })

    const balance = run()
    const redemption = mapRedemption(
      db.prepare('SELECT * FROM redemptions WHERE id = ?').get(redemptionId) as Parameters<
        typeof mapRedemption
      >[0]
    )
    return { success: true, data: { redemption, balance } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Σφάλμα εξαργύρωσης'
    if (message.includes('UNIQUE') && message.includes('idempotency')) {
      const again = db
        .prepare('SELECT * FROM redemptions WHERE idempotency_key = ?')
        .get(input.idempotencyKey) as Parameters<typeof mapRedemption>[0]
      const bal = db
        .prepare('SELECT points_balance FROM customers WHERE id = ?')
        .get(again.customer_id) as { points_balance: number }
      return {
        success: true,
        data: { redemption: mapRedemption(again), balance: bal.points_balance }
      }
    }
    const code =
      message === 'Ανεπαρκείς πόντοι'
        ? 'INSUFFICIENT_POINTS'
        : message.includes('διαθέσιμη')
          ? 'INACTIVE_REWARD'
          : 'DB_ERROR'
    return { success: false, error: message, code }
  }
}

export function listRedemptions(): RedemptionListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT rd.*, c.full_name as customer_name, rw.name as reward_name
       FROM redemptions rd
       JOIN customers c ON c.id = rd.customer_id
       JOIN rewards rw ON rw.id = rd.reward_id
       ORDER BY rd.created_at DESC`
    )
    .all() as Array<
    Parameters<typeof mapRedemption>[0] & { customer_name: string; reward_name: string }
  >

  return rows.map((r) => ({
    ...mapRedemption(r),
    customerName: r.customer_name,
    rewardName: r.reward_name
  }))
}
