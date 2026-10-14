import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach } from 'vitest'
import { closeDatabase, openTestDatabase } from '../src/main/db/connection'
import { runMigrations } from '../src/main/db/migrations'

let testDbPath = ''

export function getTestDbPath(): string {
  return testDbPath
}

beforeEach(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anc-test-'))
  testDbPath = path.join(dir, 'test.db')
  const db = await openTestDatabase(testDbPath)
  runMigrations(db)
})

afterEach(() => {
  closeDatabase()
  if (testDbPath) {
    const dir = path.dirname(testDbPath)
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})
