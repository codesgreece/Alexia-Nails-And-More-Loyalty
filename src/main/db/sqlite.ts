import fs from 'fs'
import path from 'path'
import initSqlJs, { type Database as SqlJsDatabase, type SqlValue } from 'sql.js'

export type SqlParam = string | number | null | Uint8Array | boolean

export interface StatementResult {
  changes: number
  lastInsertRowid: number
}

export interface Statement {
  run: (...params: SqlParam[]) => StatementResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: <T = any>(...params: SqlParam[]) => T | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all: <T = any>(...params: SqlParam[]) => T[]
}

export interface AppDatabase {
  exec: (sql: string) => void
  prepare: (sql: string) => Statement
  pragma: (statement: string) => unknown
  transaction: <T>(fn: () => T) => () => T
  export: () => Uint8Array
  close: () => void
  persist: () => void
}

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

async function loadSqlJs(): Promise<Awaited<ReturnType<typeof initSqlJs>>> {
  if (SQL) return SQL

  const wasmCandidates = [
    path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(process.resourcesPath ?? '', 'sql-wasm.wasm')
  ]

  let wasmPath: string | undefined
  for (const candidate of wasmCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      wasmPath = candidate
      break
    }
  }

  SQL = await initSqlJs(
    wasmPath
      ? {
          locateFile: () => wasmPath!
        }
      : undefined
  )
  return SQL
}

function bindParams(stmt: ReturnType<SqlJsDatabase['prepare']>, params: SqlParam[]): void {
  if (params.length === 0) return
  const normalized = params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0
    return p as SqlValue
  })
  stmt.bind(normalized)
}

function createStatement(db: SqlJsDatabase, sql: string, persist: () => void): Statement {
  return {
    run: (...params: SqlParam[]) => {
      const stmt = db.prepare(sql)
      try {
        bindParams(stmt, params)
        stmt.step()
        persist()
        return {
          changes: db.getRowsModified(),
          lastInsertRowid: Number(db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? 0)
        }
      } finally {
        stmt.free()
      }
    },
    get: <T = Record<string, unknown>>(...params: SqlParam[]) => {
      const stmt = db.prepare(sql)
      try {
        bindParams(stmt, params)
        if (!stmt.step()) return undefined
        return stmt.getAsObject() as T
      } finally {
        stmt.free()
      }
    },
    all: <T = Record<string, unknown>>(...params: SqlParam[]) => {
      const stmt = db.prepare(sql)
      try {
        bindParams(stmt, params)
        const rows: T[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T)
        }
        return rows
      } finally {
        stmt.free()
      }
    }
  }
}

export async function openSqlDatabase(filePath: string): Promise<AppDatabase> {
  const sqlJs = await loadSqlJs()
  const parent = path.dirname(filePath)
  fs.mkdirSync(parent, { recursive: true })

  let raw: SqlJsDatabase
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath)
    raw = new sqlJs.Database(fileBuffer)
  } else {
    raw = new sqlJs.Database()
  }

  let closed = false
  let persistTimer: NodeJS.Timeout | null = null
  let dirty = false

  const flush = () => {
    if (closed || !dirty) return
    const data = raw.export()
    fs.writeFileSync(filePath, Buffer.from(data))
    dirty = false
  }

  const schedulePersist = () => {
    dirty = true
    if (persistTimer) return
    persistTimer = setTimeout(() => {
      persistTimer = null
      flush()
    }, 50)
  }

  const persistNow = () => {
    dirty = true
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    flush()
  }

  // Reliability settings
  raw.run('PRAGMA foreign_keys = ON;')

  const api: AppDatabase = {
    exec: (sql: string) => {
      raw.exec(sql)
      schedulePersist()
    },
    prepare: (sql: string) => createStatement(raw, sql, schedulePersist),
    pragma: (statement: string) => {
      // Accept forms like "foreign_keys = ON" or "journal_mode = WAL"
      const trimmed = statement.trim()
      if (trimmed.includes('=')) {
        raw.run(`PRAGMA ${trimmed}`)
        schedulePersist()
        return undefined
      }
      const result = raw.exec(`PRAGMA ${trimmed}`)
      return result[0]?.values[0]?.[0]
    },
    transaction: <T>(fn: () => T) => {
      return () => {
        raw.run('BEGIN')
        try {
          const result = fn()
          raw.run('COMMIT')
          persistNow()
          return result
        } catch (err) {
          try {
            raw.run('ROLLBACK')
          } catch {
            // ignore
          }
          throw err
        }
      }
    },
    export: () => raw.export(),
    close: () => {
      if (closed) return
      persistNow()
      raw.close()
      closed = true
    },
    persist: persistNow
  }

  return api
}

export function writeDatabaseFile(filePath: string, data: Uint8Array): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Buffer.from(data))
}
