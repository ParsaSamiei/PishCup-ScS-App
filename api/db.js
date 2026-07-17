const { Pool } = require('pg');

// Vercel/Neon Postgres connection string, set in your Vercel project's
// Environment Variables as DATABASE_URL. For local dev, put it in root `.env`.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to the root .env file (see .env.example).'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|sslmode=disable/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});

let initPromise = null;

// Creates the tables if they don't exist yet. Safe to call on every cold
// start since CREATE TABLE IF NOT EXISTS is idempotent. We cache the
// promise so concurrent requests during a cold start don't race each other.
function initDb() {
  if (!initPromise) {
    initPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        league TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS score_entries (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        league TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        values_json TEXT NOT NULL,
        performance_total REAL NOT NULL,
        technical_total REAL NOT NULL,
        negative_total REAL NOT NULL,
        group_total REAL NOT NULL,
        final_total REAL NOT NULL,
        round_time_seconds REAL,
        judge_name TEXT,
        captain_name TEXT,
        captain_signature TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `).then(async () => {
      await pool.query(`
        DO $$ BEGIN
          ALTER TABLE score_entries ADD COLUMN round_time_seconds REAL;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);
      // Databases created before 0.1s precision was added have this column
      // as INTEGER; widen it so fractional seconds aren't truncated. Safe to
      // run every start since ALTER COLUMN TYPE to a wider numeric type is a
      // no-op once it's already REAL.
      await pool.query(`
        ALTER TABLE score_entries ALTER COLUMN round_time_seconds TYPE REAL;
      `);
      // captain_name/captain_signature: added later than round_time_seconds,
      // so existing databases need the same idempotent ALTER treatment.
      await pool.query(`
        DO $$ BEGIN
          ALTER TABLE score_entries ADD COLUMN captain_name TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);
      await pool.query(`
        DO $$ BEGIN
          ALTER TABLE score_entries ADD COLUMN captain_signature TEXT;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);
    });
  }
  return initPromise;
}

module.exports = { pool, initDb };
