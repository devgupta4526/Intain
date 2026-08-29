# Architecture Note

## System design

Veritas is a TypeScript application with a React/Vite client, Express API, and SQLite persistence. One process serves the API and production frontend, minimizing demo failure modes while retaining clear module boundaries.

```text
CSV / sample tape
      │
      ▼
Ingestion → raw JSON + source hash → normalization → validation rules
                                                    │
                         ┌──────────────────────────┴──────────────────────┐
                         ▼                                                 ▼
                    valid record                                    exception queue
                                                                         │
                                                      AI evidence → human review/edit
                                                                         │
                                                                         ▼
Consumer API/export ← canonical snapshot ← SHA-256 record chain ← approval
                              │
                              └──── hash-linked audit event chain
```

The client contains role-aware routing and shared presentation components. The API is decomposed into ingestion, validation, AI, audit, and persistence modules. All workflows operate against the same schema rather than duplicating role-specific state.

## Data model and lifecycle

- `batches` stores source filename, byte-level SHA-256 fingerprint, actor, counts, and status.
- `loans` stores both normalized columns and the complete source row in `raw_json`.
- `exceptions` stores stable rule codes, severity, observed/suggested values, and workflow status.
- `ai_recommendations` stores explanation, recommendation, optional patch, model, prompt, confidence, status, and human action.
- `reviews` is append-only human decision history.
- `verified_loans` stores a stable canonical JSON snapshot, verifier, time, current hash, and preceding verified-record hash.
- `audit_events` is append-only and links each loan event to the prior event hash.

Lifecycle: batch processing → source lineage → normalization → validation → exception creation → AI evidence on demand → optional field correction/revalidation → reviewer decision → canonical snapshot → verified export.

## Validation engine

Pure validation rules make behavior deterministic and easy to unit test. Controls cover required IDs, parseable dates/numbers, chronological consistency, non-negative amounts, balance/principal limits, rate range, valid status/state, status-days-past-due contradictions, closed-positive-balance, document availability, staleness, duplicate IDs, and suspicious repeated borrower/amount/date combinations. Database-aware duplicate rules run after normalization.

Every edit reruns validation. Open findings are regenerated from current data while prior review and audit history remain append-only.

## AI and human control

The assistant produces review evidence, not underwriting or credit decisions. The no-key mode uses deterministic rule-specific guidance, which is explainable and always available. Each output includes prompt, model, confidence, timestamp, and status. Accept, edit, and reject actions affect the recommendation record only. A separate reviewer edit is required to modify canonical fields, and every edit reruns validation and creates an audit event.

The interface clearly separates observed evidence, rule suggestion, AI narrative, and final human action. This satisfies the safety requirement even if a hosted LLM provider is connected later.

## Traceability and hashing

Each upload is hashed before parsing. Audit events use stable key ordering and SHA-256 over event content plus the preceding hash. Loan detail verifies the chain and displays the head proof. On approval, canonical JSON is deterministically serialized and chained to the prior verified record, allowing downstream consumers to detect reordering or mutation.

This is tamper-evidence, not blockchain. It deliberately avoids implying external notarization.

## API and error handling

Routes return JSON errors with appropriate 4xx/5xx codes. Uploads are memory-bounded to 10 MB and constrained to CSV. Query filters use bound SQLite parameters. Edits are allow-listed and numeric fields are converted server-side. SQLite foreign keys and uniqueness constraints protect lifecycle relationships.

## Trade-offs and production path

- SQLite provides zero-config durability and transactional workflows for judging. PostgreSQL is the production migration target.
- Role switching makes all personas instantly demoable. Production would add OIDC, server-side authorization middleware, and tenant scoping.
- Synchronous parsing is appropriate for the challenge’s 1,000–5,000 rows. Large portfolios would use object storage, streaming parsing, and a queue worker.
- Hashes prove local chain consistency, not third-party existence. A production system could anchor periodic Merkle roots in an external timestamp authority.
- The deterministic assistant prioritizes safety and availability. A hosted LLM should use structured output, retrieval-limited evidence, PII controls, and an evaluation suite.

