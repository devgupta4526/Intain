# 🖥️ Veritas — Complete Live Demo Walkthrough
## Step-by-Step Presentation Guide | Intain FinTech Challenge 2026 Final Round

---

> **How to use this document:** Every scene below has three sections:
> - **Steps** — numbered actions you take, in exact order
> - **Say** — what to say out loud while doing each step
> - **Expect** — what you should see on screen as confirmation

---

## 📦 PART 0 — PRE-DEMO SETUP
*Do this 10 minutes before your slot. Check each box before you start.*

**Step 1.** Open a terminal in the project folder and run:
```
npm run dev
```
Confirm no red errors appear. You should see two lines like:
```
  → API server running on http://localhost:4000
  → VITE ready in 300ms at http://localhost:5173
```

**Step 2.** Open your browser and navigate to:
```
http://localhost:5173
```

**Step 3.** Confirm the role switcher in the **top-right corner** shows **"Data Operator"**.

**Step 4.** Confirm the dashboard loads — you should see a quality score circle, metric cards, and the exception intelligence panel.

**Step 5.** Open a **second browser tab** (keep it aside) — you'll use it for the API demo at the end.

**Step 6.** Copy `data/sample-loan-tape.csv` to your Desktop so you can find it instantly during the upload step.

**Step 7.** *(Optional but recommended)* Navigate to **Data intake** → click **"Reset demo"** → confirm → navigate back to **Command center**. This gives you a clean, reproducible state.

**Step 8.** Set browser zoom to **110%** so judges can read all text clearly.

**Step 9.** Close all other browser tabs. Silence your phone.

---

## 🗃️ YOUR DATA — KNOW EVERY ROW

The file `data/sample-loan-tape.csv` has **12 loan records**. Know these before you start:

| Row | Loan ID | Type | Principal | Balance | Status | Bug Seeded |
|-----|---------|------|-----------|---------|--------|------------|
| 1 | **LN-10001** | mortgage | $420,000 | $397,500 | current | ✅ CLEAN — use for approval demo |
| 2 | **LN-10002** | personal | $28,000 | $31,200 | current | 🔴 BALANCE_EXCEEDS_PRINCIPAL |
| 3 | **LN-10003** | auto | $48,000 | $40,500 | current | ✅ CLEAN |
| 4 | **LN-10004** | mortgage | $650,000 | $0 | closed | ✅ CLEAN (paid off) |
| 5 | **LN-10005** | small_business | $180,000 | $145,000 | late | 🟡 DOCUMENT_MISSING |
| 6 | **LN-10006** | personal | $22,000 | $18,750 | current | 🔴 STATUS_DPD_CONFLICT — use for AI demo |
| 7 | **LN-10007** | mortgage | $510,000 | $488,000 | current | 🟡 STALE_RECORD (>180 days old) |
| 8 | **LN-10008** | auto | $36,000 | $28,100 | current | 🔴 MATURITY_BEFORE_ORIGINATION |
| 9 | **LN-10009** | personal | $15,000 | $3,200 | late | 🔴 RATE_OUT_OF_RANGE (48% rate) |
| 10 | **LN-10010** | small_business | $250,000 | $18,900 | closed | ✅ CLEAN |
| 11 | **LN-10002** *(dup)* | personal | $30,000 | $25,100 | current | 🔴 DUPLICATE_LOAN_ID |
| 12 | *(missing)* | auto | **-$44,000** | $39,000 | current | 🔴 REQUIRED_LOAN_ID + INVALID_PRINCIPAL |

**Two loans to remember cold:**
- **LN-10006 (BR-206)** → STATUS_DPD_CONFLICT — payment_status = "current" but days_past_due = 14
- **LN-10001 (BR-201)** → 100% clean mortgage — perfect for the approval + seal demo

---

## 🎬 DEMO — STEP BY STEP

---

### SCENE 1 — DASHBOARD
**Role: Data Operator | URL: `/` | Time budget: 45 seconds**

