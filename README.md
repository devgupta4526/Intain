# Veritas Loan Copilot

Veritas turns inconsistent loan tapes into human-reviewed, traceable, cryptographically sealed records. It is a complete submission for the Intain Campus FinTech Challenge 2026 Full Stack Track.

## Why this demo stands out

- Complete journey: CSV upload → raw preservation → normalization → configurable checks → exception triage → AI evidence → human decision → verified export.
- Safe AI: suggestions are visually and logically separate from decisions. Accepting guidance records reviewer intent but never silently mutates a loan.
- Evidence by design: source files, normalized rows, edits, AI prompts, reviews, and exports produce hash-linked audit events.
- Judge-friendly: a polished synthetic portfolio is ready on first launch; no API key, registration, or external dataset is required.
- Three focused workspaces: Data Operator, Reviewer, and Data Consumer views can be switched instantly from the header.

## One-minute setup

Prerequisites: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The SQLite database and 12-row synthetic loan tape are created automatically. Use **Data intake → Reset demo** at any time to restore the judging state.

Production mode:

```bash
npm run build
npm start
```

Open [http://localhost:4000](http://localhost:4000).

## Demo identities

No passwords are needed in the local hackathon build. The header role switcher simulates these supplied test accounts:

| Role | Name | Email |
| --- | --- | --- |
| Data Operator | Maya Chen | operator@veritas.demo |
| Reviewer | Arjun Mehta | reviewer@veritas.demo |
| Data Consumer | Sofia Reyes | consumer@veritas.demo |

## Five-minute demo

1. As **Data Operator**, open Data intake and upload `data/sample-loan-tape.csv` (or use the already seeded batch).
2. Show the import fingerprint, normalized row count, and automatically ranked exceptions.
3. Switch to **Reviewer**, open Exception queue, choose a critical/high finding, and generate its AI explanation.
4. Show model, prompt, confidence, timestamp, and the accept/edit/reject controls. Emphasize that no loan field changed.
5. Open Canonical record, edit an allowed field, save, and show that validation and the audit chain rerun.
6. Approve a clean loan. The app creates a canonical snapshot and SHA-256 record hash.
7. Switch to **Data Consumer**, open Verified records, inspect the evidence timeline, and download both CSV exports.
8. Open `/api/verified-loans` in a browser and finish with `docs/AI_DEVELOPMENT_LOG.md`.

A timestamped presenter script is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API and Vite UI with live reload |
| `npm run build` | Type-check server/client and create production assets |
| `npm start` | Serve production API and UI on port 4000 |
| `npm test` | Run unit and end-to-end API tests |
| `npm run seed` | Initialize schema and the sample dataset |

## Configuration

Copy `.env.example` to `.env` if overrides are needed. `PORT` and `DATABASE_PATH` are optional. Without `OPENAI_API_KEY`, Veritas uses its deterministic, explainable `veritas-rules-v1` assistant so judging never depends on network access. The provider boundary is intentionally isolated in `server/ai.ts`.

## API surface

- `GET /api/loans`, `GET /api/loans/:id`
- `GET /api/exceptions`
- `POST /api/exceptions/:id/ai`, `POST /api/ai/:id/action`
- `PATCH /api/loans/:id`, `POST /api/loans/:id/review`
- `GET /api/verified-loans`, `GET /api/verified-loans/:id`
- `GET /api/audit/:loanId`, `GET /api/summary`
- `POST /api/upload`
- `GET /api/export/verified.csv`, `GET /api/export/audit.csv`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design details and trade-offs.

## Verification and limitations

`npm test` covers validation contradictions, AI separation, human-gated verification, hashes, audit-chain integrity, exports, and required APIs. The project intentionally uses role simulation rather than production authentication, a deterministic AI fallback rather than unreviewed free-form generation, and local SQLite rather than a multi-region datastore. These match the challenge’s demo scope and are documented migration seams, not hidden assumptions.

