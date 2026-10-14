import fs from 'fs'
import path from 'path'
import { openSqlDatabase, type AppDatabase } from './sqlite'

let db: AppDatabase | null = null
let dbPath: string | null = null

export function getDatabasePath(userDataPath: string): string {
  const dir = path.join(userDataPath, 'Angel Nails Club')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'angel-nails-club.db')
}

export async function openDatabase(databaseFilePath: string): Promise<AppDatabase> {
  if (db && dbPath === databaseFilePath) {
    return db
  }
  if (db) {
    db.close()
  }

  db = await openSqlDatabase(databaseFilePath)
  dbPath = databaseFilePath

  db.pragma('foreign_keys = ON')
  // sql.js is in-memory with file persistence; WAL is not applicable.
  // We still enforce foreign keys and transactional writes.

  return db
}

export function getDb(): AppDatabase {
  if (!db) {
    throw new Error('Η βάση δεδομένων δεν έχει αρχικοποιηθεί')
  }
  return db
}

export function getOpenDbPath(): string {
  if (!dbPath) {
    throw new Error('Η διαδρομή της βάσης δεν είναι διαθέσιμη')
  }
  return dbPath
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.persist()
    } catch {
      // ignore
    }
    db.close()
    db = null
    dbPath = null
  }
}

export async function reopenDatabase(databaseFilePath: string): Promise<AppDatabase> {
  closeDatabase()
  return openDatabase(databaseFilePath)
}

/** Open an isolated database for tests — never the production path */
export async function openTestDatabase(filePath: string): Promise<AppDatabase> {
  closeDatabase()
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  return openDatabase(filePath)
}