**Step 1.** Make sure you are on the **Command center** page (first item in the sidebar). Do not click anything yet.

**Step 2.** Point to the **four metric cards** at the top and say:

> *"This is the Data Operator's command center — everything here is live from the API. The quality score — 58% — means 58% of records passed all 15 validation controls. The other 42% have at least one open exception."*

**Step 3.** Point to the **Exception Intelligence panel** on the left side and say:

> *"This panel ranks problems by frequency. STATUS_DPD_CONFLICT is the top issue — the most common data quality failure in this portfolio."*

**Step 4.** Point to the **Trust Posture panel** on the right and say:

> *"These four checkmarks are live system controls — not static badges. The audit chain is verified right now. AI is configured to require human action before any data changes. Let me prove that last point."*

**Step 5.** Do not click anything else. Transition directly to Scene 2.

---

### SCENE 2 — DATA INTAKE (CSV UPLOAD)
**Role: Data Operator | URL: `/ingestion` | Time budget: 60 seconds**

**Step 1.** In the left sidebar, click **"Data intake"**.

**Step 2.** Point to the **four-step pipeline panel** on the right side of the page and say:

> *"Every loan tape goes through this four-step pipeline the moment it lands: Fingerprint, Normalize, Validate, Route. This is automatic and happens before a single exception is logged."*

**Step 3.** Point to the **Import History** table and say:

> *"You can see the sample tape we already loaded — 12 rows, SHA-256 fingerprint in this column. That hash was computed on the raw file bytes before any parsing. If this file was tampered with in transit, the hash would not match."*

**Step 4.** Click **"Choose CSV file"** (or drag the file into the drop zone).

**Step 5.** In the file picker, navigate to your Desktop and select **`sample-loan-tape.csv`**.

**Step 6.** Watch the spinner appear. Say:

> *"Parsing and normalizing now..."*

**Step 7.** Wait for the success banner to appear (usually under 1 second). Say:

> *"In under a second — 12 rows parsed, normalized from messy source formats, run through 15 validation rules, all exceptions severity-ranked and queued. Let's go see what was found."*

> ⚠️ **If data is already loaded:** Skip steps 4–7. Point to the existing batch in Import History and say: *"Data is already loaded from our earlier import. Let me take you directly to the exceptions."*

---

### SCENE 3 — EXCEPTION QUEUE
**Role: Reviewer | URL: `/exceptions` | Time budget: 45 seconds**

**Step 1.** Click **"Exception queue"** in the left sidebar.

**Step 2.** Look at the queue header — it shows total open exceptions and a critical count. Point to it and say:

> *"This is the Reviewer's work queue. Every finding is ranked by severity — critical at the top, low at the bottom. Each row shows the rule code, the loan ID, which field has the problem, and what the current value is."*

**Step 3.** Point to the **"AI ready"** badge on the right side of any row and say:

> *"That 'AI ready' badge means an explanation is available on demand — not pre-generated in the background. It fires only when the reviewer asks for it."*

**Step 4.** Click the **role switcher in the top-right corner** and select **"Reviewer"**. You are now Arjun Mehta.

**Step 5.** Click the **"HIGH"** severity filter chip. The queue now shows only high-severity exceptions.

**Step 6.** Find the **STATUS DPD CONFLICT** row for **LN-10006** and click it. The app navigates to the loan detail page.

---

### SCENE 4 — LOAN DETAIL: CANONICAL RECORD TAB
**Role: Reviewer | URL: `/loans/[id]` → Canonical record tab | Time budget: 30 seconds**

**Step 1.** You land on the **Canonical record** tab by default. Do not click anything yet.

**Step 2.** Point to the **top-right of the page header** — you will see "3 open exceptions" and "🔗 Chain valid". Say:

> *"Two things to notice — three open exceptions, and 'Chain valid'. The chain validity is computed live every time this page loads. It's not cached."*

