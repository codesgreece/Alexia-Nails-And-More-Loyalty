import './setup'
import { describe, expect, it } from 'vitest'
import { getCustomerById, registerCustomer } from '../src/main/services/customerService'
import { recordPurchase } from '../src/main/services/purchaseService'
import { listReferrals } from '../src/main/services/referralService'
import { updateSettings } from '../src/main/services/settingsService'

describe('referrals', () => {
  it('rejects invalid referral code', () => {
    const result = registerCustomer({
      fullName: 'Νέα',
      phone: '6951000001',
      dateOfBirth: '1995-01-01',
      referralCode: 'ANGEL-NOSUCH'
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_REFERRAL')
  })

  it('stores pending referral and does not reward before first purchase', () => {
    updateSettings({
      registrationBonusEnabled: false,
      referralRewardEnabled: true,
      referralRewardPoints: 10
    })
    const referrer = registerCustomer({
      fullName: 'Παραπέμπουσα',
      phone: '6951000002',
      dateOfBirth: '1990-01-01'
    }).data!.customer

    const referred = registerCustomer({
      fullName: 'Νέα',
      phone: '6951000003',
      dateOfBirth: '1992-01-01',
      referralCode: referrer.referralCode
    })
    expect(referred.success).toBe(true)

    const refs = listReferrals()
    expect(refs).toHaveLength(1)
    expect(refs[0]!.status).toBe('pending')
    expect(getCustomerById(referrer.id)?.pointsBalance).toBe(0)
  })

  it('awards 80/20 once on first eligible purchase', () => {
    updateSettings({
      registrationBonusEnabled: false,
      referralRewardEnabled: true,
      referralRewardPoints: 10
    })
    const referrer = registerCustomer({
      fullName: 'Άννα Παραπέμπουσα',
      phone: '6951000004',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    const referred = registerCustomer({
      fullName: 'Βασιλική Νέα',
      phone: '6951000005',
      dateOfBirth: '1991-01-01',
      referralCode: referrer.referralCode
    }).data!.customer

    const first = recordPurchase({
      customerId: referred.id,
      amountEuros: 20,
      purchaseDate: '2026-02-01',
      idempotencyKey: 'ref-p1'
    })
    expect(first.success).toBe(true)
    expect(first.data?.referralRewarded).toBe(true)
    expect(getCustomerById(referrer.id)?.pointsBalance).toBe(8)
    // referred: 20 purchase + 2 referral
    expect(getCustomerById(referred.id)?.pointsBalance).toBe(22)

    const second = recordPurchase({
      customerId: referred.id,
      amountEuros: 30,
      purchaseDate: '2026-02-02',
      idempotencyKey: 'ref-p2'
    })
    expect(second.data?.referralRewarded).toBe(false)
    expect(getCustomerById(referrer.id)?.pointsBalance).toBe(8)
    expect(listReferrals()[0]!.status).toBe('rewarded')
  })

  it('does not invent reward when referral reward is not configured', () => {
    updateSettings({
      registrationBonusEnabled: false,
      referralRewardEnabled: false,
      referralRewardPoints: 0
    })
    const referrer = registerCustomer({
      fullName: 'Άννα Χωρίς Ανταμοιβή',
      phone: '6951000006',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    const referred = registerCustomer({
      fullName: 'Βασιλική Χωρίς Ανταμοιβή',
      phone: '6951000007',
      dateOfBirth: '1991-01-01',
      referralCode: referrer.referralCode
    }).data!.customer

    recordPurchase({
      customerId: referred.id,
      amountEuros: 20,
      purchaseDate: '2026-02-01',
      idempotencyKey: 'ref-p3'
    })
    expect(getCustomerById(referrer.id)?.pointsBalance).toBe(0)
    expect(listReferrals()[0]!.status).toBe('qualified')
  })

  it('awards later for qualified referral once reward settings are enabled', () => {
    updateSettings({
      registrationBonusEnabled: false,
      referralRewardEnabled: false,
      referralRewardPoints: 0
    })
    const referrer = registerCustomer({
      fullName: 'Άννα Qualified',
      phone: '6951000008',
      dateOfBirth: '1990-01-01'
    }).data!.customer
    const referred = registerCustomer({
      fullName: 'Βασιλική Qualified',
      phone: '6951000009',
      dateOfBirth: '1991-01-01',
      referralCode: referrer.referralCode
    }).data!.customer

    recordPurchase({
      customerId: referred.id,
      amountEuros: 10,
      purchaseDate: '2026-02-01',
      idempotencyKey: 'ref-q1'
    })
    expect(listReferrals()[0]!.status).toBe('qualified')

    updateSettings({
      referralRewardEnabled: true,
      referralRewardPoints: 10
    })

    const second = recordPurchase({
      customerId: referred.id,
      amountEuros: 15,
      purchaseDate: '2026-02-02',
      idempotencyKey: 'ref-q2'
    })
    expect(second.data?.referralRewarded).toBe(true)
    expect(getCustomerById(referrer.id)?.pointsBalance).toBe(8)
    expect(listReferrals()[0]!.status).toBe('rewarded')
  })
})
