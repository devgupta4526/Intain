import postgres from 'postgres';

try { process.loadEnvFile(); } catch {}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required. Set it to your Neon PostgreSQL connection string.');
}

export const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('operator','reviewer','consumer')),
      initials TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      uploaded_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      failed_rows INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'processing'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER NOT NULL REFERENCES batches(id),
      row_number INTEGER NOT NULL,
      loan_id TEXT,
      borrower_id TEXT,
      loan_type TEXT,
      origination_date TEXT,
      maturity_date TEXT,
      original_principal DOUBLE PRECISION,
      current_balance DOUBLE PRECISION,
      interest_rate DOUBLE PRECISION,
      term_months INTEGER,
      borrower_state TEXT,
      loan_purpose TEXT,
      credit_grade TEXT,
      employment_length TEXT,
      income_band TEXT,
      payment_status TEXT,
      days_past_due INTEGER,
      servicer_name TEXT,
      last_payment_date TEXT,
      last_updated_at TEXT,
      document_status TEXT,
      source_system TEXT,
      raw_json TEXT NOT NULL,
      validation_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS exceptions (
      id SERIAL PRIMARY KEY,
      loan_row_id INTEGER NOT NULL REFERENCES loans(id),
      rule_code TEXT NOT NULL,
      field_name TEXT,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      current_value TEXT,
      suggested_value TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      UNIQUE(loan_row_id, rule_code)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      loan_row_id INTEGER NOT NULL REFERENCES loans(id),
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      decision TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id SERIAL PRIMARY KEY,
      loan_row_id INTEGER NOT NULL REFERENCES loans(id),
      exception_id INTEGER REFERENCES exceptions(id),
      explanation TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      suggested_patch TEXT,
      confidence DOUBLE PRECISION NOT NULL,
      severity TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      acted_at TEXT,
      acted_by INTEGER REFERENCES users(id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS verified_loans (
      id SERIAL PRIMARY KEY,
      loan_row_id INTEGER NOT NULL UNIQUE REFERENCES loans(id),
      canonical_json TEXT NOT NULL,
      record_hash TEXT NOT NULL,
      previous_hash TEXT,
      verified_by INTEGER NOT NULL REFERENCES users(id),
      verified_at TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      loan_row_id INTEGER REFERENCES loans(id),
      batch_id INTEGER REFERENCES batches(id),
      actor_id INTEGER REFERENCES users(id),
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      previous_hash TEXT,
      event_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status, severity)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_loan ON audit_events(loan_row_id, created_at)`;

  // Seed default users
  await sql`INSERT INTO users (name,email,role,initials) VALUES ('Maya Chen','operator@veritas.demo','operator','MC') ON CONFLICT (email) DO NOTHING`;
  await sql`INSERT INTO users (name,email,role,initials) VALUES ('Arjun Mehta','reviewer@veritas.demo','reviewer','AM') ON CONFLICT (email) DO NOTHING`;
  await sql`INSERT INTO users (name,email,role,initials) VALUES ('Sofia Reyes','consumer@veritas.demo','consumer','SR') ON CONFLICT (email) DO NOTHING`;
}