**Step 3.** Point to the **source provenance line** near the top of the record panel — it says "Mapped from sample-loan-tape.csv · row 7". Say:

> *"Every normalized field is traceable back to the exact source row. Row 7 of the uploaded file."*

**Step 4.** Point to the **payment_status field** (value: "current") and then point to **days_past_due** (value: 14). Say:

> *"Here's the contradiction: payment_status is 'current' — but days_past_due is 14. A current loan cannot have 14 days past due. This is exactly the STATUS_DPD_CONFLICT our validation engine flagged."*

**Step 5.** Point to the **Human Decision panel** on the right side. It says: *"AI suggestions never modify this record automatically."* Say:

> *"That's not a disclaimer — it's a hard architectural constraint. Let me prove it."*

**Step 6.** Click the **"Exceptions & AI (3)"** tab to move to Scene 5.

---

### SCENE 5 — EXCEPTIONS & AI TAB ⭐ *(Most Important Scene)*
**Role: Reviewer | URL: `/loans/[id]` → Exceptions & AI tab | Time budget: 90 seconds**

**Step 1.** You are on the Exceptions & AI tab. You should see the STATUS_DPD_CONFLICT exception card at the top. Point to the three-column structure and say:

> *"Each exception shows: Observed — what's in the data right now. Rule suggestion — what the validation engine says it should be. And the AI button below, which the reviewer invokes on demand."*

**Step 2.** Click **"✨ Generate AI explanation"** on the STATUS_DPD_CONFLICT card.

**Step 3.** Wait approximately 1 second for the AI panel to appear below the button.

**Step 4.** Point to the **model name** — it says "veritas-rules-v1" — and say:

> *"Model name: veritas-rules-v1 — our offline deterministic engine. No OpenAI key needed."*

**Step 5.** Point to the **confidence percentage** — it says 94%. Say:

> *"Confidence: 94%. And look at the explanation — it says 'This is a data-quality finding, not an underwriting judgment.' That scoping is deliberate. The AI cannot make credit decisions."*

**Step 6.** Point to the **recommendation text** — it says "Update payment status to late if days past due is confirmed by servicing data." Say:

> *"Notice 'if confirmed' — it defers to the human reviewer to verify against the actual servicer records before making any change."*

**Step 7.** Click **"▶ Prompt & control metadata"** to expand the prompt section.

**Step 8.** Point to the visible prompt text and say:

> *"The exact prompt sent to the model is right here, fully visible. No black box. Any auditor can read exactly what the AI was asked."*

**Step 9.** Collapse the prompt section.

**Step 10.** Point to the **three action buttons** — Accept, Mark Edited, Reject. Point to the disclaimer text below them: *"These actions log your judgment; they do not silently change loan data."* Say:

> *"Three actions — Accept, Edit, Reject. All of them log the reviewer's judgment. None of them change the loan record. Watch."*

**Step 11.** Click **"✓ Accept guidance"**.

**Step 12.** A toast notification appears at the top. Read it aloud:

> *"'Suggestion accepted. No data changed.' — my click was logged as intent. The payment_status field is still 'current' in the database. The AI's suggestion did not touch it. To actually fix this, I need to go edit it myself."*

---

### SCENE 6 — FIELD EDIT + REVALIDATION
**Role: Reviewer | URL: `/loans/[id]` → Canonical record tab | Time budget: 60 seconds**

**Step 1.** Click the **"Canonical record"** tab to go back to the record view.

**Step 2.** Click the **"✏️ Edit fields"** button in the top-right of the record panel.

**Step 3.** The form enters edit mode. Point to the four input fields that are now editable and say:

> *"Only four fields are editable — current_balance, payment_status, borrower_state, and document_status. This allow-list is enforced on the server, not just the client. I cannot change the loan ID, the original principal, or any origination data."*

**Step 4.** Click on the **payment_status** input field.

**Step 5.** Clear the current value ("current") and type: **`late`**

**Step 6.** Click **"Save & revalidate"**.

