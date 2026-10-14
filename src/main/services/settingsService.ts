import { getDb } from '../db/connection'
import type { AppSettings, UpdateSettingsInput } from '@shared/types'

function getSetting(key: string, fallback: string): string {
  const row = getDb()
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value ?? fallback
}

function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value)
}

export function getSettings(): AppSettings {
  return {
    registrationBonusEnabled: getSetting('registration_bonus_enabled', '1') === '1',
    registrationBonusPoints: Number(getSetting('registration_bonus_points', '50')),
    birthdayBonusEnabled: getSetting('birthday_bonus_enabled', '1') === '1',
    birthdayBonusPoints: Number(getSetting('birthday_bonus_points', '30')),
    referralRewardEnabled: getSetting('referral_reward_enabled', '1') === '1',
    referralRewardPoints: Number(getSetting('referral_reward_points', '50')),
    pointsPerEuro: Number(getSetting('points_per_euro', '1')),
    businessName: getSetting('business_name', 'Angel Nails & More'),
    appName: getSetting('app_name', 'Angel Nails Club')
  }
}

export function updateSettings(input: UpdateSettingsInput): AppSettings {
  const db = getDb()
  const tx = db.transaction(() => {
    if (input.registrationBonusEnabled !== undefined) {
      setSetting('registration_bonus_enabled', input.registrationBonusEnabled ? '1' : '0')
    }
    if (input.registrationBonusPoints !== undefined) {
      if (!Number.isInteger(input.registrationBonusPoints) || input.registrationBonusPoints < 0) {
        throw new Error('Οι πόντοι εγγραφής πρέπει να είναι μη αρνητικός ακέραιος')
      }
      setSetting('registration_bonus_points', String(input.registrationBonusPoints))
    }
    if (input.birthdayBonusEnabled !== undefined) {
      setSetting('birthday_bonus_enabled', input.birthdayBonusEnabled ? '1' : '0')
    }
    if (input.birthdayBonusPoints !== undefined) {
      if (!Number.isInteger(input.birthdayBonusPoints) || input.birthdayBonusPoints < 0) {
        throw new Error('Οι πόντοι γενεθλίων πρέπει να είναι μη αρνητικός ακέραιος')
      }
      setSetting('birthday_bonus_points', String(input.birthdayBonusPoints))
    }
    if (input.referralRewardEnabled !== undefined) {
      setSetting('referral_reward_enabled', input.referralRewardEnabled ? '1' : '0')
    }
    if (input.referralRewardPoints !== undefined) {
      if (!Number.isInteger(input.referralRewardPoints) || input.referralRewardPoints < 0) {
        throw new Error('Οι πόντοι παραπομπής πρέπει να είναι μη αρνητικός ακέραιος')
      }
      setSetting('referral_reward_points', String(input.referralRewardPoints))
    }
  })
  tx()
  return getSettings()
}
