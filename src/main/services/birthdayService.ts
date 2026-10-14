import { generateId } from '@shared/ids'
import type { ApiResult, BirthdayBonusAward, Customer } from '@shared/types'
import { getDb } from '../db/connection'
import { mapBirthdayAward, mapCustomer, type CustomerRow } from './mappers'
import { getSettings } from './settingsService'

function monthDay(isoDate: string): string {
  // Expect YYYY-MM-DD
  return isoDate.slice(5, 10)
}

function localTodayParts(): { year: number; monthDay: string; iso: string } {
  const now = new Date()
  const year = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return { year, monthDay: `${mm}-${dd}`, iso: `${year}-${mm}-${dd}` }
}

export function getBirthdaysToday(): Customer[] {
  const { monthDay: md } = localTodayParts()
  const rows = getDb()
    .prepare(
      `SELECT * FROM customers
       WHERE status = 'active' AND substr(date_of_birth, 6, 5) = ?
       ORDER BY full_name`
    )
    .all(md) as CustomerRow[]
  return rows.map(mapCustomer)
}

export function getUpcomingBirthdays(days = 30): Array<Customer & { nextBirthday: string }> {
  const today = localTodayParts()
  const rows = getDb()
    .prepare(`SELECT * FROM customers WHERE status = 'active' ORDER BY full_name`)
    .all() as CustomerRow[]

  const results: Array<Customer & { nextBirthday: string }> = []
  const start = new Date(`${today.iso}T12:00:00`)

  for (const row of rows) {
    const md = monthDay(row.date_of_birth)
    let candidateYear = today.year
    let candidate = new Date(`${candidateYear}-${md}T12:00:00`)
    if (candidate < start) {
      candidateYear += 1
      candidate = new Date(`${candidateYear}-${md}T12:00:00`)
    }
    const diffDays = Math.round((candidate.getTime() - start.getTime()) / 86400000)
    if (diffDays >= 0 && diffDays <= days) {
      results.push({
        ...mapCustomer(row),
        nextBirthday: `${candidateYear}-${md}`
      })
    }
  }

  return results.sort((a, b) => a.nextBirthday.localeCompare(b.nextBirthday))
}

export function listBirthdayAwards(): Array<BirthdayBonusAward & { customerName: string }> {
  const rows = getDb()
    .prepare(
      `SELECT b.*, c.full_name as customer_name
       FROM birthday_bonus_awards b
       JOIN customers c ON c.id = b.customer_id
       ORDER BY b.awarded_at DESC`
    )
    .all() as Array<Parameters<typeof mapBirthdayAward>[0] & { customer_name: string }>

  return rows.map((r) => ({
    ...mapBirthdayAward(r),
    customerName: r.customer_name
  }))
}

/**
 * Process birthday bonuses for eligible customers.
 * - Once per customer per calendar year (DB UNIQUE constraint)
 * - Includes missed birthdays earlier in the current year
 * - Safe across restarts / repeated calls
 */
export function processBirthdayBonuses(): ApiResult<{
  awarded: number
  awards: BirthdayBonusAward[]
}> {
  const settings = getSettings()
  if (!settings.birthdayBonusEnabled || settings.birthdayBonusPoints <= 0) {
    return {
      success: true,
      data: { awarded: 0, awards: [] }
    }
  }

  const { year, monthDay: todayMd, iso: todayIso } = localTodayParts()
  const db = getDb()
  const points = settings.birthdayBonusPoints
  const awards: BirthdayBonusAward[] = []

  const candidates = db
    .prepare(
      `SELECT c.* FROM customers c
       WHERE c.status = 'active'
         AND substr(c.date_of_birth, 6, 5) <= ?
         AND NOT EXISTS (
           SELECT 1 FROM birthday_bonus_awards b
           WHERE b.customer_id = c.id AND b.calendar_year = ?
         )`
    )
    .all(todayMd, year) as CustomerRow[]

  const now = new Date().toISOString()

  for (const customer of candidates) {
    try {
      const run = db.transaction(() => {
        // Re-check uniqueness inside transaction
        const already = db
          .prepare(
            'SELECT 1 FROM birthday_bonus_awards WHERE customer_id = ? AND calendar_year = ?'
          )
          .get(customer.id, year)
        if (already) return null

        const locked = db
          .prepare('SELECT * FROM customers WHERE id = ?')
          .get(customer.id) as CustomerRow
        const newBalance = locked.points_balance + points
        const awardId = generateId('bday')

        db.prepare(
          `INSERT INTO birthday_bonus_awards (
            id, customer_id, calendar_year, points_awarded, awarded_at
          ) VALUES (?, ?, ?, ?, ?)`
        ).run(awardId, customer.id, year, points, now)

        db.prepare(
          'UPDATE customers SET points_balance = ?, updated_at = ? WHERE id = ?'
        ).run(newBalance, now, customer.id)

        db.prepare(
          `INSERT INTO points_transactions (
            id, customer_id, type, points, balance_after, purchase_id,
            redemption_id, referral_id, birthday_year, description, reason,
            created_at, idempotency_key
          ) VALUES (?, ?, 'birthday_bonus', ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?, ?)`
        ).run(
          generateId('pt'),
          customer.id,
          points,
          newBalance,
          year,
          `Μπόνους γενεθλίων ${year} — ${points} πόντοι`,
          now,
          `birthday_${customer.id}_${year}`
        )

        return {
          id: awardId,
          customerId: customer.id,
          calendarYear: year,
          pointsAwarded: points,
          awardedAt: now
        } satisfies BirthdayBonusAward
      })

      const award = run()
      if (award) awards.push(award)
    } catch (err) {
      // UNIQUE constraint race — safe to ignore
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('UNIQUE')) {
        return {
          success: false,
          error: msg || 'Σφάλμα επεξεργασίας γενεθλίων',
          code: 'DB_ERROR'
        }
      }
    }
  }

  void todayIso
  return { success: true, data: { awarded: awards.length, awards } }
}
