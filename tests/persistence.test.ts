import './setup'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  closeDatabase,
  getOpenDbPath,
  reopenDatabase
} from '../src/main/db/connection'
import { runMigrations } from '../src/main/db/migrations'
import { createBackup, restoreBackup } from '../src/main/services/backupService'
import { getCustomerById, registerCustomer } from '../src/main/services/customerService'
import { updateSettings } from '../src/main/services/settingsService'

describe('persistence and backup', () => {
  it('keeps database outside install-like paths and survives reopen', async () => {
    updateSettings({ registrationBonusEnabled: false })
    const created = registerCustomer({
      fullName: 'Persist',
      phone: '6981000001',
      dateOfBirth: '1990-01-01'
    }).data!.customer

    const dbPath = getOpenDbPath()
    expect(dbPath.includes('AppData') || dbPath.includes('Temp') || dbPath.includes('anc-test')).toBe(
      true
    )
    expect(dbPath.includes('node_modules')).toBe(false)

    closeDatabase()
    const db = await reopenDatabase(dbPath)
    runMigrations(db)
    expect(getCustomerById(created.id)?.fullName).toBe('Persist')
  })

  it('backup and restore preserve business data', async () => {
    updateSettings({ registrationBonusEnabled: false })
    const created = registerCustomer({
      fullName: 'Backup User',
      phone: '6981000002',
      dateOfBirth: '1991-02-02'
    }).data!.customer

    const backupPath = path.join(os.tmpdir(), `anc-backup-${Date.now()}.db`)
    const backup = createBackup(backupPath)
    expect(backup.success).toBe(true)

    registerCustomer({
      fullName: 'After Backup',
      phone: '6981000003',
      dateOfBirth: '1992-03-03'
    })

    const restored = await restoreBackup(backupPath)
    expect(restored.success).toBe(true)
    expect(getCustomerById(created.id)?.fullName).toBe('Backup User')
    expect(getCustomerById(created.id)?.phoneNormalized).toBe('306981000002')

    try {
      fs.unlinkSync(backupPath)
    } catch {
      // ignore
    }
  })
})
