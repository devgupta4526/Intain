# 🎤 Veritas Loan Copilot — Final Round Presentation
## Intain FinTech Challenge 2026 | Full Stack Track
### Complete Slide Content + In-Depth Presenter Script

---

> **Presentation Tip:** Total time budget: ~8–10 minutes presentation + 5 minutes Q&A. Each slide section below has a time estimate. Keep the live demo tightly scripted — judges will be most impressed by fluid, confident live interaction.

---

## 🗂️ SLIDE 1 — TITLE SLIDE

### Slide Content
```
VERITAS LOAN COPILOT
───────────────────────────────────
Turn Messy Loan Tapes into
Trusted, Verified, Auditable Records.

[Your Name] | Full Stack Track
Intain FinTech Challenge 2026
```

### 🎙️ Presenter Script
> *[Open with energy. Make eye contact. Take a breath before you start.]*

"Good afternoon, everyone. My name is [Your Name], and today I'm presenting **Veritas** — a Loan Data Verification Copilot that I built for the Intain FinTech Challenge.

The name Veritas comes from the Latin word for *truth* — and that's exactly what this system is designed to create: a reliable, tamper-evident, human-verified truth about every loan record in your portfolio.

Let me start with a question that's at the heart of this challenge."

---

## 🗂️ SLIDE 2 — THE PROBLEM (60 seconds)

### Slide Content
```
THE TRUST GAP IN LOAN DATA
───────────────────────────────────
Loan data arrives from multiple sources:
  📂  CSV exports from servicing systems
  📊  Manually maintained spreadsheets
  🔌  Origination platform APIs
  🗃️  Legacy database dumps

The result?
  ❌  Conflicting formats and date styles
  ❌  Negative balances, impossible status combos
  ❌  Duplicate loan IDs, stale records
  ❌  No trail of who changed what — or why

"You can't trust what you can't trace."
```

### 🎙️ Presenter Script
"Loan data is the foundation of every financial decision in structured finance — but the raw data almost never arrives clean.

Picture a typical loan tape: it comes in as a CSV, maybe exported from one servicer, merged manually with data from another. You open it and immediately find problems. Dates in three different formats. Balances that exceed the original principal. A loan marked 'current' that somehow has 90 days past due. A closed loan with an outstanding balance.

The real problem isn't just these individual errors — it's that **there's no audit trail**. Who spotted this? Who fixed it? What did the original value say? Was an AI tool involved, and if so, was a human in the loop?

This is the trust gap. Veritas is built to close it."

---

## 🗂️ SLIDE 3 — SOLUTION OVERVIEW (45 seconds)

### Slide Content
```
INTRODUCING VERITAS
───────────────────────────────────
A full-stack Loan Data Verification Copilot

CSV Upload ──► Raw Preservation ──► Normalization
                                         │
                              15 Validation Controls
                                         │
                         ┌───────────────┴──────────────┐
                         ▼                              ▼
                    Clean Record               Exception Queue
                                                       │
                                        AI Evidence + Human Review
                                                       │
                                         SHA-256 Verified Export
                                                       │
                                           Audit Chain (Tamper-Evident)

Three roles: Data Operator · Reviewer · Data Consumer
```

### 🎙️ Presenter Script
"Veritas covers the complete journey — from a messy, untrusted CSV file all the way to a cryptographically sealed, human-verified, export-ready loan record.

The system has **three focused workspaces** for three distinct roles:
- A **Data Operator** who uploads and monitors incoming loan tapes
- A **Reviewer** who triages exceptions, reads AI evidence, and makes human decisions
- A **Data Consumer** who downloads clean, verified, and auditable loan data

Every step leaves a permanent, hash-linked audit trail. Let me walk you through each layer."

---

## 🗂️ SLIDE 4 — ARCHITECTURE (60 seconds)