**Step 7.** A success toast appears. Read it aloud:

> *"'Fields updated, revalidated, and added to the audit chain.' — three things happened in one save: the field was updated, all 15 validation rules ran again against the updated record, and an audit event was appended with the before and after values."*

**Step 8.** Click the **"Exceptions & AI"** tab to verify the fix. Point to the STATUS_DPD_CONFLICT row — its status is now **"corrected"**. Say:

> *"The STATUS_DPD_CONFLICT exception is now marked corrected — because payment_status 'late' is consistent with 14 days past due. The system resolved it automatically on revalidation."*

---

### SCENE 7 — APPROVE A CLEAN RECORD
**Role: Reviewer | URL: `/loans/[id]` for LN-10001 | Time budget: 45 seconds**

**Step 1.** Click **"← Back to queue"** at the top of the page.

**Step 2.** Click **"Loan registry"** in the left sidebar.

**Step 3.** In the search box, type **`LN-10001`** and press Enter.

**Step 4.** Click the arrow/row for **LN-10001** to open its loan detail page.

**Step 5.** Confirm the page shows **"0 open exceptions"** — this is the clean mortgage. Say:

> *"LN-10001 — a $420,000 mortgage from California — passed all 15 validation rules at ingestion. Zero exceptions. This is the record we'll approve and seal."*

**Step 6.** Click the **"Canonical record"** tab if not already on it.

**Step 7.** In the **Human Decision panel** on the right, click inside the **reviewer note textarea**.

**Step 8.** Type exactly:
```
All fields verified. Principal, balance, and dates are consistent. Approved for downstream consumption.
```

**Step 9.** Click **"✓ Approve & verify"**.

**Step 10.** The Human Decision panel now shows:
- ✅ Approved and verified
- A timestamp
- A truncated SHA-256 record hash (e.g., `a3f8...9c2d`)

Point to the hash and say:

> *"The record is now sealed. This SHA-256 hash is computed by serializing the canonical loan fields deterministically, then running SHA-256. Every verified record links to the one before it — it's a chain."*

**Step 11.** Point to the **shield badge** at the top of the page — it now says **"🛡️ Verified & sealed"** instead of "open exceptions". Say:

> *"Verified and sealed. This record is now in the verified dataset."*

---

### SCENE 8 — AUDIT TIMELINE ⭐ *(Chain Proof)*
**Role: Reviewer | URL: same loan detail page | Time budget: 45 seconds**

**Step 1.** On the same LN-10001 loan detail page, click the **"Audit timeline"** tab. The tab label shows the number of events, e.g., "Audit timeline (7)".

**Step 2.** Point to the **banner at the very top** of the timeline. It says:
> "🔗 Cryptographic event chain verified — 7 events · head a3f8...9c2d — ✓ Valid"

Say:

> *"At the top: chain verified, 7 events, head hash. The system just walked every event for this loan from the first upload to this approval, re-derived each SHA-256 hash, and confirmed the chain is unbroken."*

**Step 3.** Point to the **bottom event** in the timeline — FILE_UPLOADED — and say:

> *"Read bottom to top — that's the full lifecycle. File uploaded by Maya Chen. Loan imported — row normalized. Validation executed — passed clean."*

**Step 4.** Point to the **top events** — LOAN_APPROVED and VERIFIED_RECORD_CREATED — and say:

> *"Then up top: Arjun Mehta approved it, and the verified record was created with the SHA-256 seal."*

**Step 5.** Point to any **individual event hash** in the list and say:

> *"Each event has its own hash. If anyone tried to delete or modify even one earlier event, the head hash would no longer verify and the UI would show 'Chain broken'. This is not blockchain — it's a hash-linked evidence chain. Local tamper detection. I'm honest about what it is."*

---

### SCENE 9 — VERIFIED RECORDS (Consumer View)
**Role: Data Consumer | URL: `/verified` | Time budget: 45 seconds**

