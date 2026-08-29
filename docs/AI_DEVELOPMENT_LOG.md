# AI Development Log

## Tools and estimate

Codex (GPT-5 family) was used for architecture, schema design, API/UI implementation, validation/test generation, documentation, and browser-focused review. Approximately 80% of the first-draft code was AI-generated. Every change was reviewed through TypeScript compilation, automated tests, API checks, browser inspection, and Git diffs by the human-led development workflow.

## Representative prompts

1. “Extract every required module, deliverable, judging criterion, and five-minute demo step from the Intain problem statement.”
2. “Design a locally reliable React, Express, and SQLite architecture with raw-to-canonical lineage and no paid-service dependency.”
3. “Model uploads, loans, exceptions, AI suggestions, reviews, verified records, and append-only audit events.”
4. “Implement pure validation rules for all intentional issue types and database-aware duplicate detection.”
5. “Build an AI review boundary where output is visible, attributable, and incapable of silently changing data.”
6. “Create three polished role workspaces optimized for a five-minute judge walkthrough.”
7. “Add record hashing and a verifiable per-loan event chain without claiming blockchain guarantees.”
8. “Generate adversarial unit tests for cross-field contradictions and end-to-end tests for the human approval gate.”
9. “Review multiple TSX components for waterfalls, rerenders, accessibility, bundle cost, and incomplete controls.”
10. “Write an honest architecture note, demo script, setup guide, trade-offs, and production migration path.”

## Human review process

1. Requirements were converted into a checklist before implementation.
2. The schema was reviewed for raw-data preservation, append-only evidence, and separation of AI from decisions.
3. TypeScript strict mode validated server and client boundaries.
4. Unit tests challenged rule behavior; API tests exercised the complete review-to-verification flow.
5. UI controls were checked for functional behavior, role visibility, keyboard labels, loading states, and empty states.
6. Git milestones preserved architectural, backend, frontend, quality, and documentation decisions independently.

## AI output rejected or corrected

1. **Rejected: automatic patch application when “Accept AI” is clicked.** This was convenient but violated the brief’s prohibition on silent AI data changes. The final design logs acceptance separately; reviewers use an explicit field editor that triggers validation and audit.
2. **Rejected: blockchain wording for a local hash chain.** A hash-linked SQLite audit log is tamper-evident but not externally immutable. Product copy was corrected to “evidence chain” and the limitation is explicit.
3. **Corrected: decorative Edit Fields button.** UI review caught a non-functional first draft. It became an allow-listed edit form with server conversion, revalidation, before/after audit metadata, and success feedback.
4. **Corrected: client build without full TypeScript checking.** Vite transpilation alone could miss type errors. The build now runs strict client and server checks before asset generation.

## Lessons learned

AI accelerated exhaustive requirement mapping, repetitive API/UI construction, synthetic anomaly design, and test case generation. Human engineering judgment mattered most around safety boundaries, cryptographic claims, workflow semantics, demo reliability, and deciding what *not* to automate. The strongest result came from treating AI as a fast draft-and-review partner while keeping observable tests and named human decisions authoritative.