### Slide Content
```
SYSTEM ARCHITECTURE
───────────────────────────────────
Frontend        React 19 + Vite 7 + TypeScript
Backend         Express 5 (Node.js 22)
Database        PostgreSQL (Neon) with postgres.js
AI Layer        Deterministic rule engine / OpenAI-compatible
Hashing         Node.js crypto — SHA-256
Testing         Vitest + Supertest (unit + API tests)
Deployment      Vercel Edge/Serverless + Docker-ready

Key Design Principles:
  ✅  Single process — minimal demo failure modes
  ✅  AI evidence is SEPARATE from human decisions
  ✅  Every edit reruns validation + appends audit event
  ✅  Append-only audit chain — nothing is ever deleted
  ✅  Zero external dependencies needed to run locally
```

### 🎙️ Presenter Script
"The architecture is a **TypeScript monorepo** — one process serves the Express REST API and the Vite-built React frontend. This keeps the demo reliable and eliminates complex orchestration.

The database is PostgreSQL hosted on Neon — a serverless Postgres platform. We migrated from an initial SQLite prototype to a fully-featured Postgres deployment to ensure production-grade transactional integrity and scaling capabilities out of the box on Vercel.

The most important architectural decision was the **AI boundary**. The AI service module in `server/ai.ts` is completely isolated — it generates evidence and recommendations, but it is **physically separated** from the loan record update path. An AI suggestion cannot silently mutate a loan field. That's by design, not by accident.

The system works completely offline using a deterministic rule-based assistant — no OpenAI API key required for the demo."

---

## 🗂️ SLIDE 5 — DATA INGESTION & NORMALIZATION (60 seconds)

### Slide Content
```
CONTROLLED DATA INTAKE
───────────────────────────────────
Step 1: File Fingerprinting
  → SHA-256 hash computed BEFORE parsing
  → Stored with batch record for source lineage

Step 2: Normalization Engine
  → Handles "$1,200.00", "12/31/2024", "8.5%" formats
  → Converts interest rates: if rate > 1, divide by 100
  → Normalizes dates: MM/DD/YYYY ↔ ISO 8601
  → Strips whitespace, lowercases statuses

Step 3: Raw Preservation
  → Original source row saved as raw_json
  → You can always see exactly what arrived

Step 4: Batch History
  → Every upload tracked with filename, hash, row counts, actor
  → Reset or re-upload at any time
```

### 🎙️ Presenter Script
"The ingestion pipeline starts **before parsing** — we compute a SHA-256 fingerprint of the raw file bytes the moment it's uploaded. This means we can prove, at any point in the future, whether the source file has been tampered with.

After hashing, the normalization engine runs. This is where the messiness gets cleaned up. The code handles dollar signs, commas, percentage symbols, multiple date formats, mixed casing. Crucially, **the original source row is preserved** in a `raw_json` column — so we have both the messy original and the normalized canonical form.

Then, the batch is logged — the filename, the hash, how many rows were imported, how many failed, which actor did the upload, and at what timestamp. This is your audit breadcrumb before any validation even runs."

---

## 🗂️ SLIDE 6 — VALIDATION ENGINE (75 seconds)

### Slide Content
```
15 VALIDATION CONTROLS
───────────────────────────────────
CRITICAL Severity:
  🔴  REQUIRED_LOAN_ID          — Loan ID missing
  🔴  MATURITY_BEFORE_ORIGINATION — Date logic impossible
  🔴  INVALID_PRINCIPAL         — Negative principal
  🔴  INVALID_BALANCE           — Negative balance
  🔴  CLOSED_WITH_BALANCE       — Closed loan has balance > 0
  🔴  DUPLICATE_LOAN_ID         — Same ID appears twice

HIGH Severity:
  🟠  REQUIRED_BORROWER_ID
  🟠  BALANCE_EXCEEDS_PRINCIPAL  — Balance > Original amount
  🟠  RATE_OUT_OF_RANGE          — Rate outside 0–35%
  🟠  STATUS_DPD_CONFLICT        — "current" + days_past_due > 0
  🟠  SUSPICIOUS_REPEAT          — Same borrower/amount/date

MEDIUM / LOW:
  🟡  INVALID_PAYMENT_STATUS · DOCUMENT_MISSING
  🟡  INVALID_STATE · STALE_RECORD (>180 days)

Every edit reruns all rules. History is never overwritten.
```

