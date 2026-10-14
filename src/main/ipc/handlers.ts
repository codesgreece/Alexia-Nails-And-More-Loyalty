import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  CorrectionInput,
  CreateRewardInput,
  CustomerSearchParams,
  DateRange,
  RedeemRewardInput,
  RecordPurchaseInput,
  RegisterCustomerInput,
  UpdateCustomerInput,
  UpdateRewardInput,
  UpdateSettingsInput
} from '@shared/types'
import { getOpenDbPath } from '../db/connection'
import { createBackup, restoreBackup } from '../services/backupService'
import {
  processBirthdayBonuses,
  getBirthdaysToday,
  getUpcomingBirthdays,
  listBirthdayAwards
} from '../services/birthdayService'
import {
  findCustomerByPhone,
  getCustomerById,
  getCustomerProfile,
  listCustomers,
  registerCustomer,
  updateCustomer
} from '../services/customerService'
import {
  buildStatsCsv,
  getDashboardStats,
  getStatisticsReport
} from '../services/dashboardService'
import {
  applyCorrection,
  listPointsTransactions,
  recordPurchase
} from '../services/purchaseService'
import { listReferrals } from '../services/referralService'
import {
  createReward,
  listRedemptions,
  listRewards,
  redeemReward,
  updateReward
} from '../services/rewardService'
import { getSettings, updateSettings } from '../services/settingsService'
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate
} from '../updater'

function wrap<T>(fn: () => T): T | { success: false; error: string } {
  try {
    return fn()
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Άγνωστο σφάλμα'
    }
  }
}

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion())
  ipcMain.handle(IPC.APP_DATA_PATH, () => getOpenDbPath())

  ipcMain.handle(IPC.CUSTOMERS_LIST, (_e, params: CustomerSearchParams) =>
    wrap(() => listCustomers(params ?? {}))
  )
  ipcMain.handle(IPC.CUSTOMERS_GET, (_e, id: string) =>
    wrap(() => getCustomerById(id))
  )
  ipcMain.handle(IPC.CUSTOMERS_REGISTER, (_e, input: RegisterCustomerInput) =>
    wrap(() => registerCustomer(input))
  )
  ipcMain.handle(IPC.CUSTOMERS_UPDATE, (_e, input: UpdateCustomerInput) =>
    wrap(() => updateCustomer(input))
  )
  ipcMain.handle(IPC.CUSTOMERS_FIND_BY_PHONE, (_e, phone: string) =>
    wrap(() => findCustomerByPhone(phone))
  )
  ipcMain.handle(IPC.CUSTOMERS_PROFILE, (_e, id: string) =>
    wrap(() => getCustomerProfile(id))
  )

  ipcMain.handle(IPC.PURCHASES_RECORD, (_e, input: RecordPurchaseInput) =>
    wrap(() => recordPurchase(input))
  )
  ipcMain.handle(IPC.POINTS_LIST, (_e, customerId?: string) =>
    wrap(() => listPointsTransactions(customerId))
  )
  ipcMain.handle(IPC.POINTS_CORRECT, (_e, input: CorrectionInput) =>
    wrap(() => applyCorrection(input))
  )

  ipcMain.handle(IPC.BIRTHDAY_TODAY, () => wrap(() => getBirthdaysToday()))
  ipcMain.handle(IPC.BIRTHDAY_UPCOMING, (_e, days?: number) =>
    wrap(() => getUpcomingBirthdays(days ?? 30))
  )
  ipcMain.handle(IPC.BIRTHDAY_PROCESS, () => wrap(() => processBirthdayBonuses()))
  ipcMain.handle(IPC.BIRTHDAY_HISTORY, () => wrap(() => listBirthdayAwards()))

  ipcMain.handle(IPC.REFERRALS_LIST, () => wrap(() => listReferrals()))

  ipcMain.handle(IPC.REWARDS_LIST, (_e, activeOnly?: boolean) =>
    wrap(() => listRewards(Boolean(activeOnly)))
  )
  ipcMain.handle(IPC.REWARDS_CREATE, (_e, input: CreateRewardInput) =>
    wrap(() => createReward(input))
  )
  ipcMain.handle(IPC.REWARDS_UPDATE, (_e, input: UpdateRewardInput) =>
    wrap(() => updateReward(input))
  )
  ipcMain.handle(IPC.REWARDS_REDEEM, (_e, input: RedeemRewardInput) =>
    wrap(() => redeemReward(input))
  )
  ipcMain.handle(IPC.REDEMPTIONS_LIST, () => wrap(() => listRedemptions()))

  ipcMain.handle(IPC.DASHBOARD_STATS, (_e, range?: DateRange) =>
    wrap(() => getDashboardStats(range))
  )
  ipcMain.handle(IPC.STATS_REPORT, (_e, range?: DateRange) =>
    wrap(() => getStatisticsReport(range))
  )
  ipcMain.handle(IPC.STATS_EXPORT_CSV, async (_e, range?: DateRange) => {
    try {
      const win = getMainWindow()
      const csv = buildStatsCsv(range)
      const result = await dialog.showSaveDialog(win ?? undefined!, {
        title: 'Εξαγωγή στατιστικών',
        defaultPath: `angel-nails-stats-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Η εξαγωγή ακυρώθηκε', code: 'CANCELLED' }
      }
      const fs = await import('fs')
      fs.writeFileSync(result.filePath, '\uFEFF' + csv, 'utf8')
      return { success: true, data: { path: result.filePath } }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Αποτυχία εξαγωγής'
      }
    }
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => wrap(() => getSettings()))
  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, input: UpdateSettingsInput) =>
    wrap(() => updateSettings(input))
  )

  ipcMain.handle(IPC.BACKUP_PICK_SAVE, async () => {
    const win = getMainWindow()
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Αποθήκευση αντιγράφου ασφαλείας',
      defaultPath: `angel-nails-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Ακυρώθηκε', code: 'CANCELLED' }
    }
    return { success: true, data: { path: result.filePath } }
  })

  ipcMain.handle(IPC.BACKUP_PICK_OPEN, async () => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Επιλογή αντιγράφου για επαναφορά',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: 'Ακυρώθηκε', code: 'CANCELLED' }
    }
    return { success: true, data: { path: result.filePaths[0] } }
  })

  ipcMain.handle(IPC.BACKUP_CREATE, (_e, destinationPath: string) =>
    wrap(() => createBackup(destinationPath))
  )
  ipcMain.handle(IPC.BACKUP_RESTORE, async (_e, backupPath: string) => {
    try {
      return await restoreBackup(backupPath)
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Άγνωστο σφάλμα'
      }
    }
  })

  ipcMain.handle(IPC.UPDATES_CHECK, () => checkForUpdates())
  ipcMain.handle(IPC.UPDATES_DOWNLOAD, () => downloadUpdate())
  ipcMain.handle(IPC.UPDATES_INSTALL, () => installUpdate())
}
