import type { ReferralListItem } from '@shared/types'
import { getDb } from '../db/connection'
import { mapReferral } from './mappers'

export function listReferrals(): ReferralListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT r.*,
        ref.full_name as referrer_name,
        ref.referral_code as referrer_code,
        rd.full_name as referred_name
       FROM referrals r
       JOIN customers ref ON ref.id = r.referrer_customer_id
       JOIN customers rd ON rd.id = r.referred_customer_id
       ORDER BY r.created_at DESC`
    )
    .all() as Array<{
    id: string
    referrer_customer_id: string
    referred_customer_id: string
    status: string
    first_purchase_id: string | null
    reward_points_total: number | null
    referrer_points: number | null
    referred_points: number | null
    rewarded_at: string | null
    created_at: string
    referrer_name: string
    referrer_code: string
    referred_name: string
  }>

  return rows.map((r) => ({
    ...mapReferral(r),
    referrerName: r.referrer_name,
    referrerCode: r.referrer_code,
    referredName: r.referred_name
  }))
}