**Step 1.** Click the **role switcher in the top-right corner** and select **"Data Consumer"**. You are now Sofia Reyes.

**Step 2.** Notice the sidebar has changed — no "Data intake", no "Exception queue". Say:

> *"The Consumer's view is completely different — she only sees verified, sealed records. No access to the exception queue or upload flows."*

**Step 3.** Click **"Verified records"** in the sidebar.

**Step 4.** Point to the **table row for LN-10001** — it shows the loan ID, borrower, principal, verifier name (Arjun Mehta), and the truncated record hash. Say:

> *"Each record in this table is sealed. Verifier name, timestamp, and record hash all visible."*

**Step 5.** Point to the **two export buttons** at the top right — "↓ Audit trail" and "↓ Export verified CSV". Say:

> *"Two exports available: the verified CSV — clean data ready for downstream systems — and the audit trail CSV — the complete event history for every loan, with all hashes, for regulators or auditors."*

**Step 6.** Click **"↓ Export verified CSV"**. The browser downloads the file. Say:

> *"The downloaded CSV contains canonical loan fields plus the record_hash and verified_by columns. Any downstream system can independently verify the hash."*

---

### SCENE 10 — API DEMO (Engineering Proof)
**Time budget: 30 seconds**

**Step 1.** Switch to the **second browser tab** you opened during setup.

**Step 2.** In the address bar, type and press Enter:
```
http://localhost:5173/api/verified-loans
```

**Step 3.** The browser displays raw JSON. Point to the response and say:

> *"This is the REST API — GET /api/verified-loans. A downstream data warehouse, regulatory reporting tool, or securitization platform can consume this directly. The response includes the canonical loan fields, the record hash, and the verifier's name. Clean, structured, machine-readable contract."*

**Step 4.** Point to the `record_hash` field in the JSON and say:

> *"The hash right here is the same one shown in the UI — 64 hex characters, SHA-256. Any consumer can verify it matches the canonical data."*

**Step 5.** Say:

> *"The system has 11 REST endpoints in total — GET, POST, and PATCH routes for every workflow stage, all returning JSON with consistent error handling."*

---

### SCENE 11 — AI DEVELOPMENT LOG (Engineering Discipline)
**Time budget: 30 seconds**

**Step 1.** Switch back to the main browser tab (your app).

**Step 2.** You do not need to navigate anywhere — just speak. Say:

> *"One last thing — the AI Development Log in docs/AI_DEVELOPMENT_LOG.md. About 80% of the first-draft code was AI-generated using Copilot and Claude. Every line went through TypeScript compilation, automated tests, API checks, and browser inspection."*

**Step 3.** Continue:

> *"The log documents four cases where I rejected or corrected AI suggestions. The most important: the AI suggested auto-applying the patch when 'Accept guidance' is clicked. I rejected it — it violated the brief's core requirement that AI never makes silent data changes. The AI also used the word 'blockchain' to describe the hash chain. I corrected it to 'evidence chain' — because blockchain implies external notarization, which this system does not provide."*

**Step 4.** Final closing line:

> *"Human judgment defined the safety boundaries. AI accelerated the build. Veritas doesn't ask you to trust it — it gives you a record you can verify. Thank you."*

---

## ⏱️ STEP TIMING SUMMARY

| Scene | Action | Steps | Time |
|-------|--------|-------|------|
| **0** | Pre-demo setup | 9 steps | Before slot |
| **1** | Dashboard — narrate metrics | 5 steps | 45 sec |
| **2** | Data intake — upload CSV | 7 steps | 60 sec |
| **3** | Exception queue — filter + select | 6 steps | 45 sec |
| **4** | Loan detail: canonical record | 6 steps | 30 sec |
| **5** | ⭐ Exceptions & AI — generate + accept | 12 steps | 90 sec |
| **6** | Field edit + revalidation | 8 steps | 60 sec |
| **7** | Approve clean record (LN-10001) | 11 steps | 45 sec |
| **8** | ⭐ Audit timeline — chain proof | 5 steps | 45 sec |
| **9** | Consumer — verified records + export | 6 steps | 45 sec |
| **10** | API browser demo | 5 steps | 30 sec |
| **11** | AI Dev Log mention + closing | 4 steps | 30 sec |
| **Total** | | **85 steps** | **~9 min** |

