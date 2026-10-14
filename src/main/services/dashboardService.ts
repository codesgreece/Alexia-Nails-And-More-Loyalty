import type { DashboardStats, DateRange, StatisticsReport } from '@shared/types'
import { getDb } from '../db/connection'
import { mapCustomer, mapPointsTransaction, mapPurchase, type CustomerRow } from './mappers'

function defaultRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10)
  }
}

export function getDashboardStats(range?: DateRange): DashboardStats {
  const db = getDb()
  const { from, to } = range ?? defaultRange()
  const fromTs = `${from}T00:00:00.000Z`
  const toTs = `${to}T23:59:59.999Z`

  const totalCustomers = (
    db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status = 'active'`).get() as {
      c: number
    }
  ).c

  const newCustomersInPeriod = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM customers
         WHERE created_at >= ? AND created_at <= ?`
      )
      .get(fromTs, toTs) as { c: number }
  ).c

  const totalPointsOutstanding = (
    db.prepare(`SELECT COALESCE(SUM(points_balance), 0) as s FROM customers`).get() as {
      s: number
    }
  ).s

  const pointsAwardedInPeriod = (
    db
      .prepare(
        `SELECT COALESCE(SUM(points), 0) as s FROM points_transactions
         WHERE points > 0 AND created_at >= ? AND created_at <= ?`
      )
      .get(fromTs, toTs) as { s: number }
  ).s

  const pointsRedeemedInPeriod = (
    db
      .prepare(
        `SELECT COALESCE(SUM(ABS(points)), 0) as s FROM points_transactions
         WHERE type = 'redemption' AND created_at >= ? AND created_at <= ?`
      )
      .get(fromTs, toTs) as { s: number }
  ).s

  const referralRegistrations = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM referrals
         WHERE created_at >= ? AND created_at <= ?`
      )
      .get(fromTs, toTs) as { c: number }
  ).c

  const successfulReferrals = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM referrals
         WHERE status = 'rewarded' AND rewarded_at >= ? AND rewarded_at <= ?`
      )
      .get(fromTs, toTs) as { c: number }
  ).c

  const purchaseAgg = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(amount_cents), 0) as s FROM purchases`
    )
    .get() as { c: number; s: number }

  const recentCustomers = (
    db
      .prepare(`SELECT * FROM customers ORDER BY created_at DESC LIMIT 8`)
      .all() as CustomerRow[]
  ).map(mapCustomer)

  const recentPurchases = (
    db
      .prepare(
        `SELECT p.*, c.full_name as customer_name
         FROM purchases p
         JOIN customers c ON c.id = p.customer_id
         ORDER BY p.created_at DESC LIMIT 8`
      )
      .all() as Array<Parameters<typeof mapPurchase>[0] & { customer_name: string }>
  ).map((r) => ({ ...mapPurchase(r), customerName: r.customer_name }))

  const recentTransactions = (
    db
      .prepare(
        `SELECT t.*, c.full_name as customer_name
         FROM points_transactions t
         JOIN customers c ON c.id = t.customer_id
         ORDER BY t.created_at DESC LIMIT 10`
      )
      .all() as Array<
      Parameters<typeof mapPointsTransaction>[0] & { customer_name: string }
    >
  ).map((r) => ({ ...mapPointsTransaction(r), customerName: r.customer_name }))

  return {
    totalCustomers,
    newCustomersInPeriod,
    totalPointsOutstanding,
    pointsAwardedInPeriod,
    pointsRedeemedInPeriod,
    referralRegistrations,
    successfulReferrals,
    totalPurchases: purchaseAgg.c,
    totalSpendingCents: purchaseAgg.s,
    recentCustomers,
    recentPurchases,
    recentTransactions
  }
}

export function getStatisticsReport(range?: DateRange): StatisticsReport {
  const db = getDb()
  const { from, to } = range ?? defaultRange()
  const fromTs = `${from}T00:00:00.000Z`
  const toTs = `${to}T23:59:59.999Z`

  const totalCustomers = (
    db.prepare(`SELECT COUNT(*) as c FROM customers WHERE status != 'archived'`).get() as {
      c: number
    }
  ).c

  const registrationsInPeriod = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM customers WHERE created_at >= ? AND created_at <= ?`
      )
      .get(fromTs, toTs) as { c: number }
  ).c

  const birthdaysInPeriod = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM customers
         WHERE status = 'active'
           AND substr(date_of_birth, 6, 5) >= substr(?, 6, 5)
           AND substr(date_of_birth, 6, 5) <= substr(?, 6, 5)`
      )
      .get(from, to) as { c: number }
  ).c

  const totalPointsAwarded = (
    db
      .prepare(
        `SELECT COALESCE(SUM(points), 0) as s FROM points_transactions WHERE points > 0`
      )
      .get() as { s: number }
  ).s

  const totalPointsRedeemed = (
    db
      .prepare(
        `SELECT COALESCE(SUM(ABS(points)), 0) as s FROM points_transactions WHERE type = 'redemption'`
      )
      .get() as { s: number }
  ).s

  const outstandingPoints = (
    db.prepare(`SELECT COALESCE(SUM(points_balance), 0) as s FROM customers`).get() as {
      s: number
    }
  ).s

  const purchaseAgg = db
    .prepare(
      `SELECT COUNT(*) as c, COALESCE(SUM(amount_cents), 0) as s FROM purchases
       WHERE purchase_date >= ? AND purchase_date <= ?`
    )
    .get(from, to) as { c: number; s: number }

  const referralRegistrations = (
    db.prepare(`SELECT COUNT(*) as c FROM referrals`).get() as { c: number }
  ).c

  const qualifiedReferrals = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM referrals WHERE status IN ('qualified', 'rewarded')`
      )
      .get() as { c: number }
  ).c

  const completedReferralRewards = (
    db.prepare(`SELECT COUNT(*) as c FROM referrals WHERE status = 'rewarded'`).get() as {
      c: number
    }
  ).c

  const topRedeemedRewards = db
    .prepare(
      `SELECT rw.id as rewardId, rw.name as rewardName, COUNT(rd.id) as count
       FROM redemptions rd
       JOIN rewards rw ON rw.id = rd.reward_id
       WHERE rd.status = 'completed'
       GROUP BY rw.id, rw.name
       ORDER BY count DESC
       LIMIT 10`
    )
    .all() as Array<{ rewardId: string; rewardName: string; count: number }>

  return {
    totalCustomers,
    registrationsInPeriod,
    birthdaysInPeriod,
    totalPointsAwarded,
    totalPointsRedeemed,
    outstandingPoints,
    totalPurchaseValueCents: purchaseAgg.s,
    averagePurchaseValueCents:
      purchaseAgg.c > 0 ? Math.round(purchaseAgg.s / purchaseAgg.c) : 0,
    referralRegistrations,
    qualifiedReferrals,
    completedReferralRewards,
    topRedeemedRewards
  }
}

export function buildStatsCsv(range?: DateRange): string {
  const report = getStatisticsReport(range)
  const lines = [
    'Μετρική,Τιμή',
    `Σύνολο πελατισσών,${report.totalCustomers}`,
    `Εγγραφές περιόδου,${report.registrationsInPeriod}`,
    `Γενέθλια περιόδου,${report.birthdaysInPeriod}`,
    `Σύνολο πόντων που δόθηκαν,${report.totalPointsAwarded}`,
    `Σύνολο πόντων που εξαργυρώθηκαν,${report.totalPointsRedeemed}`,
    `Ανεξόφλητοι πόντοι,${report.outstandingPoints}`,
    `Συνολική αξία αγορών (λεπτά),${report.totalPurchaseValueCents}`,
    `Μέση αξία αγοράς (λεπτά),${report.averagePurchaseValueCents}`,
    `Παραπομπές,${report.referralRegistrations}`,
    `Επιλέξιμες παραπομπές,${report.qualifiedReferrals}`,
    `Ολοκληρωμένες ανταμοιβές παραπομπής,${report.completedReferralRewards}`
  ]
  return lines.join('\n')
}
