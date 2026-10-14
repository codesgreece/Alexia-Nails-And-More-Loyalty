import { describe, expect, it } from 'vitest'
import {
  calculatePurchasePoints,
  eurosToCents,
  splitReferralReward
} from '../src/shared/points'

describe('points conversion policy', () => {
  it('converts whole euros to points 1:1', () => {
    expect(calculatePurchasePoints(eurosToCents(10))).toBe(10)
    expect(calculatePurchasePoints(eurosToCents(25))).toBe(25)
  })

  it('floors fractional euros', () => {
    expect(calculatePurchasePoints(eurosToCents(35.5))).toBe(35)
    expect(calculatePurchasePoints(eurosToCents(0.99))).toBe(0)
    expect(calculatePurchasePoints(3599)).toBe(35)
  })

  it('rejects negative amounts', () => {
    expect(() => eurosToCents(-1)).toThrow()
  })
})

describe('referral 80/20 split', () => {
  it('splits evenly divisible totals', () => {
    expect(splitReferralReward(10)).toEqual({ referrerPoints: 8, referredPoints: 2 })
  })

  it('gives remainder to referrer', () => {
    expect(splitReferralReward(11)).toEqual({ referrerPoints: 9, referredPoints: 2 })
    expect(splitReferralReward(1)).toEqual({ referrerPoints: 1, referredPoints: 0 })
  })

  it('portions always sum to total', () => {
    for (const total of [0, 1, 2, 3, 7, 10, 11, 99, 100]) {
      const { referrerPoints, referredPoints } = splitReferralReward(total)
      expect(referrerPoints + referredPoints).toBe(total)
    }
  })
})