---

## 🆘 RECOVERY SCRIPTS
*If something goes wrong mid-demo — stay calm, use these.*

### App won't load / blank page
```
Step 1. Check the terminal — is npm run dev still running?
Step 2. Press Ctrl+C to stop it
Step 3. Run: npm run dev
Step 4. Wait 5 seconds for both processes to start
Step 5. Refresh browser at http://localhost:5173
```

### Database is empty / no loans showing
```
Step 1. Click "Data intake" in the sidebar
Step 2. Click "Reset demo" button (top-right of the page)
Step 3. Click "Confirm" in the dialog
Step 4. Wait 2 seconds — 12 rows are re-seeded automatically
Step 5. Navigate back to Command center
```

### AI panel doesn't appear after clicking Generate
```
Step 1. Check the terminal window for a red error
Step 2. Wait 3 seconds
Step 3. Refresh the loan detail page (F5)
Step 4. Click the "Exceptions & AI" tab again
Step 5. If still missing — go to Exception queue, find the exception row, and note its ID
```

### Can't find LN-10006 in the queue
```
Step 1. Click "Exception queue" in the sidebar
Step 2. Click in the search box
Step 3. Type: BR-206
Step 4. The STATUS_DPD_CONFLICT for LN-10006 appears
Step 5. Click the row to open the loan detail
```

### Accidentally approved the wrong loan
```
Step 1. This is NOT a problem — it shows the system working correctly
Step 2. Go to "Verified records" to show it sealed (turns into a bonus demo moment)
Step 3. If you need a clean state: Data intake → Reset demo
```

### Role switcher shows wrong role
```
Step 1. Click the role name in the top-right corner
Step 2. Select the correct role from the dropdown
Step 3. The sidebar and page content update instantly
```

---

## 📋 KEY FACTS TO HAVE MEMORISED

| Item | Value |
|------|-------|
| Best AI demo loan | **LN-10006** (BR-206, STATUS_DPD_CONFLICT) |
| Best approval demo loan | **LN-10001** (BR-201, clean mortgage, $420K, CA) |
| Most dramatic critical | Row 12 (BR-212, no loan ID + negative principal) |
| Sample CSV location | `data/sample-loan-tape.csv` |
| Total rows in sample | 12 |
| Rows with exceptions | ~8 of 12 |
| Editable fields (Reviewer) | 4: balance, payment_status, borrower_state, document_status |
| AI model name in UI | `veritas-rules-v1` |
| STATUS_DPD_CONFLICT confidence | 94% |
| Hash algorithm | SHA-256 |
| Audit chain phrase | "Chain valid ✓ — computed live on page load" |
| API endpoint (browser demo) | `http://localhost:5173/api/verified-loans` |
| Reset button location | Data intake page → top-right corner |
| Total REST endpoints | 11 |
| Total validation rules | 15 |

---

## 🗣️ POWER PHRASES — SAY THESE EXACTLY

Practice these until they come out naturally:

1. **"SHA-256 fingerprint computed before parsing — so we prove what arrived."**
2. **"The AI can advise. It cannot change a loan field."**
3. **"Accept guidance logs reviewer intent. Zero data changed."**
4. **"Every edit triggers revalidation and appends an audit event."**
5. **"Chain valid — verified live on page load, not on a timer."**
6. **"This is tamper-evidence, not blockchain. We don't overclaim."**
7. **"Four editable fields, allow-listed on the server — not the client."**
8. **"Veritas doesn't ask you to trust it. It gives you a record you can verify."**

---

*You built something real. 85 steps. 9 minutes. Demo it with confidence. 🏆*
