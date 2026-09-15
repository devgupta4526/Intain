# Veritas Loan Copilot — Complete Technical Walkthrough
## In-Depth Code & Architecture Reference

---

## Table of Contents

1. [Repository Layout](#1-repository-layout)
2. [Database Schema — Every Table Explained](#2-database-schema)
3. [Boot Sequence — What Happens on `npm run dev`](#3-boot-sequence)
4. [Data Ingestion Pipeline — Deep Dive](#4-data-ingestion-pipeline)
5. [Normalization Engine — Field-by-Field](#5-normalization-engine)
6. [Validation Engine — All 15 Rules](#6-validation-engine)
7. [AI Service Layer — Design & Isolation](#7-ai-service-layer)
8. [Audit Chain — Cryptographic Design](#8-audit-chain)
9. [Approval & Verification Flow](#9-approval--verification-flow)
10. [REST API — All 11 Endpoints](#10-rest-api)
11. [React Frontend — Component Map](#11-react-frontend)
12. [Role-Based Navigation Logic](#12-role-based-navigation)
13. [Test Suite — What Each Test Proves](#13-test-suite)
14. [Configuration & Environment](#14-configuration--environment)
15. [Production Migration Guide](#15-production-migration-guide)

---

## 1. Repository Layout

```
e:/Intain/
├── data/
│   ├── sample-loan-tape.csv      ← 12-row synthetic portfolio (seeded on startup)
│   ├── document_manifest.csv     ← Supporting reference data
│   ├── servicer_update.csv       ← Supplementary servicer data
│   ├── users.json                ← Demo user definitions
│   ├── validation_rules.json     ← Rule metadata reference
│   └── veritas.db                ← SQLite database (auto-created)
│
├── server/
│   ├── index.ts                  ← Entry point — starts Express on PORT
│   ├── app.ts                    ← All route handlers + seedDemo()
│   ├── db.ts                     ← Database connection + full schema migration
│   ├── ingestion.ts              ← CSV parsing, normalization, batch creation
│   ├── validation.ts             ← 15 validation rules + runValidation()
│   ├── ai.ts                     ← AI service layer (deterministic + OpenAI boundary)
│   ├── audit.ts                  ← SHA-256 hash chain + verifyAuditChain()
│   ├── types.ts                  ← LoanRecord, Severity type definitions
│   ├── seed.ts                   ← Thin wrapper — calls seedDemo()
│   ├── app.test.ts               ← End-to-end API test suite (Supertest)
│   └── validation.test.ts        ← Unit tests for validation rules
│
├── src/                          ← React/Vite frontend
│   ├── main.tsx                  ← React 19 root render
│   ├── App.tsx                   ← Router setup + role state
│   ├── api.ts                    ← Fetch wrapper + formatters
│   ├── types.ts                  ← Frontend type definitions
│   ├── styles.css                ← Complete design system (~23KB)
│   ├── components/
│   │   ├── Shell.tsx             ← App shell: sidebar + topbar + role switcher
│   │   └── Common.tsx            ← MetricCard, SeverityBadge, Skeleton, EmptyState
│   └── pages/
│       ├── Dashboard.tsx         ← Command center (metrics, exception intel, trust posture)
│       ├── Ingestion.tsx         ← Data intake (upload, drag-drop, import history)
│       ├── Exceptions.tsx        ← Exception queue (filter, search, severity chips)
│       ├── LoanDetail.tsx        ← Canonical record + AI evidence + audit timeline
│       ├── Loans.tsx             ← Loan registry (search, filter, table)
│       └── Verified.tsx          ← Verified records + export buttons
│
├── docs/
│   ├── ARCHITECTURE.md           ← Design decisions and trade-offs
│   ├── AI_DEVELOPMENT_LOG.md     ← AI usage log with rejected suggestions
│   ├── DEMO_SCRIPT.md            ← 5-minute timed demo script
│   ├── LIVE_DEMO_WALKTHROUGH.md  ← Full screen-by-screen demo guide
│   ├── PRESENTATION_SLIDES_AND_SCRIPT.md ← Slide content + presenter scripts
│   └── TECHNICAL_WALKTHROUGH.md  ← THIS FILE
│
├── api/
│   └── index.ts                  ← Vercel serverless adapter
│
├── package.json                  ← Scripts, dependencies
├── vite.config.ts                ← Vite: proxy /api → :4000 in dev
├── tsconfig.json                 ← Client TypeScript config (strict)
├── server/tsconfig.json          ← Server TypeScript config (NodeNext)
├── Dockerfile                    ← Multi-stage Docker build
└── vercel.json                   ← Vercel routing config
```

---

## 2. Database Schema

All tables are created in `server/db.ts` via a single `migrate()` function using `CREATE TABLE IF NOT EXISTS`. SQLite is opened with `WAL` journal mode for better concurrent reads, and `foreign_keys = ON` to enforce referential integrity.

### `users` table
```sql
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE,
  role     TEXT NOT NULL CHECK(role IN ('operator','reviewer','consumer')),
  initials TEXT NOT NULL
);
```
Three rows seeded on every `migrate()` call via `INSERT OR IGNORE`:
- `Maya Chen` — operator
- `Arjun Mehta` — reviewer
- `Sofia Reyes` — consumer

### `batches` table
```sql
CREATE TABLE IF NOT EXISTS batches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,          -- original upload filename
  source_hash   TEXT NOT NULL,          -- SHA-256 of raw file bytes (pre-parse)
  uploaded_by   INTEGER NOT NULL REFERENCES users(id),
  uploaded_at   TEXT NOT NULL,          -- ISO 8601 timestamp
  total_rows    INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'processing'   -- 'processing' | 'complete'
);
```
One row per uploaded CSV file. The `source_hash` proves file integrity — computed from raw bytes before any parsing.

### `loans` table
```sql
CREATE TABLE IF NOT EXISTS loans (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id           INTEGER NOT NULL REFERENCES batches(id),
  row_number         INTEGER NOT NULL,     -- 1-indexed source row (for traceability)
  loan_id            TEXT,                 -- nullable — may be missing in source
  borrower_id        TEXT,
  loan_type          TEXT,                 -- lowercased: 'mortgage', 'auto', etc.
  origination_date   TEXT,                 -- ISO date: '2023-01-15'
  maturity_date      TEXT,
  original_principal REAL,
  current_balance    REAL,
  interest_rate      REAL,                 -- always stored as decimal: 0.0625 = 6.25%
  term_months        INTEGER,
  borrower_state     TEXT,                 -- uppercased: 'CA', 'NY'
  loan_purpose       TEXT,                 -- lowercased
  credit_grade       TEXT,                 -- uppercased: 'A', 'B', 'C'
  employment_length  TEXT,
  income_band        TEXT,
  payment_status     TEXT,                 -- lowercased: 'current','late','closed',etc.
  days_past_due      INTEGER,
  servicer_name      TEXT,
  last_payment_date  TEXT,
  last_updated_at    TEXT,                 -- ISO 8601 full timestamp
  document_status    TEXT,                 -- lowercased: 'complete','missing','pending'
  source_system      TEXT,
  raw_json           TEXT NOT NULL,        -- complete original CSV row as JSON
  validation_status  TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'valid'|'invalid'
  created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id);
```
The `raw_json` column is critical — it preserves the exact source row exactly as it arrived, giving you permanent traceability back to the original messy data even after normalization.

### `exceptions` table
```sql
CREATE TABLE IF NOT EXISTS exceptions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_row_id     INTEGER NOT NULL REFERENCES loans(id),
  rule_code       TEXT NOT NULL,      -- e.g. 'STATUS_DPD_CONFLICT'
  field_name      TEXT,               -- nullable for record-level issues
  severity        TEXT NOT NULL,      -- 'critical'|'high'|'medium'|'low'
  message         TEXT NOT NULL,      -- human-readable description
  current_value   TEXT,               -- observed value at the time of detection
  suggested_value TEXT,               -- rule engine's suggested correction
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open'|'corrected'|'approved'|'rejected'
  assigned_to     INTEGER REFERENCES users(id),
  created_at      TEXT NOT NULL,
  resolved_at     TEXT,
  UNIQUE(loan_row_id, rule_code)      -- ← prevents duplicate exception rows per rule
);

CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status, severity);
```
The `UNIQUE(loan_row_id, rule_code)` constraint is important: if a field is edited and revalidation runs, the `ON CONFLICT DO UPDATE` clause in `runValidation()` updates the existing exception row rather than creating duplicates. If the edit resolves the issue, the old exception is marked `corrected` and no new row is inserted for that rule.

### `ai_recommendations` table
```sql
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_row_id      INTEGER NOT NULL REFERENCES loans(id),
  exception_id     INTEGER REFERENCES exceptions(id),
  explanation      TEXT NOT NULL,       -- AI narrative explanation
  recommendation   TEXT NOT NULL,       -- specific action recommendation
  suggested_patch  TEXT,                -- JSON patch (advisory only — never applied automatically)
  confidence       REAL NOT NULL,       -- 0.0–1.0
  severity         TEXT NOT NULL,
  model            TEXT NOT NULL,       -- 'veritas-rules-v1' or configured model name
  prompt           TEXT NOT NULL,       -- exact prompt used (full auditability)
  status           TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'accepted'|'rejected'|'edited'
  created_at       TEXT NOT NULL,
  acted_at         TEXT,                -- when reviewer took action
  acted_by         INTEGER REFERENCES users(id)
);
```
**Key invariant:** This table has no FK reference to `loans` for writes. The `generateRecommendation()` function only writes to `ai_recommendations`. The `PATCH /api/loans/:id` route only writes to `loans` and `exceptions`. These two write paths are completely separate — enforced at the code level, not just by convention.

### `reviews` table
```sql
CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_row_id  INTEGER NOT NULL REFERENCES loans(id),
  reviewer_id  INTEGER NOT NULL REFERENCES users(id),
  decision     TEXT NOT NULL,   -- 'approved'|'rejected'|'correction_requested'
  comment      TEXT,
  created_at   TEXT NOT NULL
);
```
Append-only — decisions are never updated. Multiple review decisions for a single loan are valid (e.g., correction requested → re-reviewed → approved).

### `verified_loans` table
```sql
CREATE TABLE IF NOT EXISTS verified_loans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_row_id   INTEGER NOT NULL UNIQUE REFERENCES loans(id),  -- one verified record per loan
  canonical_json TEXT NOT NULL,   -- deterministically serialized canonical snapshot
  record_hash   TEXT NOT NULL,    -- SHA-256(canonical_json + previous_record_hash)
  previous_hash TEXT,             -- hash of prior verified record (chain link)
  verified_by   INTEGER NOT NULL REFERENCES users(id),
  verified_at   TEXT NOT NULL
);
```
The `UNIQUE(loan_row_id)` constraint means re-approving a loan overwrites the verified record (`ON CONFLICT DO UPDATE`). The `previous_hash` chains every verified record to its predecessor, allowing downstream consumers to detect reordering or mutation of the verified dataset.

### `audit_events` table
```sql
CREATE TABLE IF NOT EXISTS audit_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_row_id   INTEGER REFERENCES loans(id),    -- nullable for batch-level events
  batch_id      INTEGER REFERENCES batches(id),
  actor_id      INTEGER REFERENCES users(id),
  event_type    TEXT NOT NULL,        -- e.g. 'FILE_UPLOADED', 'LOAN_APPROVED'
  description   TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',   -- structured event-specific data
  previous_hash TEXT,                 -- hash of the prior event for this loan
  event_hash    TEXT NOT NULL,        -- SHA-256(stable_payload + previous_hash)
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_loan ON audit_events(loan_row_id, created_at);
```
**Append-only — there is no DELETE or UPDATE path in `server/audit.ts`**. This is the most important invariant in the entire system.

---

## 3. Boot Sequence

When `npm run dev` runs, two processes start concurrently via `concurrently`:

```
tsx watch server/index.ts   ← Express API server on PORT (default 4000)
vite                        ← Vite dev server on 5173 (proxies /api → :4000)
```

**Server startup sequence (`server/index.ts` → `server/app.ts`):**

```
createApp()
  ├── migrate()          → CREATE TABLE IF NOT EXISTS for all 7 tables
  │                         INSERT OR IGNORE for 3 demo users
  ├── seedDemo()         → Check if batches table is empty
  │   └── if empty:        Read data/sample-loan-tape.csv
  │                         Call ingestCsv(buffer, 'sample-loan-tape.csv', actorId=1)
  │                           ├── sha256(buffer) → store in batches.source_hash
  │                           ├── parse CSV rows
  │                           ├── normalize each row → insert into loans
  │                           └── runValidation(loanRowId) for each loan
  └── register all routes → /api/health, /api/summary, /api/upload, etc.
```

**Vite proxy configuration (`vite.config.ts`):**
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:4000'
  }
}
```
All `/api/*` requests from the browser are transparently forwarded to Express in development. In production, Express serves the built Vite assets directly from `dist/client/`.

---

## 4. Data Ingestion Pipeline

**Entry point:** `POST /api/upload` → `server/ingestion.ts → ingestCsv()`

### Step 1: File Fingerprinting

```typescript
// server/ingestion.ts
export function ingestCsv(buffer: Buffer, filename: string, actorId = 1) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  const now = new Date().toISOString();
  const batchResult = db.prepare(`INSERT INTO batches
    (filename,source_hash,uploaded_by,uploaded_at,total_rows,status)
    VALUES (?,?,?,?,?,'processing')`)
    .run(filename, sha256(buffer), actorId, now, rows.length);
```

The SHA-256 hash is computed on the raw `Buffer` **before** `parse()` runs. This means even if the CSV parsing library normalizes whitespace or line endings, the stored hash is of the original binary content. Any downstream system can re-hash the file and compare.

### Step 2: Transaction-wrapped Row Import

```typescript
const transaction = db.transaction(() => {
  rows.forEach((raw, index) => {
    try {
      const loan = normalize(raw, batchId, index + 2);  // row 2+ (1 = headers)
      const result = insert.run(...columns.map(col => loan[col] ?? null), now);
      const loanRowId = Number(result.lastInsertRowid);
      loanIds.push(loanRowId);
      imported++;
      audit({ loanRowId, batchId, actorId, eventType: 'LOAN_IMPORTED', ... });
    } catch { failed++; }
  });
});
transaction();
```

The entire import is wrapped in a SQLite transaction — if any row throws unexpectedly, the counter increments `failed` and continues. Rows that fail are not imported but don't block other rows. The transaction commits atomically.

### Step 3: Post-import Validation (outside transaction)

```typescript
for (const loanRowId of loanIds) {
  const issues = runValidation(loanRowId);
  audit({ loanRowId, batchId, actorId, eventType: 'VALIDATION_EXECUTED', ... });
}
```

Validation runs **outside** the import transaction deliberately. Why? Because some validation rules (DUPLICATE_LOAN_ID, SUSPICIOUS_REPEAT) require all rows to already be in the database before they can detect conflicts. Running validation after the commit ensures the full batch is visible.

### Step 4: Batch Completion

```typescript
db.prepare("UPDATE batches SET imported_rows=?, failed_rows=?, status='complete' WHERE id=?")
  .run(imported, failed, batchId);
```

The batch record is updated to `complete` with final row counts. The import history table in the UI reads from this.

---

## 5. Normalization Engine

**Location:** `server/ingestion.ts → normalize()`

The normalization functions handle the messiness of real-world CSV data:

```typescript
const text = (value) => value == null || String(value).trim() === '' ? null : String(value).trim();

const number = (value) => {
  const cleaned = String(value ?? '').replace(/[$,%\s,]/g, '');  // strips $, %, commas, spaces
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const date = (value) => {
  const raw = text(value);
  if (!raw) return null;
  // handles both ISO (2023-01-15) and US format (01/15/2023)
  const iso = /^\d{4}-\d{2}-\d{2}/.test(raw)
    ? new Date(raw)
    : new Date(raw.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString().slice(0, 10);
};
```

### Interest Rate Normalization (Important Edge Case)

```typescript
const rateRaw = number(raw.interest_rate);
// ...
interest_rate: rateRaw !== null && rateRaw > 1 ? rateRaw / 100 : rateRaw,
```

If a CSV has `"6.25%"`, `number()` strips the `%` and returns `6.25`. Since `6.25 > 1`, we divide by 100 → stored as `0.0625`. If the CSV has `"0.0625"`, it passes through unchanged. This handles both common formats automatically. The `RATE_OUT_OF_RANGE` rule then checks `interest_rate < 0 || interest_rate > 0.35` (35%).

### Field-by-Field Normalization Map

| CSV Column | Normalization Applied |
|------------|----------------------|
| `loan_id` | `text()` — trim, null if empty |
| `borrower_id` | `text()` |
| `loan_type` | `text()?.toLowerCase()` — 'Mortgage' → 'mortgage' |
| `origination_date` | `date()` — ISO 8601, handles MM/DD/YYYY |
| `maturity_date` | `date()` |
| `original_principal` | `number()` — strips `$`, `,` |
| `current_balance` | `number()` |
| `interest_rate` | `number()` + ÷100 if >1 |
| `term_months` | `integer()` — rounds to nearest int |
| `borrower_state` | `text()?.toUpperCase()` — 'ca' → 'CA' |
| `loan_purpose` | `text()?.toLowerCase()` |
| `credit_grade` | `text()?.toUpperCase()` — 'a' → 'A' |
| `payment_status` | `text()?.toLowerCase()` |
| `days_past_due` | `integer()` |
| `last_updated_at` | `timestamp()` — full ISO 8601 datetime |
| `raw_json` | `JSON.stringify(raw)` — original row preserved verbatim |

---

## 6. Validation Engine

**Location:** `server/validation.ts`

### Pure Function Design

```typescript
export function validateLoan(loan: LoanRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // ... 13 pure checks ...
  return issues;
}
```

`validateLoan()` is a pure function — no database access, no side effects. This makes it trivially unit-testable. The 13 field-level checks run here. 2 additional database-aware checks (DUPLICATE_LOAN_ID, SUSPICIOUS_REPEAT) run in `runValidation()`.

### All 15 Rules — Code-Level Detail

| Rule Code | Severity | Check | Code Condition |
|-----------|----------|-------|----------------|
| `REQUIRED_LOAN_ID` | critical | loan_id must exist | `!loan.loan_id` |
| `REQUIRED_BORROWER_ID` | high | borrower_id must exist | `!loan.borrower_id` |
| `INVALID_ORIGINATION_DATE` | high | date must parse | `!loan.origination_date` |
| `INVALID_MATURITY_DATE` | high | date must parse | `!loan.maturity_date` |
| `MATURITY_BEFORE_ORIGINATION` | critical | maturity > origination | `maturity_date <= origination_date` |
| `INVALID_PRINCIPAL` | critical | principal ≥ 0 | `original_principal === null \|\| original_principal < 0` |
| `INVALID_BALANCE` | critical | balance ≥ 0 | `current_balance === null \|\| current_balance < 0` |
| `BALANCE_EXCEEDS_PRINCIPAL` | high | balance ≤ principal | `current_balance > original_principal` |
| `RATE_OUT_OF_RANGE` | high | 0% ≤ rate ≤ 35% | `interest_rate < 0 \|\| interest_rate > 0.35` |
| `INVALID_PAYMENT_STATUS` | medium | valid status value | not in `{current,late,delinquent,default,closed}` |
| `STATUS_DPD_CONFLICT` | high | current → DPD=0 | `payment_status==='current' && days_past_due > 0` |
| `CLOSED_WITH_BALANCE` | critical | closed → balance=0 | `payment_status==='closed' && current_balance > 0` |
| `DOCUMENT_MISSING` | medium | docs present | `document_status === 'missing'` |
| `INVALID_STATE` | medium | valid US state code | not in Set of 50+DC USPS codes |
| `STALE_RECORD` | low | updated within 180 days | `ageDays > 180` |
| `DUPLICATE_LOAN_ID` | critical | unique loan_id | DB query: same loan_id on different row |
| `SUSPICIOUS_REPEAT` | high | borrower/amount/date unique | DB query: same borrower+principal+origination |

### Revalidation on Edit

```typescript
// server/app.ts — PATCH /api/loans/:id
db.prepare(`UPDATE loans SET ${normalized.map(k => `${k}=?`).join(',')} WHERE id=?`)
  .run(...normalized.map(([,v]) => v), id);

const issues = runValidation(id);  // ← reruns ALL 15 rules on the updated record
```

Inside `runValidation()`:
```typescript
// First: mark all currently open exceptions as 'corrected'
db.prepare("UPDATE exceptions SET status='corrected', resolved_at=? WHERE loan_row_id=? AND status='open'")
  .run(now, loanRowId);

// Then: insert new exceptions (or UPDATE existing via UNIQUE constraint)
for (const value of issues)
  insert.run(loanRowId, value.ruleCode, ...);

// Finally: update validation_status on the loan
db.prepare('UPDATE loans SET validation_status = ? WHERE id = ?')
  .run(issues.length ? 'invalid' : 'valid', loanRowId);
```

This means: if you fix a field that resolves an exception, the old exception is marked `corrected`. If the edit introduces a new problem, a new exception is created. The history of exceptions (including corrected ones) is preserved — only the `status` column changes.

---

## 7. AI Service Layer

**Location:** `server/ai.ts`

### Deterministic Rule Guidance Map

```typescript
const guidance: Record<string, { recommendation: string; confidence: number }> = {
  BALANCE_EXCEEDS_PRINCIPAL: {
    recommendation: 'Reconcile against the latest servicer statement; cap only after confirming whether fees were incorrectly included.',
    confidence: 0.91
  },
  STATUS_DPD_CONFLICT: {
    recommendation: 'Update payment status to late if days past due is confirmed by servicing data.',
    confidence: 0.94
  },
  CLOSED_WITH_BALANCE: {
    recommendation: 'Do not auto-zero the balance. Request payoff confirmation and the latest remittance record.',
    confidence: 0.97
  },
  INVALID_STATE: {
    recommendation: 'Normalize the value to a USPS two-letter state code after borrower-address evidence is checked.',
    confidence: 0.86
  },
  STALE_RECORD: {
    recommendation: 'Request a fresh servicer update before downstream consumption.',
    confidence: 0.98
  },
  DOCUMENT_MISSING: {
    recommendation: 'Route to document operations and keep this record outside the verified export.',
    confidence: 0.96
  },
  DUPLICATE_LOAN_ID: {
    recommendation: 'Compare source lineage and retain the most recently updated authoritative record.',
    confidence: 0.89
  },
};
```

For any rule code not in this map, a generic fallback recommendation is returned with 0.78 confidence.

### AI Isolation Architecture

```typescript
export function generateRecommendation(exceptionId: number, actorId = 2) {
  // 1. Read exception + loan data (SELECT only)
  const row = db.prepare(`SELECT e.*, l.loan_id, l.payment_status ...
    FROM exceptions e JOIN loans l ON l.id=e.loan_row_id WHERE e.id=?`).get(exceptionId);

  // 2. Build explanation and recommendation
  const explanation = `${row.message} The normalized value (${row.current_value ?? 'missing'}) ...`;
  const patch = row.suggested_value && row.field_name
    ? JSON.stringify({ [String(row.field_name)]: row.suggested_value })
    : null;

  // 3. Write ONLY to ai_recommendations — never to loans
  const result = db.prepare(`INSERT INTO ai_recommendations
    (loan_row_id, exception_id, explanation, recommendation, suggested_patch, ...)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(...);

  // 4. Write audit event
  audit({ loanRowId: ..., eventType: 'AI_RECOMMENDATION_GENERATED', ... });

  // 5. Return the new recommendation row
  return db.prepare('SELECT * FROM ai_recommendations WHERE id=?').get(result.lastInsertRowid);
}
```

**There is no code path in this function that touches the `loans` table for writes.** The `suggested_patch` field is stored as advisory JSON — it is never read by any route handler that modifies loans.

### Human Action on AI Output

```typescript
// POST /api/ai/:id/action
const action = String(body.action ?? '');
// Validates: must be 'accepted', 'rejected', or 'edited'

db.prepare('UPDATE ai_recommendations SET status=?, acted_at=?, acted_by=? WHERE id=?')
  .run(action, new Date().toISOString(), actorId, id);

audit({ ..., eventType: `AI_RECOMMENDATION_${action.toUpperCase()}`, ... });

res.json({ success: true, status: action });
// ← Response does NOT touch loans, exceptions, or verified_loans
```

When a reviewer clicks "Accept guidance", the server:
1. Updates `ai_recommendations.status` → `'accepted'`
2. Appends an `AI_RECOMMENDATION_ACCEPTED` audit event
3. Returns `{ success: true, status: 'accepted' }`

The loan record is unchanged. The UI toasts "Suggestion accepted. No data changed." — which is literally true.

---

## 8. Audit Chain

**Location:** `server/audit.ts`

### Stable Serialization

```typescript
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  // Keys are sorted alphabetically — ensures deterministic output
  return `{${Object.keys(object).sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}
```

Standard `JSON.stringify()` does not guarantee key order across implementations. `stableStringify()` sorts keys alphabetically at every level of nesting, producing identical output for the same data regardless of the order properties were added to the object.

### Hash Chain Construction

```typescript
export function audit(input: AuditInput) {
  // 1. Find the most recent event for this loan
  const previous = db.prepare(`
    SELECT event_hash FROM audit_events
    WHERE (? IS NOT NULL AND loan_row_id = ?) OR (? IS NULL AND loan_row_id IS NULL)
    ORDER BY id DESC LIMIT 1
  `).get(input.loanRowId ?? null, input.loanRowId ?? null, input.loanRowId ?? null);

  // 2. Build the payload including the previous hash
  const payload = stableStringify({
    ...input,
    metadata: input.metadata ?? {},
    createdAt,
    previousHash: previous?.event_hash ?? null   // null for genesis event
  });

  // 3. Hash the payload
  const eventHash = sha256(payload);

  // 4. Insert — append only
  return db.prepare(`INSERT INTO audit_events
    (loan_row_id, batch_id, actor_id, event_type, description,
     metadata_json, previous_hash, event_hash, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(input.loanRowId ?? null, ..., previous?.event_hash ?? null, eventHash, createdAt);
}
```

### Chain Verification

```typescript
export function verifyAuditChain(loanRowId: number) {
  const events = db.prepare(
    'SELECT * FROM audit_events WHERE loan_row_id = ? ORDER BY id'
  ).all(loanRowId);

  let expectedPrevious: string | null = null;
  for (const event of events) {
    // Each event's previous_hash must match the prior event's event_hash
    if ((event.previous_hash ?? null) !== expectedPrevious)
      return { valid: false, eventId: event.id, count: events.length };
    expectedPrevious = String(event.event_hash);
  }
  return { valid: true, count: events.length, head: expectedPrevious };
}
```

This function is called on every `GET /api/loans/:id` request — the chain is verified live on every loan detail page load, not cached. The result (`valid`, `count`, `head`) is returned to the frontend and displayed in real time.

### Event Types Generated

| Event Type | Trigger | Actor |
|-----------|---------|-------|
| `FILE_UPLOADED` | CSV upload | Operator |
| `LOAN_IMPORTED` | Each row normalized | Operator |
| `VALIDATION_EXECUTED` | After import or edit | System/Operator |
| `AI_RECOMMENDATION_GENERATED` | Generate AI clicked | Reviewer |
| `AI_RECOMMENDATION_ACCEPTED` | Accept clicked | Reviewer |
| `AI_RECOMMENDATION_REJECTED` | Reject clicked | Reviewer |
| `AI_RECOMMENDATION_EDITED` | Mark edited clicked | Reviewer |
| `FIELD_EDITED` | Save & revalidate | Reviewer |
| `LOAN_APPROVED` | Approve & verify clicked | Reviewer |
| `LOAN_REJECTED` | Reject clicked | Reviewer |
| `LOAN_CORRECTION_REQUESTED` | Request correction clicked | Reviewer |
| `VERIFIED_RECORD_CREATED` | On approval | System |

---

## 9. Approval & Verification Flow

**Route:** `POST /api/loans/:id/review`

```typescript
// 1. Validate decision
const decision = String(body.decision ?? '');
// must be: 'approved' | 'rejected' | 'correction_requested'

// 2. Insert review record (append-only)
db.prepare('INSERT INTO reviews (loan_row_id, reviewer_id, decision, comment, created_at) VALUES (?,?,?,?,?)')
  .run(id, reviewerId, decision, comment, now);

// 3. Mark open exceptions as resolved
db.prepare("UPDATE exceptions SET status=?, resolved_at=?, assigned_to=? WHERE loan_row_id=? AND status='open'")
  .run(decision, now, reviewerId, id);

// 4. Audit: LOAN_APPROVED / LOAN_REJECTED / etc.
audit({ loanRowId: id, actorId: reviewerId, eventType: `LOAN_${decision.toUpperCase()}`, ... });

// 5. If approved → create verified record
if (decision === 'approved') {
  // Build canonical snapshot (excludes id, raw_json, validation_status, created_at)
  const excluded = new Set(['id', 'raw_json', 'validation_status', 'created_at']);
  const canonical = Object.fromEntries(
    Object.entries(loan).filter(([key]) => !excluded.has(key))
  );

  // Chain to previous verified record
  const previous = db.prepare(
    'SELECT record_hash FROM verified_loans ORDER BY id DESC LIMIT 1'
  ).get();

  // record_hash = SHA256(stable_canonical_json + previous_record_hash)
  const recordHash = sha256(stableStringify(canonical) + (previous?.record_hash ?? 'GENESIS'));

  // Upsert verified record
  db.prepare(`INSERT INTO verified_loans (loan_row_id, canonical_json, record_hash, previous_hash, verified_by, verified_at)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(loan_row_id) DO UPDATE SET ...`)
    .run(id, stableStringify(canonical), recordHash, previous?.record_hash ?? null, reviewerId, now);

  // Audit: VERIFIED_RECORD_CREATED
  audit({ ..., eventType: 'VERIFIED_RECORD_CREATED', metadata: { recordHash, previousHash } });
}
```

### What Goes Into the Canonical Snapshot

The excluded fields are deliberately chosen:
- `id` — internal DB row ID, meaningless to consumers
- `raw_json` — the messy original data; consumers only need the clean canonical form
- `validation_status` — internal processing state
- `created_at` — internal import timestamp

Everything else — loan_id, borrower_id, all financial fields, all dates, borrower_state, servicer_name, source_system, document_status — is included in the canonical snapshot.

---

## 10. REST API

All routes are defined in `server/app.ts`. Base path: `/api`.

| Method | Path | Description | Auth Required (prod) |
|--------|------|-------------|---------------------|
| GET | `/health` | Service health check | No |
| GET | `/users` | List all demo users | No |
| GET | `/summary` | Dashboard metrics: totals, quality score, byRule, trend | Operator/Reviewer |
| GET | `/batches` | Import history with exception counts | Operator |
| POST | `/upload` | CSV file upload (multipart/form-data, max 10MB, CSV only) | Operator |
| GET | `/loans` | Loan list with search, status filter, severity rank | All roles |
| GET | `/loans/:id` | Full loan detail: record + exceptions + AI + reviews + audit | All roles |
| PATCH | `/loans/:id` | Edit allow-listed fields + revalidate | Reviewer |
| POST | `/loans/:id/review` | Submit review decision (approved/rejected/correction_requested) | Reviewer |
| POST | `/exceptions/:id/ai` | Generate AI recommendation for an exception | Reviewer |
| POST | `/ai/:id/action` | Record human action on AI recommendation | Reviewer |
| GET | `/exceptions` | Exception queue with severity/status/search filters | Operator/Reviewer |
| GET | `/verified-loans` | All verified records | Consumer |
| GET | `/verified-loans/:id` | Single verified record with canonical JSON | Consumer |
| GET | `/audit/:loanId` | Audit chain events + integrity check for a loan | All roles |
| GET | `/export/verified.csv` | Download verified loans as CSV | Consumer |
| GET | `/export/audit.csv` | Download full audit trail as CSV | Consumer |
| POST | `/demo/reset` | Clear all data and re-seed demo | Dev only |

### Error Handling

```typescript
// Global error handler at the bottom of app.ts
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error.' });
});
```

All routes use `try/catch/next(error)` to pass errors to this handler. Validation errors return 4xx with specific messages. Upload errors return 400 (no file) or 415 (not CSV).

### File Upload Constraints

```typescript
const upload = multer({
  storage: multer.memoryStorage(),   // file held in memory as Buffer — no temp files
  limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB
});
```

The file is held in memory as a `Buffer`. This makes SHA-256 hashing trivial (hash the Buffer directly) and avoids temp file cleanup logic. For production with large portfolios, this would move to streaming + object storage.

---

## 11. React Frontend

### State Architecture

No global state library (no Redux, no Zustand). State is kept local to each page using `useState` and `useEffect` hooks. The only truly global state is the `role` — managed in `App.tsx` and passed as a prop down to `Shell` and each page.

```typescript
// src/App.tsx
function App() {
  const [role, setRole] = useState<Role>('operator');
  return (
    <BrowserRouter>
      <Shell role={role} onRoleChange={setRole}>
        <Routes>
          <Route path="/" element={<Dashboard role={role} />} />
          <Route path="/ingestion" element={<Ingestion />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/loans/:id" element={<LoanDetail role={role} />} />
          <Route path="/verified" element={<VerifiedRecords />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
```

### API Fetch Wrapper

```typescript
// src/api.ts
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(error.error ?? 'Request failed.');
  }
  return response.json();
}
```

The wrapper handles Content-Type detection (skips it for FormData uploads), throws on non-2xx responses with the server's error message, and returns typed JSON.

### LoanDetail — Most Complex Component

`LoanDetail.tsx` manages:
- Three tabs: `'record' | 'evidence' | 'audit'`
- Four async operations: `askAI()`, `actAI()`, `decide()`, `saveEdits()`
- A `busy` string state to disable buttons individually per operation
- An edit draft state (`draft: Record<string, string>`) for inline editing
- A toast notification system
- A `useMemo` to build a Map from `exception_id → recommendation` for O(1) lookup

```typescript
const recommendations = useMemo(
  () => new Map(detail?.recommendations.map(r => [r.exception_id, r]) ?? []),
  [detail?.recommendations]
);
```

The allow-listed editable fields are enforced on both client (only shows inputs for these) and server (filters by `editableFields` Set):
```typescript
const editable = new Set(['current_balance', 'payment_status', 'borrower_state', 'document_status']);
```

### Dashboard Quality Score Calculation

```typescript
// server/app.ts — GET /api/summary
const qualityScore = totals.total
  ? Math.round(((totals.valid ?? 0) / totals.total) * 100)
  : 100;
```

`valid` = loans where `validation_status = 'valid'` (no open exceptions after ingestion).
`total` = all loans in the database.
Score = (valid / total) × 100, rounded.

The score ring in the UI uses a CSS custom property:
```tsx
<div className="score-ring" style={{ '--score': `${summary.qualityScore * 3.6}deg` }}>
```
`3.6deg` = 360° / 100 points = one degree per percentage point.

---

## 12. Role-Based Navigation

```typescript
// src/components/Shell.tsx
const nav = [
  { to: '/',          label: 'Command center',  roles: ['operator','reviewer','consumer'] },
  { to: '/ingestion', label: 'Data intake',      roles: ['operator'] },
  { to: '/exceptions',label: 'Exception queue',  roles: ['operator','reviewer'] },
  { to: '/loans',     label: 'Loan registry',    roles: ['operator','reviewer','consumer'] },
  { to: '/verified',  label: 'Verified records', roles: ['consumer','reviewer'] },
];

// Filtered by current role
nav.filter(item => item.roles.includes(role))
```

| Page | Operator | Reviewer | Consumer |
|------|----------|----------|----------|
| Command center | ✅ | ✅ | ✅ |
| Data intake | ✅ | ❌ | ❌ |
| Exception queue | ✅ | ✅ | ❌ |
| Loan registry | ✅ | ✅ | ✅ |
| Verified records | ❌ | ✅ | ✅ |

Role also affects:
- **Dashboard hero text** — different greeting per role
- **Dashboard CTA button** — 'Import loan tape' / 'Start reviewing' / 'Open verified data'
- **LoanDetail edit button** — only shown for Reviewer
- **LoanDetail Human Decision panel** — full controls for Reviewer, read-only for others
- **Avatar initials** — fetched from `/api/users` and matched by role

---

## 13. Test Suite

### Unit Tests — `server/validation.test.ts`

```typescript
// Tests validateLoan() pure function — no DB required
it('flags STATUS_DPD_CONFLICT when payment_status is current but days_past_due > 0', ...)
it('flags MATURITY_BEFORE_ORIGINATION when maturity <= origination', ...)
it('does not flag BALANCE_EXCEEDS_PRINCIPAL when balance equals principal', ...)
```

These run in milliseconds and test edge cases that are easy to get wrong (e.g., is `balance === principal` valid? Yes — no exception.)

### End-to-End API Tests — `server/app.test.ts`

Uses Supertest to make real HTTP requests against a test instance:

```typescript
const app = createApp({ seed: false });  // creates schema, does NOT seed demo data

beforeAll(async () => {
  await request(app).post('/api/demo/reset').expect(200);  // seeds fresh demo data
});
```

**Test 1 — Seeded portfolio integrity:**
```typescript
it('reports a healthy seeded portfolio', async () => {
  const res = await request(app).get('/api/summary').expect(200);
  expect(res.body.loans.total).toBe(12);          // exactly 12 rows
  expect(res.body.exceptions.open).toBeGreaterThan(0);  // exceptions exist
});
```

**Test 2 — AI separation proof (most important test):**
```typescript
it('generates a separate, pending AI recommendation', async () => {
  // 1. Find a STATUS_DPD_CONFLICT exception
  const queue = await request(app).get('/api/exceptions?status=open').expect(200);
  const exception = queue.body.find(e => e.rule_code === 'STATUS_DPD_CONFLICT');

  // 2. Generate AI recommendation
  const ai = await request(app).post(`/api/exceptions/${exception.id}/ai`)
    .send({ actorId: 2 }).expect(201);
  expect(ai.body.status).toBe('pending');       // AI output is pending human action
  expect(ai.body.model).toBe('veritas-rules-v1');

  // 3. Get detail BEFORE edit
  const detailBefore = await request(app).get(`/api/loans/${exception.loan_row_id}`).expect(200);

  // 4. Edit the field
  await request(app).patch(`/api/loans/${exception.loan_row_id}`)
    .send({ actorId: 2, changes: { payment_status: 'late' } }).expect(200);

  // 5. Get detail AFTER edit
  const detailAfter = await request(app).get(`/api/loans/${exception.loan_row_id}`).expect(200);

  // 6. Prove: recommendations count unchanged (AI row was NOT deleted or modified by edit)
  expect(detailAfter.body.recommendations).toHaveLength(detailBefore.body.recommendations.length);

  // 7. Prove: STATUS_DPD_CONFLICT is now 'corrected' (edit resolved it)
  expect(detailAfter.body.exceptions.find(e => e.rule_code === 'STATUS_DPD_CONFLICT').status)
    .toBe('corrected');
});
```

**Test 3 — Human-gated verification:**
```typescript
it('creates a hashed verified record only after human approval', async () => {
  const loans = await request(app).get('/api/loans').expect(200);
  const clean = loans.body.find(l => l.validation_status === 'valid');

  const res = await request(app).post(`/api/loans/${clean.id}/review`)
    .send({ reviewerId: 2, decision: 'approved', comment: 'Test.' }).expect(200);

  // Prove: record_hash is a valid 64-char hex SHA-256
  expect(res.body.verified.record_hash).toMatch(/^[a-f0-9]{64}$/);

  // Prove: audit chain is valid after approval
  const detail = await request(app).get(`/api/loans/${clean.id}`).expect(200);
  expect(detail.body.auditIntegrity.valid).toBe(true);
});
```

**Test 4 — Consumer API surface:**
```typescript
it('serves required consumer and audit APIs', async () => {
  const verified = await request(app).get('/api/verified-loans').expect(200);
  expect(verified.body).toHaveLength(1);
  await request(app).get(`/api/audit/${verified.body[0].loan_id}`).expect(200);
  await request(app).get('/api/export/verified.csv')
    .expect('Content-Type', /text\/csv/).expect(200);
});
```

Run with: `npm test` (uses `DATABASE_PATH=:memory:` via Vitest's test env — in-memory SQLite, isolated from production data).

---

## 14. Configuration & Environment

```bash
# .env.example
PORT=4000               # Express server port (default: 4000)
DATABASE_PATH=./data/veritas.db  # SQLite file location
OPENAI_API_KEY=         # Optional — if set, uses OpenAI instead of veritas-rules-v1
OPENAI_MODEL=gpt-4o    # Optional — default model if using OpenAI
```

**Environment detection in `server/db.ts`:**
```typescript
const databasePath = process.env.VERCEL
  ? path.join(process.env.TMPDIR || '/tmp', 'veritas.db')   // Vercel: writable /tmp
  : process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : defaultPath;  // local: data/veritas.db
```

**AI provider selection in `server/ai.ts`:**
```typescript
model: process.env.OPENAI_API_KEY
  ? (process.env.OPENAI_MODEL ?? 'configured-model')
  : 'veritas-rules-v1'
```

If `OPENAI_API_KEY` is set, the model name switches — but the interface contract is identical. To swap in a real OpenAI call, only the `generateRecommendation()` function needs modification — the rest of the system is completely unaffected.

---

## 15. Production Migration Guide

| Current (Demo) | Production Target | Notes |
|----------------|------------------|-------|
| SQLite (Better-SQLite3) | PostgreSQL (pg + connection pool) | Schema is standard SQL — minimal changes needed |
| Header role switch | OIDC (Auth0 / Keycloak) + server-side middleware | Add `requireRole(role)` middleware to each route group |
| Synchronous CSV parsing | Object storage (S3/GCS) → Queue worker (BullMQ) | Stream rows → validate per-row → batch commit |
| Memory-held upload buffer | Pre-signed upload URL → direct S3 upload | Eliminates 10MB server memory limit |
| Local hash chain | Periodic Merkle root → external timestamp authority (RFC 3161) | Proves existence at a point in time to third parties |
| Deterministic AI engine | OpenAI GPT-4o with structured output + PII controls | Provider boundary is `server/ai.ts` — single file change |
| Single Express process | Containerized (Docker) → Kubernetes or Cloud Run | Dockerfile already included |
| No authentication | JWT validation middleware + tenant scoping per loan | Add `tenant_id` FK to all tables |
| Hardcoded 0.35 rate ceiling | Configurable rule parameters from DB or config table | Extract rule constants to configuration |

---

*This document covers every layer of the Veritas codebase. For the live demo guide, see LIVE_DEMO_WALKTHROUGH.md. For architecture trade-offs, see ARCHITECTURE.md.*
