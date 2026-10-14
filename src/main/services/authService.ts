import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDb } from '../db/connection'
import type { ApiResult, AuthStatus, AuthUser } from '@shared/types'

const SCRYPT_KEYLEN = 64

let sessionUserId: string | null = null

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return `USR-${randomBytes(8).toString('hex')}`
}

function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex')
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
}

function mapUser(row: {
  id: string
  username: string
  date_of_birth: string
  created_at: string
}): AuthUser {
  return {
    id: row.id,
    username: row.username,
    dateOfBirth: row.date_of_birth,
    createdAt: row.created_at
  }
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) as c FROM app_users').get() as { c: number }
  return Number(row?.c ?? 0)
}

export function getAuthStatus(): AuthStatus {
  const users = countUsers()
  if (!sessionUserId) {
    return {
      authenticated: false,
      needsSetup: users === 0,
      user: null
    }
  }

  const row = getDb()
    .prepare(
      `SELECT id, username, date_of_birth, created_at FROM app_users WHERE id = ?`
    )
    .get(sessionUserId) as
    | { id: string; username: string; date_of_birth: string; created_at: string }
    | undefined

  if (!row) {
    sessionUserId = null
    return { authenticated: false, needsSetup: users === 0, user: null }
  }

  return {
    authenticated: true,
    needsSetup: false,
    user: mapUser(row)
  }
}

export function registerLocalUser(input: {
  username: string
  password: string
  dateOfBirth: string
}): ApiResult<AuthUser> {
  const username = input.username.trim()
  const password = input.password
  const dateOfBirth = input.dateOfBirth.trim()

  if (username.length < 3) {
    return { success: false, error: 'Το όνομα χρήστη πρέπει να έχει τουλάχιστον 3 χαρακτήρες' }
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return {
      success: false,
      error: 'Επιτρέπονται μόνο λατινικά γράμματα, αριθμοί, . _ -'
    }
  }
  if (password.length < 6) {
    return { success: false, error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return { success: false, error: 'Μη έγκυρη ημερομηνία' }
  }

  // First install only: block extra accounts after setup (local single-operator salon).
  if (countUsers() > 0) {
    return {
      success: false,
      error: 'Υπάρχει ήδη λογαριασμός σε αυτόν τον υπολογιστή. Συνδεθείτε με τα στοιχεία σας.',
      code: 'SETUP_DONE'
    }
  }

  const existing = getDb()
    .prepare('SELECT id FROM app_users WHERE username = ? COLLATE NOCASE')
    .get(username)
  if (existing) {
    return { success: false, error: 'Το όνομα χρήστη υπάρχει ήδη', code: 'DUPLICATE' }
  }

  const salt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)
  const id = newId()
  const createdAt = nowIso()

  getDb()
    .prepare(
      `INSERT INTO app_users (id, username, password_salt, password_hash, date_of_birth, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, username, salt, passwordHash, dateOfBirth, createdAt, createdAt)

  sessionUserId = id

  return {
    success: true,
    data: {
      id,
      username,
      dateOfBirth,
      createdAt
    }
  }
}

export function loginLocalUser(input: {
  username: string
  password: string
}): ApiResult<AuthUser> {
  const username = input.username.trim()
  const password = input.password

  if (!username || !password) {
    return { success: false, error: 'Συμπληρώστε όνομα χρήστη και κωδικό' }
  }

  const row = getDb()
    .prepare(
      `SELECT id, username, password_salt, password_hash, date_of_birth, created_at
       FROM app_users WHERE username = ? COLLATE NOCASE`
    )
    .get(username) as
    | {
        id: string
        username: string
        password_salt: string
        password_hash: string
        date_of_birth: string
        created_at: string
      }
    | undefined

  if (!row) {
    return { success: false, error: 'Λάθος όνομα χρήστη ή κωδικός', code: 'AUTH_FAILED' }
  }

  const attempt = hashPassword(password, row.password_salt)
  const a = Buffer.from(attempt, 'hex')
  const b = Buffer.from(row.password_hash, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // Dummy compare path for timing when lengths differ
    createHash('sha256').update(password).digest()
    return { success: false, error: 'Λάθος όνομα χρήστη ή κωδικός', code: 'AUTH_FAILED' }
  }

  sessionUserId = row.id
  return { success: true, data: mapUser(row) }
}

export function logoutLocalUser(): { success: true } {
  sessionUserId = null
  return { success: true }
}

export function requireAuth(): boolean {
  return Boolean(sessionUserId)
}
