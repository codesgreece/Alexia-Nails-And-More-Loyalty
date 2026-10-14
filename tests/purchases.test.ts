import './setup'
import { describe, expect, it } from 'vitest'
import { registerCustomer } from '../src/main/services/customerService'
import { getCustomerById } from '../src/main/services/customerService'
import {
  applyCorrection,
  listPointsTransactions,
  recordPurchase
} from '../src/main/services/purchaseService'
import { updateSettings } from '../src/main/services/settingsService'

function reg(phone: string) {
  updateSettings({ registrationBonusEnabled: false, registrationBonusPoints: 0 })
  return registerCustomer({
    fullName: 'Test User',
    phone,
    dateOfBirth: '1990-01-01'
  }).data!.customer
}

describe('purchases and points ledger', () => {
  it('awards floored euro points and updates balance', () => {
    const c = reg('6941000001')
    const result = recordPurchase({
      customerId: c.id,
      amountEuros: 35.5,
      purchaseDate: '2026-01-10',
      idempotencyKey: 'k1'
    })
    expect(result.success).toBe(true)
    expect(result.data?.pointsEarned).toBe(35)
    expect(getCustomerById(c.id)?.pointsBalance).toBe(35)
  })

  it('is idempotent for the same idempotency key', () => {
    const c = reg('6941000002')
    const a = recordPurchase({
      customerId: c.id,
      amountEuros: 10,
      purchaseDate: '2026-01-10',
      idempotencyKey: 'same-key'
    })
    const b = recordPurchase({
      customerId: c.id,
      amountEuros: 10,
      purchaseDate: '2026-01-10',
      idempotencyKey: 'same-key'
    })
    expect(a.success && b.success).toBe(true)
    expect(getCustomerById(c.id)?.pointsBalance).toBe(10)
    expect(listPointsTransactions(c.id).filter((t) => t.type === 'purchase')).toHaveLength(1)
  })

  it('accumulates balance across purchases', () => {
    const c = reg('6941000003')
    recordPurchase({
      customerId: c.id,
      amountEuros: 20,
      purchaseDate: '2026-01-10',
      idempotencyKey: 'p1'
    })
    recordPurchase({
      customerId: c.id,
      amountEuros: 15,
      purchaseDate: '2026-01-11',
      idempotencyKey: 'p2'
    })
    expect(getCustomerById(c.id)?.pointsBalance).toBe(35)
  })

  it('rejects corrections that would create negative balance', () => {
    const c = reg('6941000004')
    recordPurchase({
      customerId: c.id,
      amountEuros: 5,
      purchaseDate: '2026-01-10',
      idempotencyKey: 'p3'
    })
    const corr = applyCorrection({
      customerId: c.id,
      pointsDelta: -10,
      reason: 'Δοκιμή',
      idempotencyKey: 'corr1'
    })
    expect(corr.success).toBe(false)
    expect(getCustomerById(c.id)?.pointsBalance).toBe(5)
  })
})
