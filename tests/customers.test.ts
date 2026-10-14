import './setup'
import { describe, expect, it } from 'vitest'
import {
  findCustomerByPhone,
  getCustomerById,
  registerCustomer
} from '../src/main/services/customerService'
import { updateSettings } from '../src/main/services/settingsService'
import { listPointsTransactions } from '../src/main/services/purchaseService'

describe('customer registration', () => {
  it('registers a customer with unique id and referral code', () => {
    const result = registerCustomer({
      fullName: 'Μαρία Παπαδοπούλου',
      phone: '6912345678',
      dateOfBirth: '1990-05-15'
    })
    expect(result.success).toBe(true)
    expect(result.data?.customer.id).toMatch(/^ANC-/)
    expect(result.data?.customer.referralCode).toMatch(/^ANGEL-/)
    expect(result.data?.customer.pointsBalance).toBe(50)
  })

  it('rejects duplicate phone numbers', () => {
    registerCustomer({
      fullName: 'Άννα Α',
      phone: '6911111111',
      dateOfBirth: '1991-01-01'
    })
    const dup = registerCustomer({
      fullName: 'Βασιλική Β',
      phone: '6911111111',
      dateOfBirth: '1992-01-01'
    })
    expect(dup.success).toBe(false)
    expect(dup.code).toBe('DUPLICATE_PHONE')
    expect(findCustomerByPhone('6911111111')).not.toBeNull()
  })

  it('awards registration bonus only once', () => {
    updateSettings({ registrationBonusEnabled: true, registrationBonusPoints: 40 })
    const result = registerCustomer({
      fullName: 'Ελένη',
      phone: '6922222222',
      dateOfBirth: '1988-03-03'
    })
    expect(result.success).toBe(true)
    const id = result.data!.customer.id
    const customer = getCustomerById(id)!
    expect(customer.registrationBonusAwarded).toBe(1)
    expect(customer.pointsBalance).toBe(40)
    const txs = listPointsTransactions(id).filter((t) => t.type === 'registration_bonus')
    expect(txs).toHaveLength(1)
  })

  it('creates unique referral codes for multiple customers', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const r = registerCustomer({
        fullName: `Πελάτισσα ${i}`,
        phone: `693000000${i}`,
        dateOfBirth: '1995-01-01'
      })
      expect(r.success).toBe(true)
      codes.add(r.data!.customer.referralCode)
    }
    expect(codes.size).toBe(5)
  })
})
