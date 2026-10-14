import './setup'
import { describe, expect, it } from 'vitest'
import { getCustomerById, registerCustomer } from '../src/main/services/customerService'
import { recordPurchase } from '../src/main/services/purchaseService'
import {
  createReward,
  redeemReward,
  updateReward
} from '../src/main/services/rewardService'
import { updateSettings } from '../src/main/services/settingsService'

describe('rewards redemption', () => {
  it('redeems successfully and deducts points', () => {
    updateSettings({ registrationBonusEnabled: false })
    const c = registerCustomer({
      fullName: 'Άννα Ανταμοιβή',
      phone: '6971000001',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    recordPurchase({
      customerId: c.id,
      amountEuros: 100,
      purchaseDate: '2026-01-01',
      idempotencyKey: 'buy1'
    })
    const reward = createReward({
      name: 'Έκπτωση',
      description: 'Test',
      pointsRequired: 40
    }).data!

    const result = redeemReward({
      customerId: c.id,
      rewardId: reward.id,
      idempotencyKey: 'rdm1'
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe(60)
    expect(getCustomerById(c.id)?.pointsBalance).toBe(60)
  })

  it('rejects insufficient points', () => {
    updateSettings({ registrationBonusEnabled: false })
    const c = registerCustomer({
      fullName: 'Βασιλική Ανεπαρκείς',
      phone: '6971000002',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    const reward = createReward({
      name: 'Ακριβή',
      description: '',
      pointsRequired: 50
    }).data!
    const result = redeemReward({
      customerId: c.id,
      rewardId: reward.id,
      idempotencyKey: 'rdm2'
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('INSUFFICIENT_POINTS')
  })

  it('rejects inactive rewards', () => {
    updateSettings({ registrationBonusEnabled: false })
    const c = registerCustomer({
      fullName: 'Γεωργία Ανενεργή',
      phone: '6971000003',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    recordPurchase({
      customerId: c.id,
      amountEuros: 100,
      purchaseDate: '2026-01-01',
      idempotencyKey: 'buy2'
    })
    const reward = createReward({
      name: 'Ανενεργή',
      description: '',
      pointsRequired: 10,
      isActive: true
    }).data!
    updateReward({ id: reward.id, isActive: false })
    const result = redeemReward({
      customerId: c.id,
      rewardId: reward.id,
      idempotencyKey: 'rdm3'
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('INACTIVE_REWARD')
  })

  it('prevents duplicate redemption via idempotency key', () => {
    updateSettings({ registrationBonusEnabled: false })
    const c = registerCustomer({
      fullName: 'Δήμητρα Διπλή',
      phone: '6971000004',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    recordPurchase({
      customerId: c.id,
      amountEuros: 100,
      purchaseDate: '2026-01-01',
      idempotencyKey: 'buy3'
    })
    const reward = createReward({
      name: 'Διπλή',
      description: '',
      pointsRequired: 20
    }).data!
    const a = redeemReward({
      customerId: c.id,
      rewardId: reward.id,
      idempotencyKey: 'same-rdm'
    })
    const b = redeemReward({
      customerId: c.id,
      rewardId: reward.id,
      idempotencyKey: 'same-rdm'
    })
    expect(a.success && b.success).toBe(true)
    expect(getCustomerById(c.id)?.pointsBalance).toBe(80)
  })
})
