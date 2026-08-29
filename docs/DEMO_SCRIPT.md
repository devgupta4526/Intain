# Five-Minute Demo Script

## 0:00–0:35 — The trust gap

“Loan data arrives from spreadsheets and servicing systems with conflicting formats and values. Veritas turns that mess into a trusted data product without letting AI make silent decisions.” Show the command center, quality score, exception ranking, and evidence-chain posture.

## 0:35–1:15 — Controlled intake

Switch to Data Operator → Data intake. Point out the SHA-256 file fingerprint, raw-row preservation, normalization, 15 validation controls, and import history. Upload the included sample tape if time permits.

## 1:15–2:25 — Explain an exception

Switch to Reviewer → Exception queue. Filter to High and open a status-days-past-due conflict. In Exceptions & AI, click Generate AI explanation. Show the observed value, deterministic rule suggestion, AI explanation, recommendation, confidence, model, prompt, and timestamp.

Say: “This panel can advise, but it cannot change loan data.” Accept or reject the guidance and point out the confirmation that no data changed.

## 2:25–3:20 — Human correction and decision

Open Canonical record → Edit fields. Correct an allowed value, save, and explain that validation reruns and a before/after audit event is appended. Add a reviewer note and approve a clean record. Show the verified seal and truncated record hash.

## 3:20–4:10 — Prove the history

Open Audit timeline. Highlight source import, validation, AI generation/action, edit, reviewer approval, and verified-record creation. Show “Chain valid” and explain that each event incorporates the prior event hash.

## 4:10–4:40 — Trusted consumption

Switch to Data Consumer → Verified records. Download verified loans and audit trail CSVs. Open `/api/verified-loans` to demonstrate a clean downstream contract.

## 4:40–5:00 — Engineering evidence

Open `docs/AI_DEVELOPMENT_LOG.md`. Mention representative prompts, strict compilation, automated tests, and the two rejected AI ideas: silent patch application and overstated blockchain claims.

Close: “Veritas does not ask teams to trust the AI. It gives them a record they can verify.”

