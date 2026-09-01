# AI Development Log

## Tools and estimate

GitHub Copilot and Claude 3.5 Sonnet were used for architecture planning, schema design, API/UI implementation, validation/test generation, and documentation. Approximately 80% of the first-draft code was AI-generated. Every change was reviewed through TypeScript compilation, automated tests, API checks, browser inspection, and Git diffs by the human-led development workflow.

## Representative prompts

1. "Analyze the Intain problem statement and break down the required modules into a checklist."
2. "Generate a SQLite schema with raw-to-canonical lineage based on the provided CSV fields."
3. "Scaffold an Express server in TypeScript with upload and validation routes."
4. "Implement validation logic to catch negative principal balances and maturity date anomalies."
5. "Create a React component for the Exception queue that groups by severity."
6. "Write an AI service layer that separates the explanation from the final human decision."
7. "Add a SHA-256 hashing function to link canonical records to their previous versions."
8. "Write Vitest unit tests for the validation engine covering edge cases."
9. "Review this TSX component for unnecessary re-renders and accessibility."
10. "Help me draft a README that clearly explains the demo flow and local setup."

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

