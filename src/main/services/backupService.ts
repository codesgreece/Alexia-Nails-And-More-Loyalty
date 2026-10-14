import fs from 'fs'
import path from 'path'
import type { BackupResult, RestoreResult } from '@shared/types'
import {
  closeDatabase,
  getDb,
  getOpenDbPath,
  reopenDatabase
} from '../db/connection'
import { runMigrations } from '../db/migrations'
import { openSqlDatabase, writeDatabaseFile } from '../db/sqlite'

/**
 * Create a consistent SQLite backup by exporting the in-memory sql.js DB.
 */
export function createBackup(destinationPath: string): BackupResult {
  try {
    const db = getDb()
    db.persist()
    const destDir = path.dirname(destinationPath)
    fs.mkdirSync(destDir, { recursive: true })

    const data = db.export()
    writeDatabaseFile(destinationPath, data)

    const validation = validateBackupFileSync(destinationPath)
    if (!validation.ok) {
      try {
        fs.unlinkSync(destinationPath)
      } catch {
        // ignore
      }
      return { success: false, message: validation.message }
    }

    return {
      success: true,
      path: destinationPath,
      message: 'Το αντίγραφο ασφαλείας δημιουργήθηκε επιτυχώς'
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Αποτυχία δημιουργίας αντιγράφου'
    }
  }
}

function validateBackupFileSync(backupPath: string): { ok: boolean; message: string } {
  try {
    if (!fs.existsSync(backupPath)) {
      return { ok: false, message: 'Το αρχείο δεν υπάρχει' }
    }
    const buffer = fs.readFileSync(backupPath)
    // SQLite magic header
    const header = buffer.subarray(0, 16).toString('utf8')
    if (!header.startsWith('SQLite format 3')) {
      return { ok: false, message: 'Μη έγκυρο αρχείο βάσης SQLite' }
    }
    return { ok: true, message: 'Έγκυρο αντίγραφο' }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Μη έγκυρο αρχείο βάσης'
    }
  }
}

export async function validateBackupFile(
  backupPath: string
): Promise<{ ok: boolean; message: string }> {
  const quick = validateBackupFileSync(backupPath)
  if (!quick.ok) return quick

  try {
    const check = await openSqlDatabase(backupPath)
    try {
      const customers = check
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='customers'`)
        .get()
      const settings = check
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'`)
        .get()
      if (!customers || !settings) {
        return { ok: false, message: 'Μη έγκυρο αρχείο αντιγράφου Angel Nails Club' }
      }
      return { ok: true, message: 'Έγκυρο αντίγραφο' }
    } finally {
      check.close()
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Μη έγκυρο αρχείο βάσης'
    }
  }
}

export async function restoreBackup(backupPath: string): Promise<RestoreResult> {
  const validation = await validateBackupFile(backupPath)
  if (!validation.ok) {
    return { success: false, message: validation.message }
  }

  const livePath = getOpenDbPath()
  const safetyPath = path.join(
    path.dirname(livePath),
    `pre-restore-${Date.now()}.db`
  )

  try {
    const safety = createBackup(safetyPath)
    if (!safety.success) {
      return {
        success: false,
        message: `Αδυναμία δημιουργίας αντιγράφου ασφαλείας πριν την επαναφορά: ${safety.message}`
      }
    }

    closeDatabase()

    fs.copyFileSync(backupPath, livePath)

    const db = await reopenDatabase(livePath)
    runMigrations(db)

    return {
      success: true,
      message: `Η επαναφορά ολοκληρώθηκε. Αντίγραφο πριν την επαναφορά: ${safetyPath}`
    }
  } catch (err) {
    try {
      const db = await reopenDatabase(livePath)
      runMigrations(db)
    } catch {
      // ignore
    }
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Αποτυχία επαναφοράς'
    }
  }
}
