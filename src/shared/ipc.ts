/** IPC channel names — keep in sync between main and preload */

export const IPC = {
  // Customers
  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_REGISTER: 'customers:register',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_FIND_BY_PHONE: 'customers:findByPhone',
  CUSTOMERS_PROFILE: 'customers:profile',

  // Purchases & points
  PURCHASES_RECORD: 'purchases:record',
  POINTS_LIST: 'points:list',
  POINTS_CORRECT: 'points:correct',

  // Birthday
  BIRTHDAY_TODAY: 'birthday:today',
  BIRTHDAY_UPCOMING: 'birthday:upcoming',
  BIRTHDAY_PROCESS: 'birthday:process',
  BIRTHDAY_HISTORY: 'birthday:history',

  // Referrals
  REFERRALS_LIST: 'referrals:list',

  // Rewards
  REWARDS_LIST: 'rewards:list',
  REWARDS_CREATE: 'rewards:create',
  REWARDS_UPDATE: 'rewards:update',
  REWARDS_REDEEM: 'rewards:redeem',
  REDEMPTIONS_LIST: 'redemptions:list',

  // Dashboard & stats
  DASHBOARD_STATS: 'dashboard:stats',
  STATS_REPORT: 'stats:report',
  STATS_EXPORT_CSV: 'stats:exportCsv',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_PICK_SAVE: 'backup:pickSave',
  BACKUP_PICK_OPEN: 'backup:pickOpen',

  // Updates
  UPDATES_CHECK: 'updates:check',
  UPDATES_DOWNLOAD: 'updates:download',
  UPDATES_INSTALL: 'updates:install',

  // App
  APP_VERSION: 'app:version',
  APP_DATA_PATH: 'app:dataPath'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