### 🎙️ Presenter Script
"The validation engine has 15 deterministic rules covering every major data-quality failure mode in loan tapes.

Let me highlight three rules that are particularly clever:

**STATUS_DPD_CONFLICT** — A loan marked 'current' that has any days past due is a contradiction. In a raw dataset, this happens all the time because status and DPD come from different systems. Veritas flags this as HIGH severity immediately.

**CLOSED_WITH_BALANCE** — A loan marked 'closed' with a positive current balance. This is CRITICAL — it means either the servicer hasn't confirmed payoff, or someone closed the record prematurely.

**SUSPICIOUS_REPEAT** — This one is particularly interesting. If the same borrower ID, the same original principal, and the same origination date appear on two different rows — that's a highly suspicious duplicate even if the loan IDs differ.

The critical design principle here: **every time a reviewer edits a field, all 15 rules rerun against the updated record**. The audit history is append-only — we add new events; we never overwrite old ones."

---

## 🗂️ SLIDE 7 — AI LAYER: SAFE BY DESIGN (75 seconds)

### Slide Content
```
AI THAT ADVISES — NEVER DECIDES
───────────────────────────────────
What AI does:
  ✅  Generates an explanation of the validation finding
  ✅  Produces a rule-specific recommendation with confidence score
  ✅  Surfaces: model used · prompt · timestamp · confidence %
  ✅  Stores structured evidence in ai_recommendations table

What AI CANNOT do:
  ❌  Silently patch a loan field
  ❌  Approve or reject a record
  ❌  Trigger any database write to loans table

Human actions on AI output:
  ✔️  Accept guidance  →  Logs intent. Zero data change.
  ✏️  Mark edited      →  Logs modified action taken.
  ✖️  Reject           →  Logs rejection reason.

"The interface clearly separates:
 Observed Evidence | Rule Suggestion | AI Narrative | Human Action"
```

### 🎙️ Presenter Script
"This is the part of the system I'm most proud of from an engineering ethics standpoint.

When a reviewer clicks 'Generate AI Explanation', the AI service analyzes the exception and returns an explanation, a recommendation, and a confidence score. All of this is stored in a separate `ai_recommendations` table — it never touches the `loans` table directly.

Here's what that means in practice: if the AI says 'update payment status to late' and the reviewer clicks 'Accept Guidance' — **nothing changes in the loan record**. The acceptance is logged as the reviewer's intent, but the reviewer must then separately open the field editor, make the correction themselves, and save it — which then triggers re-validation and an audit event.

I explicitly rejected an early design where 'Accept' automatically applied the AI's suggested patch. It was convenient — but it violated the challenge's requirement that AI never make silent data changes.

Every AI output includes the model name, the full prompt text, the confidence percentage, and a timestamp. This is not a black box — it's a transparent evidence artifact that reviewers can scrutinize."

---

## 🗂️ SLIDE 8 — AUDIT CHAIN & TRACEABILITY (60 seconds)

### Slide Content
```
CRYPTOGRAPHIC AUDIT CHAIN
───────────────────────────────────
Every event for a loan is hash-linked:

Event 1: FILE_UPLOADED        → hash_1 = SHA256(payload_1 + null)
Event 2: LOAN_IMPORTED        → hash_2 = SHA256(payload_2 + hash_1)
Event 3: VALIDATION_EXECUTED  → hash_3 = SHA256(payload_3 + hash_2)
Event 4: AI_RECOMMENDATION    → hash_4 = SHA256(payload_4 + hash_3)
Event 5: LOAN_EDITED          → hash_5 = SHA256(payload_5 + hash_4)
Event 6: REVIEWER_APPROVED    → hash_6 = SHA256(payload_6 + hash_5)
Event 7: VERIFIED_RECORD      → hash_7 = SHA256(payload_7 + hash_6)

Chain validated on every loan detail view.
"Chain valid ✓" displayed in UI with head proof hash.

On approval: canonical JSON snapshot sealed with
record_hash chained to prior verified record.

This is tamper-evidence — not blockchain.
(We don't overclaim external immutability.)
```

