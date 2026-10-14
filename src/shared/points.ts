/**
 * Points conversion policy (documented & tested):
 *
 * Every €1 of eligible spending earns 1 loyalty point.
 * Fractional euros are floored to whole euros before conversion.
 *
 * Examples:
 *   €10.00 → 10 points
 *   €25.00 → 25 points
 *   €35.50 → 35 points  (floor of 35.50 euros)
 *   €0.99  → 0 points
 *
 * Monetary amounts are stored as integer cents.
 * points = Math.floor(amountCents / 100) * pointsPerEuro
 * Default pointsPerEuro = 1.
 */

export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros) || euros < 0) {
    throw new Error('Μη έγκυρο ποσό')
  }
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function calculatePurchasePoints(
  amountCents: number,
  pointsPerEuro = 1
): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error('Μη έγκυρο ποσό σε λεπτά')
  }
  if (!Number.isInteger(pointsPerEuro) || pointsPerEuro < 1) {
    throw new Error('Μη έγκυρη αναλογία πόντων')
  }
  const wholeEuros = Math.floor(amountCents / 100)
  return wholeEuros * pointsPerEuro
}

/**
 * Referral reward 80%/20% split with integer-safe arithmetic.
 *
 * Rounding rule: the referred customer receives Math.floor(total * 0.2).
 * The referring customer receives the remainder (total - referredShare).
 * Both portions always sum exactly to the configured total.
 *
 * Examples (total = 10): referrer 8, referred 2
 * Examples (total = 11): referrer 9, referred 2
 * Examples (total = 1):  referrer 1, referred 0
 */
export function splitReferralReward(totalPoints: number): {
  referrerPoints: number
  referredPoints: number
} {
  if (!Number.isInteger(totalPoints) || totalPoints < 0) {
    throw new Error('Μη έγκυροι πόντοι ανταμοιβής παραπομπής')
  }
  const referredPoints = Math.floor((totalPoints * 20) / 100)
  const referrerPoints = totalPoints - referredPoints
  return { referrerPoints, referredPoints }
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100)
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}
