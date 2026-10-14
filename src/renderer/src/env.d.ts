/// <reference types="vite/client" />

declare global {
  interface Window {
    angelNails: {
      getVersion: () => Promise<string>
      getDataPath: () => Promise<string>
      customers: {
        list: (params?: unknown) => Promise<any>
        get: (id: string) => Promise<any>
        register: (input: unknown) => Promise<any>
        update: (input: unknown) => Promise<any>
        findByPhone: (phone: string) => Promise<any>
        profile: (id: string) => Promise<any>
      }
      purchases: {
        record: (input: unknown) => Promise<any>
      }
      points: {
        list: (customerId?: string) => Promise<any>
        correct: (input: unknown) => Promise<any>
      }
      birthday: {
        today: () => Promise<any>
        upcoming: (days?: number) => Promise<any>
        process: () => Promise<any>
        history: () => Promise<any>
      }
      referrals: {
        list: () => Promise<any>
      }
      rewards: {
        list: (activeOnly?: boolean) => Promise<any>
        create: (input: unknown) => Promise<any>
        update: (input: unknown) => Promise<any>
        redeem: (input: unknown) => Promise<any>
      }
      redemptions: {
        list: () => Promise<any>
      }
      dashboard: {
        stats: (range?: unknown) => Promise<any>
      }
      stats: {
        report: (range?: unknown) => Promise<any>
        exportCsv: (range?: unknown) => Promise<any>
      }
      settings: {
        get: () => Promise<any>
        update: (input: unknown) => Promise<any>
      }
      backup: {
        pickSave: () => Promise<any>
        pickOpen: () => Promise<any>
        create: (destinationPath: string) => Promise<any>
        restore: (backupPath: string) => Promise<any>
      }
      updates: {
        check: () => Promise<any>
        download: () => Promise<any>
        install: () => Promise<any>
        onStatus: (callback: (payload: unknown) => void) => () => void
      }
    }
  }
}

export {}