### 🎙️ Presenter Script
"Every significant event for every loan is recorded as a hash-linked audit event. The structure is simple but powerful: each event's SHA-256 hash is computed over the event content **plus the preceding event's hash**. This means you cannot silently insert, delete, or modify a historical event without breaking the chain.

When you open the Audit Timeline tab for any loan, the app verifies the entire chain from the first import event to the most recent action, and displays 'Chain valid' with the head hash.

I want to be transparent about one thing: this is **tamper-evidence, not blockchain**. The chain proves local consistency and detects tampering within this system. I explicitly chose not to use the word 'blockchain' because that implies external notarization, which we don't have here. The documentation says 'evidence chain' — that's the honest term. That decision to correct an AI-generated overstatement is documented in the AI Development Log."

---

## 🗂️ SLIDE 9 — ROLE-BASED WORKFLOWS (45 seconds)

### Slide Content
```
THREE FOCUSED WORKSPACES
───────────────────────────────────
👤 DATA OPERATOR — Maya Chen
  • Upload CSV loan tapes (up to 10 MB)
  • View file fingerprint + import summary
  • Monitor batch history + quality score

👤 REVIEWER — Arjun Mehta
  • Exception queue sorted by severity
  • Generate + review AI evidence per exception
  • Edit allowed fields → revalidation → audit event
  • Approve / Request Correction / Reject each loan

👤 DATA CONSUMER — Sofia Reyes
  • Browse verified, sealed loan records
  • View full evidence timeline per loan
  • Download verified.csv + audit.csv exports
  • Consume /api/verified-loans JSON endpoint

Role switch in the header — instant context change.
```

### 🎙️ Presenter Script
"The application has three completely distinct workspaces, switchable from the header. In production, these would be protected by OIDC authentication and server-side authorization middleware — the role switch is a deliberate demo affordance that makes it easy for judges to explore all three perspectives without needing login flows.

The **Operator** sees a command center dashboard — quality score, exception rankings, batch history.

The **Reviewer** sees their prioritized work queue. They can drill into any loan, read the AI evidence, interact with it, edit fields, and make binding decisions. They cannot bypass validation — every save reruns all 15 rules.

The **Consumer** gets only what's been verified and sealed. They get clean data and a complete audit export — everything they'd need for downstream systems, regulators, or auditors."

---

## 🗂️ SLIDE 10 — LIVE DEMO (3 minutes — most important slide)

### Slide Content
```
LIVE DEMONSTRATION
───────────────────────────────────
Demo Flow:

1️⃣  DASHBOARD        Quality score · Exception ranking · Trust posture
2️⃣  DATA INTAKE      Upload CSV → fingerprint → normalization → exceptions
3️⃣  EXCEPTION QUEUE  Filter HIGH · Open STATUS_DPD_CONFLICT
4️⃣  AI EVIDENCE      Generate explanation · Show confidence + model + prompt
                      Accept guidance → confirm "no data changed"
5️⃣  FIELD EDITOR     Edit payment_status · Save & Revalidate
                      Watch audit event append in real time
6️⃣  APPROVE RECORD   Add reviewer note · Approve → SHA-256 seal
7️⃣  AUDIT TIMELINE   Show chain valid · Count events · Head hash
8️⃣  VERIFIED EXPORT  Download CSV · Open /api/verified-loans in browser

[SWITCH TO LIVE APP]
```

### 🎙️ Presenter Script

**[Transition to live app]**

**Step 1 — Dashboard (20 seconds):**
"This is the Operator's command center. The quality score — currently [X]% — is a live calculation of what fraction of records passed all validation rules. The exception intelligence panel ranks rules by number of affected records. The trust posture panel confirms: source lineage is captured, the audit chain is verified, AI requires human action, and canonical records are hashed. These are live system checks, not static badges."

