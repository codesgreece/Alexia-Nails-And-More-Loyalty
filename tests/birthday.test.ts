import './setup'
import { describe, expect, it } from 'vitest'
import { getDb } from '../src/main/db/connection'
import { processBirthdayBonuses } from '../src/main/services/birthdayService'
import { getCustomerById, registerCustomer } from '../src/main/services/customerService'
import { updateSettings } from '../src/main/services/settingsService'

describe('birthday bonuses', () => {
  it('awards once per year and is idempotent across restarts', () => {
    updateSettings({
      registrationBonusEnabled: false,
      birthdayBonusEnabled: true,
      birthdayBonusPoints: 30
    })

    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dob = `1990-${mm}-${dd}`

    const customer = registerCustomer({
      fullName: 'Γενέθλια',
      phone: '6961000001',
      dateOfBirth: dob
    }).data!.customer

    const first = processBirthdayBonuses()
    expect(first.success).toBe(true)
    expect(first.data?.awarded).toBe(1)
    expect(getCustomerById(customer.id)?.pointsBalance).toBe(30)

    const second = processBirthdayBonuses()
    expect(second.success).toBe(true)
    expect(second.data?.awarded).toBe(0)
    expect(getCustomerById(customer.id)?.pointsBalance).toBe(30)

    const awards = getDb()
      .prepare('SELECT COUNT(*) as c FROM birthday_bonus_awards WHERE customer_id = ?')
      .get(customer.id) as { c: number }
    expect(awards.c).toBe(1)
  })

  it('can process a missed birthday earlier in the year', () => {
    updateSettings({
      registrationBonusEnabled: false,
      birthdayBonusEnabled: true,
      birthdayBonusPoints: 25
    })

    const today = new Date()
    // Pick a date 5 days ago in the same year if possible
    const past = new Date(today)
    past.setDate(past.getDate() - 5)
    if (past.getFullYear() !== today.getFullYear()) {
      // Near year boundary — use Jan 1 of current year
      past.setFullYear(today.getFullYear(), 0, 1)
    }
    const mm = String(past.getMonth() + 1).padStart(2, '0')
    const dd = String(past.getDate()).padStart(2, '0')

    const customer = registerCustomer({
      fullName: 'Χαμένα',
      phone: '6961000002',
      dateOfBirth: `1985-${mm}-${dd}`
    }).data!.customer

    const result = processBirthdayBonuses()
    expect(result.success).toBe(true)
    expect(result.data?.awarded).toBeGreaterThanOrEqual(1)
    expect(getCustomerById(customer.id)?.pointsBalance).toBe(25)
  })
})
