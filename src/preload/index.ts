import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
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
} from '../shared/types'

const api = {
  getVersion: () => ipcRenderer.invoke(IPC.APP_VERSION),
  getDataPath: () => ipcRenderer.invoke(IPC.APP_DATA_PATH),

  customers: {
    list: (params?: CustomerSearchParams) => ipcRenderer.invoke(IPC.CUSTOMERS_LIST, params),
    get: (id: string) => ipcRenderer.invoke(IPC.CUSTOMERS_GET, id),
    register: (input: RegisterCustomerInput) => ipcRenderer.invoke(IPC.CUSTOMERS_REGISTER, input),
    update: (input: UpdateCustomerInput) => ipcRenderer.invoke(IPC.CUSTOMERS_UPDATE, input),
    findByPhone: (phone: string) => ipcRenderer.invoke(IPC.CUSTOMERS_FIND_BY_PHONE, phone),
    profile: (id: string) => ipcRenderer.invoke(IPC.CUSTOMERS_PROFILE, id)
  },

  purchases: {
    record: (input: RecordPurchaseInput) => ipcRenderer.invoke(IPC.PURCHASES_RECORD, input)
  },

  points: {
    list: (customerId?: string) => ipcRenderer.invoke(IPC.POINTS_LIST, customerId),
    correct: (input: CorrectionInput) => ipcRenderer.invoke(IPC.POINTS_CORRECT, input)
  },

  birthday: {
    today: () => ipcRenderer.invoke(IPC.BIRTHDAY_TODAY),
    upcoming: (days?: number) => ipcRenderer.invoke(IPC.BIRTHDAY_UPCOMING, days),
    process: () => ipcRenderer.invoke(IPC.BIRTHDAY_PROCESS),
    history: () => ipcRenderer.invoke(IPC.BIRTHDAY_HISTORY)
  },

  referrals: {
    list: () => ipcRenderer.invoke(IPC.REFERRALS_LIST)
  },

  rewards: {
    list: (activeOnly?: boolean) => ipcRenderer.invoke(IPC.REWARDS_LIST, activeOnly),
    create: (input: CreateRewardInput) => ipcRenderer.invoke(IPC.REWARDS_CREATE, input),
    update: (input: UpdateRewardInput) => ipcRenderer.invoke(IPC.REWARDS_UPDATE, input),
    redeem: (input: RedeemRewardInput) => ipcRenderer.invoke(IPC.REWARDS_REDEEM, input)
  },

  redemptions: {
    list: () => ipcRenderer.invoke(IPC.REDEMPTIONS_LIST)
  },

  dashboard: {
    stats: (range?: DateRange) => ipcRenderer.invoke(IPC.DASHBOARD_STATS, range)
  },

  stats: {
    report: (range?: DateRange) => ipcRenderer.invoke(IPC.STATS_REPORT, range),
    exportCsv: (range?: DateRange) => ipcRenderer.invoke(IPC.STATS_EXPORT_CSV, range)
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (input: UpdateSettingsInput) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, input)
  },

  backup: {
    pickSave: () => ipcRenderer.invoke(IPC.BACKUP_PICK_SAVE),
    pickOpen: () => ipcRenderer.invoke(IPC.BACKUP_PICK_OPEN),
    create: (destinationPath: string) => ipcRenderer.invoke(IPC.BACKUP_CREATE, destinationPath),
    restore: (backupPath: string) => ipcRenderer.invoke(IPC.BACKUP_RESTORE, backupPath)
  },

  updates: {
    check: () => ipcRenderer.invoke(IPC.UPDATES_CHECK),
    download: () => ipcRenderer.invoke(IPC.UPDATES_DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC.UPDATES_INSTALL),
    onStatus: (callback: (payload: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload)
      ipcRenderer.on('updates:status', listener)
      return () => ipcRenderer.removeListener('updates:status', listener)
    }
  }
}

export type AngelNailsApi = typeof api

contextBridge.exposeInMainWorld('angelNails', api)