**Step 2 — Data Intake (30 seconds):**
"I'll switch to Data Intake. You can see the upload history — each batch shows the filename, the SHA-256 fingerprint, how many rows were imported, and how many exceptions were generated. [Upload sample CSV OR point to the seeded batch.] The moment a file lands, it's fingerprinted, normalized, and run through all 15 validation rules before a single exception is logged."

**Step 3 — Exception Queue (20 seconds):**
"Now switching to Reviewer — this is Arjun's view. The exception queue shows all open findings, sorted by severity. I'll filter to HIGH and open a STATUS_DPD_CONFLICT — a loan marked 'current' with days past due greater than zero."

**Step 4 — AI Evidence (40 seconds):**
"Here's the exception detail. I can see the field name, the observed value, and the rule's suggested value. I'll click 'Generate AI Explanation'. Watch what happens — the AI generates an explanation and a recommendation. Notice what's displayed: the model name — 'veritas-rules-v1' in offline mode — the confidence at 94%, the timestamp, and the full prompt text is visible if I expand 'Prompt & control metadata'. Now I'll click 'Accept Guidance'. Notice the toast: 'Suggestion accepted. No data changed.' The AI's guidance is logged as my intent — the loan field is unchanged."

**Step 5 — Field Editor (30 seconds):**
"To actually fix it, I open the Canonical Record tab and click 'Edit Fields'. Only four fields are editable by the reviewer — current balance, payment status, borrower state, and document status. This allow-list prevents arbitrary data mutation. I'll change payment status to 'late', click Save & Revalidate. The validation engine reruns — the STATUS_DPD_CONFLICT exception is now resolved, and a new audit event appears with before/after metadata."

**Step 6 — Approve (20 seconds):**
"I'll add a reviewer note: 'Payment status confirmed by servicer remittance. Approved.' And click Approve & Verify. The record is now sealed — you can see the verified seal and the truncated SHA-256 record hash."

**Step 7 — Audit Timeline (20 seconds):**
"Opening the Audit Timeline tab. You can see every event from the first file upload to this approval — seven events in sequence. The chain is valid. The head hash proves the integrity of the entire sequence. No event has been inserted, deleted, or modified."

**Step 8 — Consumer View & API (20 seconds):**
"Final switch — Data Consumer. Sofia's view shows only verified, sealed records. I can download the verified CSV or the complete audit trail CSV. And if I open `/api/verified-loans` in the browser, you get a clean, structured JSON contract — exactly what a downstream system would consume."

---

## 🗂️ SLIDE 11 — ENGINEERING DISCIPLINE (45 seconds)

### Slide Content
```
ENGINEERING QUALITY
───────────────────────────────────
✅  TypeScript strict mode — client and server
✅  Automated tests: Vitest + Supertest
    → Validation contradictions
    → AI separation from decisions
    → Human-gated verification flow
    → Hash chain integrity
    → CSV export correctness
    → All required API endpoints

✅  AI Development Log documented:
    → 10 representative prompts
    → 4 AI suggestions rejected or corrected
    → Human review process at every milestone

✅  Deployed to Vercel (zero-config)
✅  Docker-ready for container deployment
✅  npm test covers the full review-to-verification flow
```

### 🎙️ Presenter Script
"Let me briefly cover engineering quality. The entire codebase uses TypeScript strict mode — this isn't optional for a financial data system. Type errors are caught at build time, not at runtime.

The automated test suite covers the scenarios that matter most: validation rule contradictions, proof that AI cannot modify loans, the complete human-gated review flow, hash chain integrity, and all required API endpoints. Running `npm test` gives you confidence in the system's invariants.

The AI Development Log — which is in the `docs/` folder and can be browsed in the app — documents every significant AI interaction during development. It includes four cases where I rejected or corrected AI suggestions. The most important: I rejected automatic patch application when 'Accept AI' was clicked, and I corrected AI-generated 'blockchain' wording to the more honest 'evidence chain'. These aren't just good practices — they're proof of human engineering judgment."

