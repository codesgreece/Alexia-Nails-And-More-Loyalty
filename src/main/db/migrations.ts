import type { AppDatabase } from './sqlite'

interface Migration {
  version: number
  name: string
  up: (db: AppDatabase) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE customers (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone_normalized TEXT NOT NULL UNIQUE,
          phone_display TEXT NOT NULL,
          date_of_birth TEXT NOT NULL,
          referral_code TEXT NOT NULL UNIQUE,
          referred_by_customer_id TEXT REFERENCES customers(id),
          points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
          registration_bonus_awarded INTEGER NOT NULL DEFAULT 0 CHECK (registration_bonus_awarded IN (0, 1)),
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX idx_customers_phone ON customers(phone_normalized);
        CREATE INDEX idx_customers_referral_code ON customers(referral_code);
        CREATE INDEX idx_customers_name ON customers(full_name);
        CREATE INDEX idx_customers_dob ON customers(date_of_birth);
        CREATE INDEX idx_customers_created ON customers(created_at);

        CREATE TABLE purchases (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES customers(id),
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
          description TEXT,
          purchase_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          idempotency_key TEXT NOT NULL UNIQUE
        );

        CREATE INDEX idx_purchases_customer ON purchases(customer_id);
        CREATE INDEX idx_purchases_date ON purchases(purchase_date);

        CREATE TABLE referrals (
          id TEXT PRIMARY KEY,
          referrer_customer_id TEXT NOT NULL REFERENCES customers(id),
          referred_customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id),
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'qualified', 'rewarded')),
          first_purchase_id TEXT REFERENCES purchases(id),
          reward_points_total INTEGER,
          referrer_points INTEGER,
          referred_points INTEGER,
          rewarded_at TEXT,
          created_at TEXT NOT NULL,
          CHECK (referrer_customer_id != referred_customer_id)
        );

        CREATE INDEX idx_referrals_referrer ON referrals(referrer_customer_id);
        CREATE INDEX idx_referrals_status ON referrals(status);

        CREATE TABLE rewards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          points_required INTEGER NOT NULL CHECK (points_required > 0),
          is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
          valid_from TEXT,
          valid_to TEXT,
          max_redemptions INTEGER,
          redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE redemptions (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES customers(id),
          reward_id TEXT NOT NULL REFERENCES rewards(id),
          points_spent INTEGER NOT NULL CHECK (points_spent > 0),
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
          created_at TEXT NOT NULL,
          idempotency_key TEXT NOT NULL UNIQUE
        );

        CREATE INDEX idx_redemptions_customer ON redemptions(customer_id);
        CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);

        CREATE TABLE points_transactions (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES customers(id),
          type TEXT NOT NULL CHECK (type IN (
            'registration_bonus', 'purchase', 'birthday_bonus',
            'referral_reward', 'redemption', 'correction'
          )),
          points INTEGER NOT NULL,
          balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
          purchase_id TEXT REFERENCES purchases(id),
          redemption_id TEXT REFERENCES redemptions(id),
          referral_id TEXT REFERENCES referrals(id),
          birthday_year INTEGER,
          description TEXT NOT NULL,
          reason TEXT,
          created_at TEXT NOT NULL,
          idempotency_key TEXT UNIQUE
        );

        CREATE INDEX idx_points_customer ON points_transactions(customer_id);
        CREATE INDEX idx_points_type ON points_transactions(type);
        CREATE INDEX idx_points_created ON points_transactions(created_at);

        CREATE TABLE birthday_bonus_awards (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL REFERENCES customers(id),
          calendar_year INTEGER NOT NULL,
          points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
          awarded_at TEXT NOT NULL,
          UNIQUE (customer_id, calendar_year)
        );

        CREATE INDEX idx_birthday_year ON birthday_bonus_awards(calendar_year);

        CREATE TABLE app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)

      const defaults: Record<string, string> = {
        registration_bonus_enabled: '1',
        registration_bonus_points: '50',
        birthday_bonus_enabled: '1',
        birthday_bonus_points: '30',
        referral_reward_enabled: '1',
        referral_reward_points: '50',
        points_per_euro: '1',
        business_name: 'Angel Nails & More',
        app_name: 'Angel Nails Club'
      }

      const insert = db.prepare(
        'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)'
      )
      for (const [key, value] of Object.entries(defaults)) {
        insert.run(key, value)
      }
    }
  },
  {
    version: 2,
    name: 'enable_default_referral_reward',
    up: (db) => {
      // Activate referral rewards for existing installs that still have the
      // original unset defaults (disabled + 0 points).
      const enabled = db
        .prepare(`SELECT value FROM app_settings WHERE key = 'referral_reward_enabled'`)
        .get() as { value: string } | undefined
      const points = db
        .prepare(`SELECT value FROM app_settings WHERE key = 'referral_reward_points'`)
        .get() as { value: string } | undefined

      if (enabled?.value === '0' && (points?.value === '0' || !points)) {
        db.prepare(
          `INSERT INTO app_settings (key, value) VALUES ('referral_reward_enabled', '1')
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).run()
        db.prepare(
          `INSERT INTO app_settings (key, value) VALUES ('referral_reward_points', '50')
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).run()
      }
    }
  }
]

export function getCurrentMigrationVersion(db: AppDatabase): number {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`
    )
    .get() as { name: string } | undefined

  if (!row) return 0

  const versionRow = db
    .prepare('SELECT MAX(version) as version FROM schema_migrations')
    .get() as { version: number | null }

  return versionRow.version ?? 0
}

export function runMigrations(db: AppDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const current = getCurrentMigrationVersion(db)
  const pending = migrations.filter((m) => m.version > current)

  for (const migration of pending) {
    const run = db.transaction(() => {
      migration.up(db)
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.name, new Date().toISOString())
    })
    run()
  }

  db.persist()
}