---

## 🗂️ SLIDE 12 — PRODUCTION PATH (30 seconds)

### Slide Content
```
FROM DEMO TO PRODUCTION
───────────────────────────────────
Current (Demo)          →  Production Migration
──────────────────────────────────────────────
Neon Serverless DB      →  Dedicated Enterprise Postgres Cluster
Role header switch      →  OIDC + server-side auth middleware
Sync CSV parsing        →  Object storage + streaming + queue worker
Local hash chain        →  Merkle root anchoring in timestamp authority
Deterministic AI        →  OpenAI with structured output + eval suite
Single server process   →  Multi-region, tenant-scoped deployment

"Every limitation is documented. Every migration path is named."
```

### 🎙️ Presenter Script
"Every demo trade-off in Veritas is a documented migration seam, not a hidden assumption. Our serverless Postgres becomes a dedicated enterprise cluster. The role switch gets replaced by OIDC. Synchronous parsing becomes async queue workers for large portfolios. The local hash chain gets anchored to an external timestamp authority.

I'm not pretending this is production-ready in its current form — but I am claiming that the architecture makes the production path clear and honest."

---

## 🗂️ SLIDE 13 — CLOSING (30 seconds)

### Slide Content
```
VERITAS — BUILD THE TRUST ENGINE
───────────────────────────────────

"Veritas does not ask teams to trust the AI.
 It gives them a record they can verify."

What was built:
  ✅  Complete CSV-to-verified-record pipeline
  ✅  15-rule deterministic validation engine
  ✅  AI evidence layer — fully separated from decisions
  ✅  SHA-256 hash-linked audit chain
  ✅  Three role-based workspaces
  ✅  REST API + CSV export for downstream consumers
  ✅  Automated tests covering all critical invariants
  ✅  Deployed and demo-ready

Thank you.
```

### 🎙️ Presenter Script
"To close — Veritas is a system that doesn't ask you to trust it. It gives you everything you need to verify it yourself.

The source lineage proves what arrived. The normalization log proves what was changed. The validation history proves what was found. The AI evidence panel proves what was suggested. The human decision log proves what was decided. The audit chain proves none of it was tampered with. And the SHA-256 sealed export proves what was delivered downstream.

That's what a real trust engine looks like. Thank you."

---

## ❓ SLIDE 14 — Q&A PREP

### Slide Content
```
QUESTIONS & ANSWERS
───────────────────────────────────
```

### Anticipated Questions & Answers

---

**Q: Why PostgreSQL on Neon instead of a local database?**

> "We initially prototyped with SQLite for simplicity, but migrated to PostgreSQL on Neon to prove that the architecture could handle production-grade relational constraints. Neon's serverless nature allowed us to deploy seamlessly to Vercel without worrying about connection limits, eliminating a major deployment failure mode while providing true Postgres."

---

**Q: How does the AI layer work without an OpenAI key?**

> "The `veritas-rules-v1` assistant is a deterministic guidance engine built directly into `server/ai.ts`. Each rule code maps to a curated recommendation and a pre-calculated confidence score. For example, STATUS_DPD_CONFLICT maps to 'Update payment status to late if days past due is confirmed by servicing data' with 94% confidence. The same interface accepts an OpenAI-compatible model when the API key is set — the provider boundary is a single isolated module."

---

**Q: What stops a reviewer from approving a record that still has open exceptions?**

> "The approval flow on the backend reads the current exception status. If critical or high exceptions remain open, the reviewer can still approve — but the intent is captured in the reviewer note, and the audit event records the exception count at the time of approval. In a production system, you'd add a business rule that blocks approval on critical exceptions unless a waiver note is provided. That's a clear extension point."

---

**Q: Isn't this just CRUD with hashing tacked on?**

> "The architectural separation is what makes this different from CRUD. The key invariants are: AI recommendations are physically stored in a separate table and cannot write to the loans table. Audit events are append-only — there's no UPDATE or DELETE path in the audit module. Every edit triggers full revalidation — you can't save a field change that leaves a validation-invalid record without that being captured. The hash chain means any out-of-order insertion or deletion breaks verification. These are hard guarantees, not soft conventions."

---

**Q: Can you explain the SHA-256 chaining in more detail?**

> "Each audit event contains a `previous_hash` field that holds the hash of the immediately preceding event for the same loan. The new event's hash is computed over the entire event payload — including the previous hash — using Node.js's built-in crypto module. To verify the chain, you walk all events in insertion order and re-derive each hash. If any event was modified, inserted, or deleted, the derived hash won't match the stored hash, and the chain is marked broken. The UI shows 'Chain valid ✓' or 'Chain broken' live on the loan detail page."

---

**Q: How did you use AI in development?**

> "About 80% of the first-draft code was AI-generated using GitHub Copilot and Claude. But every change went through TypeScript compilation, automated tests, API checks, browser inspection, and Git diffs. The AI Development Log in `docs/` records this explicitly — including four cases where I rejected or corrected AI suggestions. The most important rejection: I refused the AI's suggestion to auto-apply the patch when 'Accept guidance' was clicked, because it violated the challenge's explicit requirement that AI never make silent data changes. Human judgment defined the safety boundaries."

---

**Q: How would you scale this to millions of loans?**

> "Three changes: First, replace synchronous CSV parsing with object storage intake (S3/GCS), streaming parsing via `csv-parse` streams, and a queue worker (BullMQ or similar) for per-row processing. Second, scale our serverless PostgreSQL to a dedicated cluster with advanced connection pooling and read replicas. Third, for the audit chain at scale, compute periodic Merkle tree roots over batches of events and anchor them in an external timestamp authority. These are named migration seams in the architecture doc."

---

## 📋 PRESENTER QUICK REFERENCE

### Key Numbers to Know
| Metric | Value |
|---|---|
| Validation Rules | 15 |
| Role Workspaces | 3 (Operator, Reviewer, Consumer) |
| API Endpoints | 11 |
| AI-Guarded Invariants | 4 key rejections documented |
| Hash Algorithm | SHA-256 |
| DB Tables | 7 (batches, loans, exceptions, ai_recommendations, reviews, verified_loans, audit_events) |
| Editable Fields (Reviewer) | 4 (current_balance, payment_status, borrower_state, document_status) |
| Test Framework | Vitest + Supertest |
| Tech Stack | React 19 + Vite 7 + Express 5 + PostgreSQL + TypeScript strict |

### Key Phrases to Nail
- *"AI that explains — never decides."*
- *"Every limitation is documented. Every migration path is named."*
- *"Veritas doesn't ask you to trust it. It gives you a record you can verify."*
- *"This is tamper-evidence, not blockchain."*
- *"Accepting AI guidance logs reviewer intent — it does not change loan data."*

### Things NOT to Say
- ❌ Don't say "blockchain" — say "hash-linked audit chain" or "evidence chain"
- ❌ Don't say "AI makes decisions" — always say "AI advises, humans decide"
- ❌ Don't say "production-ready" — say "demo-scoped with documented production path"
- ❌ Don't overclaim the AI capabilities — emphasize that it is sandboxed and gated

---

## 🕐 TIMING GUIDE

| Slide | Topic | Time |
|---|---|---|
| 1 | Title | 20 sec |
| 2 | Problem | 60 sec |
| 3 | Solution Overview | 45 sec |
| 4 | Architecture | 60 sec |
| 5 | Ingestion | 60 sec |
| 6 | Validation Engine | 75 sec |
| 7 | AI Layer | 75 sec |
| 8 | Audit Chain | 60 sec |
| 9 | Role Workflows | 45 sec |
| 10 | **LIVE DEMO** | **3 min** |
| 11 | Engineering Quality | 45 sec |
| 12 | Production Path | 30 sec |
| 13 | Closing | 30 sec |
| **Total** | | **~10 min** |

---

*Good luck tomorrow. You built something real — present it with confidence.*
